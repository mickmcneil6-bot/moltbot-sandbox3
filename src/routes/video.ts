import { Hono } from 'hono';
import type { AppEnv } from '../types';
import { createAccessMiddleware } from '../auth';
import { ensureMoltbotGateway, waitForProcess } from '../gateway';

const GENERATE_TIMEOUT_MS = 300000; // 5 minutes for video generation

/**
 * Video generation API routes
 * - POST /api/video/generate - Generate a branded video
 * - POST /api/video/voiceover - Generate voiceover audio only
 * - GET /api/video/config - Get current video config
 * - GET /api/video/output/:filename - Download generated video
 */
const videoApi = new Hono<AppEnv>();

// Protect all video routes with CF Access
videoApi.use('*', createAccessMiddleware({ type: 'json' }));

// GET /api/video/config - Return current video generation config
videoApi.get('/config', async (c) => {
  return c.json({
    brand: {
      name: c.env.VIDEO_BRAND_NAME || 'AI Video',
      color: c.env.VIDEO_BRAND_COLOR || '#6366f1',
      logoUrl: c.env.VIDEO_BRAND_LOGO_URL || '',
    },
    voice: {
      voiceId: c.env.ELEVENLABS_VOICE_ID || '21m00Tcm4TlvDq8ikWAM',
      configured: !!c.env.ELEVENLABS_API_KEY,
    },
    cdp: {
      configured: !!(c.env.CDP_SECRET && c.env.WORKER_URL),
    },
  });
});

// POST /api/video/voiceover - Generate voiceover audio from text
videoApi.post('/voiceover', async (c) => {
  if (!c.env.ELEVENLABS_API_KEY) {
    return c.json({ error: 'ELEVENLABS_API_KEY is not configured' }, 400);
  }

  const body = await c.req.json<{ text: string; voiceId?: string }>();
  if (!body.text) {
    return c.json({ error: 'text is required' }, 400);
  }

  const sandbox = c.get('sandbox');
  await ensureMoltbotGateway(sandbox, c.env);

  const voiceId = body.voiceId || c.env.ELEVENLABS_VOICE_ID || '21m00Tcm4TlvDq8ikWAM';
  const outputFile = `/tmp/voiceover-${Date.now()}.mp3`;

  const cmd = [
    `ELEVENLABS_API_KEY=${c.env.ELEVENLABS_API_KEY}`,
    `ELEVENLABS_VOICE_ID=${voiceId}`,
    'node /root/clawd/skills/ai-video-generator/scripts/voiceover.js',
    `--text "${body.text.replace(/"/g, '\\"')}"`,
    `--output ${outputFile}`,
  ].join(' ');

  try {
    const proc = await sandbox.startProcess(cmd);
    await waitForProcess(proc, 60000);
    const logs = await proc.getLogs();

    if (proc.exitCode !== 0) {
      return c.json({
        error: 'Voiceover generation failed',
        details: logs.stderr || logs.stdout,
      }, 500);
    }

    return c.json({
      success: true,
      outputFile,
      message: 'Voiceover generated successfully',
      logs: logs.stdout,
    });
  } catch (error) {
    return c.json({
      error: error instanceof Error ? error.message : 'Unknown error',
    }, 500);
  }
});

// POST /api/video/generate - Full video generation pipeline
videoApi.post('/generate', async (c) => {
  if (!c.env.ELEVENLABS_API_KEY) {
    return c.json({ error: 'ELEVENLABS_API_KEY is not configured' }, 400);
  }
  if (!c.env.CDP_SECRET || !c.env.WORKER_URL) {
    return c.json({ error: 'CDP_SECRET and WORKER_URL must be configured for video generation' }, 400);
  }

  const body = await c.req.json<{
    script: string;
    scenes: string[];
    title?: string;
  }>();

  if (!body.script) {
    return c.json({ error: 'script is required' }, 400);
  }
  if (!body.scenes || body.scenes.length === 0) {
    return c.json({ error: 'scenes array is required (at least one scene)' }, 400);
  }

  const sandbox = c.get('sandbox');
  await ensureMoltbotGateway(sandbox, c.env);

  const outputFile = `/tmp/video-${Date.now()}.mp4`;
  const scenesStr = body.scenes.join(',');

  const envVars = [
    `ELEVENLABS_API_KEY=${c.env.ELEVENLABS_API_KEY}`,
    c.env.ELEVENLABS_VOICE_ID ? `ELEVENLABS_VOICE_ID=${c.env.ELEVENLABS_VOICE_ID}` : '',
    `CDP_SECRET=${c.env.CDP_SECRET}`,
    `WORKER_URL=${c.env.WORKER_URL}`,
    c.env.VIDEO_BRAND_NAME ? `VIDEO_BRAND_NAME="${c.env.VIDEO_BRAND_NAME}"` : '',
    c.env.VIDEO_BRAND_COLOR ? `VIDEO_BRAND_COLOR="${c.env.VIDEO_BRAND_COLOR}"` : '',
    c.env.VIDEO_BRAND_LOGO_URL ? `VIDEO_BRAND_LOGO_URL="${c.env.VIDEO_BRAND_LOGO_URL}"` : '',
  ].filter(Boolean).join(' ');

  const scriptArg = body.script.replace(/"/g, '\\"');
  const titleArg = body.title ? `--title "${body.title.replace(/"/g, '\\"')}"` : '';

  const cmd = [
    envVars,
    'node /root/clawd/skills/ai-video-generator/scripts/generate.js',
    `--script "${scriptArg}"`,
    `--scenes "${scenesStr}"`,
    titleArg,
    `--output ${outputFile}`,
  ].filter(Boolean).join(' ');

  try {
    const proc = await sandbox.startProcess(cmd);
    await waitForProcess(proc, GENERATE_TIMEOUT_MS);
    const logs = await proc.getLogs();

    if (proc.exitCode !== 0) {
      return c.json({
        error: 'Video generation failed',
        details: logs.stderr || logs.stdout,
      }, 500);
    }

    return c.json({
      success: true,
      outputFile,
      message: 'Video generated successfully',
      logs: logs.stdout,
    });
  } catch (error) {
    return c.json({
      error: error instanceof Error ? error.message : 'Unknown error',
    }, 500);
  }
});

// GET /api/video/output/:filename - Stream a generated video file
videoApi.get('/output/:filename', async (c) => {
  const sandbox = c.get('sandbox');
  const filename = c.req.param('filename');

  // Only allow files from /tmp/ to prevent path traversal
  if (!filename || filename.includes('/') || filename.includes('..')) {
    return c.json({ error: 'Invalid filename' }, 400);
  }

  const filePath = `/tmp/${filename}`;

  try {
    await ensureMoltbotGateway(sandbox, c.env);

    // Read file from container using base64 encoding
    const proc = await sandbox.startProcess(`base64 "${filePath}"`);
    await waitForProcess(proc, 30000);
    const logs = await proc.getLogs();

    if (proc.exitCode !== 0) {
      return c.json({ error: 'File not found' }, 404);
    }

    const b64 = (logs.stdout || '').replace(/\s/g, '');
    const bytes = Uint8Array.from(atob(b64), (ch) => ch.charCodeAt(0));

    const ext = filename.split('.').pop();
    const contentType = ext === 'mp4' ? 'video/mp4' : ext === 'mp3' ? 'audio/mpeg' : 'application/octet-stream';

    return new Response(bytes, {
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    return c.json({
      error: error instanceof Error ? error.message : 'Unknown error',
    }, 500);
  }
});

export { videoApi };
