#!/usr/bin/env node
/**
 * Video Assembly Pipeline
 *
 * Combines intro, content scenes, and outro into a final branded video
 * with optional voiceover audio track.
 *
 * Usage:
 *   node assemble.js --content content.mp4 --audio narration.mp3 --output final.mp4
 *   node assemble.js --intro intro.mp4 --content content.mp4 --outro outro.mp4 --output final.mp4
 *   node assemble.js --segments "intro.mp4,scene1.mp4,scene2.mp4,outro.mp4" --audio vo.mp3 --output final.mp4
 *
 * Handles:
 *   - Concatenating multiple video segments (intro + scenes + outro)
 *   - Overlaying voiceover audio onto the video
 *   - Normalizing resolution/framerate across segments
 *   - Adding fade transitions between segments
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

function parseArgs() {
  const args = process.argv.slice(2);
  const opts = {
    intro: null,
    content: null,
    outro: null,
    segments: null,
    audio: null,
    output: 'final.mp4',
    width: 1280,
    height: 720,
    fps: 30,
    fadeDuration: 0.5,
  };

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--intro': opts.intro = args[++i]; break;
      case '--content': opts.content = args[++i]; break;
      case '--outro': opts.outro = args[++i]; break;
      case '--segments': opts.segments = args[++i]; break;
      case '--audio': opts.audio = args[++i]; break;
      case '--output': opts.output = args[++i]; break;
      case '--width': opts.width = parseInt(args[++i]); break;
      case '--height': opts.height = parseInt(args[++i]); break;
      case '--fps': opts.fps = parseInt(args[++i]); break;
      case '--fade': opts.fadeDuration = parseFloat(args[++i]); break;
    }
  }

  return opts;
}

/**
 * Get duration of a media file in seconds.
 */
function getDuration(filePath) {
  const result = execSync(
    `ffprobe -v quiet -show_entries format=duration -of csv=p=0 "${filePath}"`,
    { encoding: 'utf-8' }
  ).trim();
  return parseFloat(result);
}

/**
 * Normalize a video segment to consistent resolution, framerate, and codec.
 */
function normalizeSegment(inputPath, outputPath, width, height, fps) {
  console.log(`  Normalizing: ${path.basename(inputPath)}`);
  execSync(
    `ffmpeg -y -i "${inputPath}" ` +
    `-vf "scale=${width}:${height}:force_original_aspect_ratio=decrease,` +
    `pad=${width}:${height}:(ow-iw)/2:(oh-ih)/2:black,fps=${fps}" ` +
    `-c:v libx264 -preset fast -crf 23 -pix_fmt yuv420p ` +
    `-an "${outputPath}"`,
    { stdio: 'pipe' }
  );
}

/**
 * Concatenate video segments using ffmpeg concat demuxer.
 */
function concatenateSegments(segmentPaths, outputPath) {
  const listFile = `/tmp/concat-list-${Date.now()}.txt`;
  const listContent = segmentPaths
    .map((p) => `file '${path.resolve(p)}'`)
    .join('\n');
  fs.writeFileSync(listFile, listContent);

  console.log(`  Concatenating ${segmentPaths.length} segments...`);
  execSync(
    `ffmpeg -y -f concat -safe 0 -i "${listFile}" ` +
    `-c:v libx264 -preset fast -crf 23 -pix_fmt yuv420p ` +
    `"${outputPath}"`,
    { stdio: 'pipe' }
  );

  fs.unlinkSync(listFile);
}

/**
 * Overlay audio onto a video. If the audio is shorter than the video, it stops
 * where the audio ends. If longer, the audio is trimmed to match video duration.
 */
function overlayAudio(videoPath, audioPath, outputPath) {
  console.log('  Overlaying audio...');
  execSync(
    `ffmpeg -y -i "${videoPath}" -i "${audioPath}" ` +
    `-c:v copy -c:a aac -b:a 192k -shortest ` +
    `"${outputPath}"`,
    { stdio: 'pipe' }
  );
}

/**
 * Add fade-in at the start and fade-out at the end of a video.
 */
function addFades(inputPath, outputPath, fadeDuration) {
  const duration = getDuration(inputPath);
  const fadeOutStart = Math.max(0, duration - fadeDuration);

  console.log('  Adding fade transitions...');
  execSync(
    `ffmpeg -y -i "${inputPath}" ` +
    `-vf "fade=t=in:st=0:d=${fadeDuration},fade=t=out:st=${fadeOutStart}:d=${fadeDuration}" ` +
    `-c:v libx264 -preset fast -crf 23 -pix_fmt yuv420p ` +
    `-c:a copy "${outputPath}"`,
    { stdio: 'pipe' }
  );
}

async function main() {
  const opts = parseArgs();
  const tmpDir = `/tmp/video-assemble-${Date.now()}`;
  fs.mkdirSync(tmpDir, { recursive: true });

  // Build segment list
  let segmentFiles = [];

  if (opts.segments) {
    segmentFiles = opts.segments.split(',').map((s) => s.trim());
  } else {
    if (opts.intro) segmentFiles.push(opts.intro);
    if (opts.content) segmentFiles.push(opts.content);
    if (opts.outro) segmentFiles.push(opts.outro);
  }

  if (segmentFiles.length === 0) {
    console.error('Error: No video segments provided.');
    console.error('Use --content, --segments, or --intro/--content/--outro flags.');
    process.exit(1);
  }

  // Verify all files exist
  for (const f of segmentFiles) {
    if (!fs.existsSync(f)) {
      console.error(`Error: File not found: ${f}`);
      process.exit(1);
    }
  }
  if (opts.audio && !fs.existsSync(opts.audio)) {
    console.error(`Error: Audio file not found: ${opts.audio}`);
    process.exit(1);
  }

  console.log(`Assembling video from ${segmentFiles.length} segment(s)`);
  console.log(`  Resolution: ${opts.width}x${opts.height} @ ${opts.fps}fps`);
  if (opts.audio) console.log(`  Audio: ${opts.audio}`);
  console.log(`  Output: ${opts.output}\n`);

  // Step 1: Normalize all segments
  console.log('Step 1: Normalizing segments...');
  const normalizedPaths = [];
  for (let i = 0; i < segmentFiles.length; i++) {
    const normPath = path.join(tmpDir, `norm_${i}.mp4`);
    normalizeSegment(segmentFiles[i], normPath, opts.width, opts.height, opts.fps);
    normalizedPaths.push(normPath);
  }

  // Step 2: Concatenate
  let assembledPath;
  if (normalizedPaths.length === 1) {
    assembledPath = normalizedPaths[0];
  } else {
    console.log('\nStep 2: Concatenating segments...');
    assembledPath = path.join(tmpDir, 'concatenated.mp4');
    concatenateSegments(normalizedPaths, assembledPath);
  }

  // Step 3: Add fades
  if (opts.fadeDuration > 0) {
    console.log('\nStep 3: Adding transitions...');
    const fadedPath = path.join(tmpDir, 'faded.mp4');
    addFades(assembledPath, fadedPath, opts.fadeDuration);
    assembledPath = fadedPath;
  }

  // Step 4: Overlay audio
  const outputPath = path.resolve(opts.output);
  if (opts.audio) {
    console.log('\nStep 4: Overlaying voiceover audio...');
    overlayAudio(assembledPath, opts.audio, outputPath);
  } else {
    fs.copyFileSync(assembledPath, outputPath);
  }

  // Cleanup
  fs.rmSync(tmpDir, { recursive: true });

  const stats = fs.statSync(outputPath);
  const duration = getDuration(outputPath);
  console.log(`\nVideo saved to ${outputPath}`);
  console.log(`  Size: ${(stats.size / 1024 / 1024).toFixed(1)} MB`);
  console.log(`  Duration: ${duration.toFixed(1)}s`);
}

main().catch((err) => {
  console.error('Error:', err.message);
  process.exit(1);
});
