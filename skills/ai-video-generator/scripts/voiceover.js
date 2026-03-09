#!/usr/bin/env node
/**
 * ElevenLabs Voiceover Generator
 *
 * Converts text to speech using the ElevenLabs API and saves as MP3.
 *
 * Usage:
 *   node voiceover.js --text "Hello world" --output narration.mp3
 *   node voiceover.js --file script.txt --output narration.mp3
 *
 * Environment:
 *   ELEVENLABS_API_KEY   - Required. ElevenLabs API key.
 *   ELEVENLABS_VOICE_ID  - Optional. Voice ID (default: Rachel).
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;
if (!ELEVENLABS_API_KEY) {
  console.error('Error: ELEVENLABS_API_KEY environment variable not set');
  process.exit(1);
}

const DEFAULT_VOICE_ID = '21m00Tcm4TlvDq8ikWAM'; // Rachel
const DEFAULT_MODEL = 'eleven_multilingual_v2';

// Parse CLI args
function parseArgs() {
  const args = process.argv.slice(2);
  const opts = {
    text: null,
    file: null,
    output: 'voiceover.mp3',
    voiceId: process.env.ELEVENLABS_VOICE_ID || DEFAULT_VOICE_ID,
    model: DEFAULT_MODEL,
    stability: 0.5,
    similarityBoost: 0.75,
  };

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--text':
        opts.text = args[++i];
        break;
      case '--file':
        opts.file = args[++i];
        break;
      case '--output':
        opts.output = args[++i];
        break;
      case '--voice-id':
        opts.voiceId = args[++i];
        break;
      case '--model':
        opts.model = args[++i];
        break;
      case '--stability':
        opts.stability = parseFloat(args[++i]);
        break;
      case '--similarity-boost':
        opts.similarityBoost = parseFloat(args[++i]);
        break;
    }
  }

  if (!opts.text && !opts.file) {
    console.error('Usage: node voiceover.js --text "..." --output out.mp3');
    console.error('       node voiceover.js --file script.txt --output out.mp3');
    process.exit(1);
  }

  if (opts.file) {
    opts.text = fs.readFileSync(opts.file, 'utf-8').trim();
  }

  return opts;
}

/**
 * Generate speech audio from text via ElevenLabs API.
 * Returns a Buffer containing the MP3 data.
 */
function generateSpeech(text, voiceId, model, stability, similarityBoost) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({
      text,
      model_id: model,
      voice_settings: {
        stability,
        similarity_boost: similarityBoost,
      },
    });

    const options = {
      hostname: 'api.elevenlabs.io',
      path: `/v1/text-to-speech/${voiceId}`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'xi-api-key': ELEVENLABS_API_KEY,
        Accept: 'audio/mpeg',
      },
    };

    const req = https.request(options, (res) => {
      if (res.statusCode !== 200) {
        let body = '';
        res.on('data', (chunk) => { body += chunk; });
        res.on('end', () => {
          reject(new Error(`ElevenLabs API error ${res.statusCode}: ${body}`));
        });
        return;
      }

      const chunks = [];
      res.on('data', (chunk) => chunks.push(chunk));
      res.on('end', () => resolve(Buffer.concat(chunks)));
    });

    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

async function main() {
  const opts = parseArgs();

  console.log(`Generating voiceover (${opts.text.length} chars)`);
  console.log(`  Voice: ${opts.voiceId}`);
  console.log(`  Model: ${opts.model}`);
  console.log(`  Output: ${opts.output}`);

  const audioBuffer = await generateSpeech(
    opts.text,
    opts.voiceId,
    opts.model,
    opts.stability,
    opts.similarityBoost
  );

  const outputPath = path.resolve(opts.output);
  fs.writeFileSync(outputPath, audioBuffer);

  const sizeKB = (audioBuffer.length / 1024).toFixed(1);
  console.log(`\nVoiceover saved to ${outputPath} (${sizeKB} KB)`);
}

main().catch((err) => {
  console.error('Error:', err.message);
  process.exit(1);
});

module.exports = { generateSpeech };
