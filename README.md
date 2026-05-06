# Photo Book

Local web app that turns your Instagram data export into a year-by-year printable PDF photo book.

Runs entirely on your machine — your photos never leave it.

## What it does (today)

- Scans an unzipped Instagram "Download Your Information" export folder
- Reads `posts_*.json`, `stories.json`, `reels.json` to recover capture dates and captions
- Groups every photo by year and shows them in a fast thumbnail grid
- Lets you tick the ones you want; selections persist to disk
- Strips Instagram cruft (`@mentions`, `#hashtags`, URLs) from captions
- Builds a print-ready PDF per year (A4 / Letter / Square, 1/2/4 photos per page, with or without captions)

## Roadmap

- [ ] OneDrive + Google Drive ingestion
- [ ] "Has people" face-detection filter
- [ ] Auto-generated captions from a vision model
- [ ] Tag/sticker removal via inpainting

## Requirements

- Node.js 20.6+ (uses native `--env-file`)
- ~Disk space for thumbnails (~30 KB per photo)

## Setup

```bash
npm install
cp .env.example .env
# Edit .env and point EXPORT_ROOT at your unzipped Instagram export folder.
npm run dev
```

Open http://localhost:5173.

The first load triggers a scan of your export folder; subsequent loads are instant (cached in `data/index.json`). Click **Rescan** if you've added more photos.

## Getting your Instagram export

1. Instagram → Settings → Accounts Center → Your information and permissions → Download your information
2. Choose JSON format, full quality, all date ranges, and the data you want (Posts, Stories, Reels)
3. When the email arrives, download and unzip
4. Point `EXPORT_ROOT` at the unzipped folder

## Project layout

```
server/src/      Express backend (scan, thumbnails, PDF)
client/src/      Vite + React frontend
shared/          Types shared between server and client
data/            Cached index, thumbnails, selections, output PDFs (gitignored)
```

## Production build

```bash
npm run build
npm start
```

Then open http://localhost:5174 (the server serves the built client too).
