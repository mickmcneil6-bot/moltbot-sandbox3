---
name: ai-video-generator
description: Generate short branded video clips with AI-generated visuals, consistent intro/outro sequences, and ElevenLabs voiceover narration. Use when you need to produce short-form video content with professional branding.
---

# AI Video Generator

Create short branded video clips with consistent intro/outro branding and ElevenLabs voiceover narration.

## Prerequisites

- `ELEVENLABS_API_KEY` environment variable set
- `CDP_SECRET` environment variable set (for browser-based frame capture)
- `ffmpeg` installed in the container
- Browser profile configured (see cloudflare-browser skill)

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `ELEVENLABS_API_KEY` | Yes | ElevenLabs API key for text-to-speech |
| `ELEVENLABS_VOICE_ID` | No | Voice ID to use (default: `21m00Tcm4TlvDq8ikWAM` - Rachel) |
| `VIDEO_BRAND_NAME` | No | Brand name shown in intro/outro (default: "AI Video") |
| `VIDEO_BRAND_COLOR` | No | Primary brand color hex (default: `#6366f1`) |
| `VIDEO_BRAND_LOGO_URL` | No | URL to brand logo image |
| `CDP_SECRET` | Yes | For browser-based frame rendering |
| `WORKER_URL` | Yes | Worker base URL for CDP connection |

## Quick Start

### Generate a complete branded video
```bash
node /path/to/skills/ai-video-generator/scripts/generate.js \
  --script "Welcome to our product demo. Today we'll show you three amazing features." \
  --scenes "Product dashboard overview,Analytics charts in action,Team collaboration view" \
  --output demo.mp4
```

### Generate voiceover only
```bash
node /path/to/skills/ai-video-generator/scripts/voiceover.js \
  --text "Hello and welcome to our channel." \
  --output narration.mp3
```

### Assemble video from existing assets
```bash
node /path/to/skills/ai-video-generator/scripts/assemble.js \
  --intro intro.mp4 \
  --content main.mp4 \
  --outro outro.mp4 \
  --audio narration.mp3 \
  --output final.mp4
```

## Pipeline Overview

```
Script Text ──► ElevenLabs TTS ──► Voiceover Audio (.mp3)
                                         │
Scene Descriptions ──► Browser Capture ──► Content Frames
                                         │
Brand Config ──► HTML Templates ──► Intro/Outro Frames
                                         │
                                    ┌────┴────┐
                                    │ ffmpeg   │
                                    │ Assembly │
                                    └────┬────┘
                                         │
                                    Final Video (.mp4)
```

## Configuration

Create a `video-config.json` in the skill directory or pass options via CLI flags:

```json
{
  "brand": {
    "name": "My Brand",
    "color": "#6366f1",
    "logoUrl": "https://example.com/logo.png",
    "tagline": "Creating the future"
  },
  "voice": {
    "voiceId": "21m00Tcm4TlvDq8ikWAM",
    "model": "eleven_multilingual_v2",
    "stability": 0.5,
    "similarityBoost": 0.75
  },
  "video": {
    "width": 1280,
    "height": 720,
    "fps": 30,
    "introDuration": 3,
    "outroDuration": 3
  }
}
```

## Customization

### Custom Intro/Outro Templates

Place custom HTML templates in the `templates/` directory:
- `templates/intro.html` - Intro screen template
- `templates/outro.html` - Outro/end screen template

Templates support these placeholders:
- `{{BRAND_NAME}}` - Brand name
- `{{BRAND_COLOR}}` - Primary color
- `{{BRAND_LOGO}}` - Logo URL
- `{{TAGLINE}}` - Brand tagline
- `{{TITLE}}` - Video title (intro only)

## Troubleshooting

- **No audio generated**: Verify `ELEVENLABS_API_KEY` is valid and has credits
- **Blank frames**: Ensure CDP connection is working (test with cloudflare-browser screenshot first)
- **ffmpeg errors**: Check that ffmpeg is installed with libx264 support
- **Long generation time**: Reduce scene count or lower resolution in config
