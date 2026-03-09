#!/usr/bin/env node
/**
 * AI Video Generator - Main Orchestrator
 *
 * End-to-end pipeline that generates a branded video clip:
 *   1. Generates voiceover audio from script text via ElevenLabs
 *   2. Renders branded intro/outro frames using HTML templates + CDP
 *   3. Captures content scene frames via browser navigation
 *   4. Stitches everything together with ffmpeg
 *
 * Usage:
 *   node generate.js --script "Your narration text" \
 *     --scenes "url1,url2" --output video.mp4
 *
 *   node generate.js --script-file script.txt \
 *     --scenes "url1,url2" --title "My Video" --output video.mp4
 *
 *   node generate.js --config video-config.json \
 *     --script "Narration" --scenes "url1,url2" --output video.mp4
 *
 * Environment:
 *   ELEVENLABS_API_KEY   - Required
 *   ELEVENLABS_VOICE_ID  - Optional (default: Rachel)
 *   CDP_SECRET           - Required for browser frame capture
 *   WORKER_URL           - Required for CDP connection
 *   VIDEO_BRAND_NAME     - Optional brand name
 *   VIDEO_BRAND_COLOR    - Optional brand color (hex)
 *   VIDEO_BRAND_LOGO_URL - Optional logo URL
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const WebSocket = require('ws');
const { generateSpeech } = require('./voiceover');

const SKILL_DIR = path.resolve(__dirname, '..');

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

function loadConfig(configPath) {
  const defaults = {
    brand: {
      name: process.env.VIDEO_BRAND_NAME || 'AI Video',
      color: process.env.VIDEO_BRAND_COLOR || '#6366f1',
      logoUrl: process.env.VIDEO_BRAND_LOGO_URL || '',
      tagline: '',
    },
    voice: {
      voiceId: process.env.ELEVENLABS_VOICE_ID || '21m00Tcm4TlvDq8ikWAM',
      model: 'eleven_multilingual_v2',
      stability: 0.5,
      similarityBoost: 0.75,
    },
    video: {
      width: 1280,
      height: 720,
      fps: 30,
      introDuration: 3,
      outroDuration: 3,
      sceneDuration: 5,
      fadeDuration: 0.5,
    },
  };

  if (configPath && fs.existsSync(configPath)) {
    const custom = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    return {
      brand: { ...defaults.brand, ...custom.brand },
      voice: { ...defaults.voice, ...custom.voice },
      video: { ...defaults.video, ...custom.video },
    };
  }
  return defaults;
}

// ---------------------------------------------------------------------------
// CLI Parsing
// ---------------------------------------------------------------------------

function parseArgs() {
  const args = process.argv.slice(2);
  const opts = {
    script: null,
    scriptFile: null,
    scenes: [],
    title: '',
    output: 'output.mp4',
    config: null,
  };

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--script': opts.script = args[++i]; break;
      case '--script-file': opts.scriptFile = args[++i]; break;
      case '--scenes': opts.scenes = args[++i].split(',').map((s) => s.trim()); break;
      case '--title': opts.title = args[++i]; break;
      case '--output': opts.output = args[++i]; break;
      case '--config': opts.config = args[++i]; break;
    }
  }

  if (!opts.script && opts.scriptFile) {
    opts.script = fs.readFileSync(opts.scriptFile, 'utf-8').trim();
  }

  if (!opts.script) {
    console.error('Error: --script or --script-file is required');
    process.exit(1);
  }
  if (opts.scenes.length === 0) {
    console.error('Error: --scenes is required (comma-separated URLs or descriptions)');
    process.exit(1);
  }

  return opts;
}

// ---------------------------------------------------------------------------
// HTML Template Rendering
// ---------------------------------------------------------------------------

function renderTemplate(templateName, vars) {
  const customPath = path.join(SKILL_DIR, 'templates', `${templateName}.html`);
  const templatePath = fs.existsSync(customPath)
    ? customPath
    : path.join(SKILL_DIR, 'templates', `${templateName}.html`);

  let html = fs.readFileSync(templatePath, 'utf-8');
  for (const [key, value] of Object.entries(vars)) {
    html = html.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), value || '');
  }
  return html;
}

// ---------------------------------------------------------------------------
// CDP Frame Capture
// ---------------------------------------------------------------------------

function createCDPConnection() {
  const CDP_SECRET = process.env.CDP_SECRET;
  const WORKER_URL = process.env.WORKER_URL.replace(/^https?:\/\//, '');

  if (!CDP_SECRET) {
    console.error('Error: CDP_SECRET environment variable not set');
    process.exit(1);
  }

  const WS_URL = `wss://${WORKER_URL}/cdp?secret=${encodeURIComponent(CDP_SECRET)}`;
  const ws = new WebSocket(WS_URL);
  let messageId = 1;
  const pending = new Map();

  let targetResolve;
  const targetReady = new Promise((r) => { targetResolve = r; });

  ws.on('message', (data) => {
    const msg = JSON.parse(data.toString());
    if (msg.method === 'Target.targetCreated' && msg.params?.targetInfo?.type === 'page') {
      targetResolve();
    }
    if (msg.id && pending.has(msg.id)) {
      const { resolve, reject, timeout } = pending.get(msg.id);
      clearTimeout(timeout);
      pending.delete(msg.id);
      msg.error ? reject(new Error(msg.error.message)) : resolve(msg.result);
    }
  });

  ws.on('error', (err) => {
    console.error('WebSocket error:', err.message);
    process.exit(1);
  });

  function send(method, params = {}) {
    return new Promise((resolve, reject) => {
      const id = messageId++;
      const timeout = setTimeout(() => {
        pending.delete(id);
        reject(new Error(`CDP timeout: ${method}`));
      }, 60000);
      pending.set(id, { resolve, reject, timeout });
      ws.send(JSON.stringify({ id, method, params }));
    });
  }

  return { ws, send, targetReady };
}

/**
 * Capture frames from a rendered HTML page via CDP.
 * Writes PNG frames to framesDir starting at startFrame index.
 * Returns the next frame index.
 */
async function captureHTMLFrames(send, html, framesDir, startFrame, frameCount, width, height) {
  // Navigate to a data URI with the HTML content
  const dataUri = `data:text/html;charset=utf-8,${encodeURIComponent(html)}`;
  await send('Page.navigate', { url: dataUri });
  await new Promise((r) => setTimeout(r, 2000)); // Let CSS animations settle

  let frameNum = startFrame;
  for (let i = 0; i < frameCount; i++) {
    const { data } = await send('Page.captureScreenshot', { format: 'png' });
    const filename = `frame_${String(frameNum).padStart(5, '0')}.png`;
    fs.writeFileSync(path.join(framesDir, filename), Buffer.from(data, 'base64'));
    frameNum++;
    await new Promise((r) => setTimeout(r, 100));
  }
  return frameNum;
}

/**
 * Capture frames from a URL scene via CDP.
 */
async function captureSceneFrames(send, url, framesDir, startFrame, frameCount) {
  await send('Page.navigate', { url });
  await new Promise((r) => setTimeout(r, 4000)); // Wait for page load

  let frameNum = startFrame;
  for (let i = 0; i < frameCount; i++) {
    const { data } = await send('Page.captureScreenshot', { format: 'png' });
    const filename = `frame_${String(frameNum).padStart(5, '0')}.png`;
    fs.writeFileSync(path.join(framesDir, filename), Buffer.from(data, 'base64'));
    frameNum++;

    // Gentle scroll for visual interest
    if (i > 0 && i % 5 === 0) {
      await send('Runtime.evaluate', { expression: 'window.scrollBy(0, 150)' });
    }
    await new Promise((r) => setTimeout(r, 100));
  }
  return frameNum;
}

// ---------------------------------------------------------------------------
// Main Pipeline
// ---------------------------------------------------------------------------

async function main() {
  const opts = parseArgs();
  const config = loadConfig(opts.config);
  const tmpDir = `/tmp/ai-video-${Date.now()}`;
  const framesDir = path.join(tmpDir, 'frames');
  fs.mkdirSync(framesDir, { recursive: true });

  console.log('=== AI Video Generator ===\n');
  console.log(`Title: ${opts.title || '(untitled)'}`);
  console.log(`Scenes: ${opts.scenes.length}`);
  console.log(`Script: ${opts.script.length} chars`);
  console.log(`Output: ${opts.output}`);
  console.log(`Resolution: ${config.video.width}x${config.video.height} @ ${config.video.fps}fps\n`);

  // ── Step 1: Generate voiceover ──────────────────────────────────────────
  console.log('Step 1/4: Generating voiceover...');
  const audioPath = path.join(tmpDir, 'voiceover.mp3');
  const audioBuffer = await generateSpeech(
    opts.script,
    config.voice.voiceId,
    config.voice.model,
    config.voice.stability,
    config.voice.similarityBoost
  );
  fs.writeFileSync(audioPath, audioBuffer);
  console.log(`  Audio: ${(audioBuffer.length / 1024).toFixed(1)} KB\n`);

  // ── Step 2: Capture frames via CDP ──────────────────────────────────────
  console.log('Step 2/4: Capturing frames...');

  const { ws, send, targetReady } = createCDPConnection();
  await new Promise((r) => ws.on('open', r));
  await Promise.race([
    targetReady,
    new Promise((_, reject) => setTimeout(() => reject(new Error('No CDP target')), 15000)),
  ]);

  // Set viewport
  await send('Emulation.setDeviceMetricsOverride', {
    width: config.video.width,
    height: config.video.height,
    deviceScaleFactor: 1,
    mobile: false,
  });

  const introFrameCount = config.video.introDuration * config.video.fps;
  const outroFrameCount = config.video.outroDuration * config.video.fps;
  const sceneFrameCount = config.video.sceneDuration * config.video.fps;
  let frameNum = 0;

  // Intro
  console.log('  Rendering intro...');
  const introHTML = renderTemplate('intro', {
    BRAND_NAME: config.brand.name,
    BRAND_COLOR: config.brand.color,
    BRAND_LOGO: config.brand.logoUrl,
    TAGLINE: config.brand.tagline,
    TITLE: opts.title,
  });
  frameNum = await captureHTMLFrames(send, introHTML, framesDir, frameNum, introFrameCount, config.video.width, config.video.height);

  // Content scenes
  for (let i = 0; i < opts.scenes.length; i++) {
    const scene = opts.scenes[i];
    console.log(`  Scene ${i + 1}/${opts.scenes.length}: ${scene}`);

    if (scene.startsWith('http://') || scene.startsWith('https://')) {
      frameNum = await captureSceneFrames(send, scene, framesDir, frameNum, sceneFrameCount);
    } else {
      // Treat as a description - render as a styled slide
      const slideHTML = renderTemplate('slide', {
        BRAND_NAME: config.brand.name,
        BRAND_COLOR: config.brand.color,
        BRAND_LOGO: config.brand.logoUrl,
        CONTENT: scene,
        SCENE_NUMBER: String(i + 1),
        TOTAL_SCENES: String(opts.scenes.length),
      });
      frameNum = await captureHTMLFrames(send, slideHTML, framesDir, frameNum, sceneFrameCount, config.video.width, config.video.height);
    }
  }

  // Outro
  console.log('  Rendering outro...');
  const outroHTML = renderTemplate('outro', {
    BRAND_NAME: config.brand.name,
    BRAND_COLOR: config.brand.color,
    BRAND_LOGO: config.brand.logoUrl,
    TAGLINE: config.brand.tagline,
  });
  frameNum = await captureHTMLFrames(send, outroHTML, framesDir, frameNum, outroFrameCount, config.video.width, config.video.height);

  ws.close();
  console.log(`  Total frames: ${frameNum}\n`);

  // ── Step 3: Encode video from frames ────────────────────────────────────
  console.log('Step 3/4: Encoding video...');
  const rawVideoPath = path.join(tmpDir, 'raw.mp4');
  execSync(
    `ffmpeg -y -framerate ${config.video.fps} ` +
    `-i "${framesDir}/frame_%05d.png" ` +
    `-c:v libx264 -pix_fmt yuv420p -preset fast -crf 23 ` +
    `"${rawVideoPath}"`,
    { stdio: 'pipe' }
  );

  // ── Step 4: Combine video + audio ───────────────────────────────────────
  console.log('Step 4/4: Combining video and audio...');
  const outputPath = path.resolve(opts.output);
  execSync(
    `ffmpeg -y -i "${rawVideoPath}" -i "${audioPath}" ` +
    `-c:v copy -c:a aac -b:a 192k -shortest ` +
    `"${outputPath}"`,
    { stdio: 'pipe' }
  );

  // Cleanup
  fs.rmSync(tmpDir, { recursive: true });

  const stats = fs.statSync(outputPath);
  console.log(`\n=== Done ===`);
  console.log(`Video: ${outputPath}`);
  console.log(`Size: ${(stats.size / 1024 / 1024).toFixed(1)} MB`);
}

main().catch((err) => {
  console.error('Error:', err.message);
  process.exit(1);
});
