import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import type { Photo } from '../../shared/types.js';
import { cleanCaption } from './caption.js';

const IMAGE_EXT = new Set(['.jpg', '.jpeg', '.png', '.heic', '.webp']);

interface MetaEntry {
  timestamp: number;
  caption?: string;
  source: Photo['source'];
}

interface IgMediaItem {
  uri?: string;
  creation_timestamp?: number;
  title?: string;
}

interface IgPost {
  media?: IgMediaItem[];
  creation_timestamp?: number;
  title?: string;
}

interface IgStoriesFile {
  ig_stories?: IgMediaItem[];
}

async function walk(dir: string, out: string[] = []): Promise<string[]> {
  let entries;
  try {
    entries = await fs.readdir(dir, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const e of entries) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) await walk(p, out);
    else out.push(p);
  }
  return out;
}

async function readJson<T>(file: string): Promise<T | null> {
  try {
    const txt = await fs.readFile(file, 'utf8');
    return JSON.parse(txt) as T;
  } catch {
    return null;
  }
}

function addEntry(
  map: Map<string, MetaEntry>,
  uri: string | undefined,
  timestamp: number | undefined,
  title: string | undefined,
  source: Photo['source'],
) {
  if (!uri || !timestamp) return;
  const normalised = uri.replace(/^\/+/, '').toLowerCase();
  if (map.has(normalised)) return;
  map.set(normalised, {
    timestamp,
    caption: cleanCaption(title),
    source,
  });
}

async function buildMetadataMap(root: string): Promise<Map<string, MetaEntry>> {
  const map = new Map<string, MetaEntry>();
  const all = await walk(root);
  const jsons = all.filter(
    (p) =>
      p.endsWith('.json') &&
      /\b(posts_\d+|stories|reels|archived_posts|profile_photos)\.json$/i.test(p),
  );

  for (const file of jsons) {
    const base = path.basename(file).toLowerCase();
    if (base.startsWith('posts_') || base === 'archived_posts.json') {
      const data = await readJson<IgPost[]>(file);
      if (!Array.isArray(data)) continue;
      for (const post of data) {
        const postCaption = post.title;
        const postTs = post.creation_timestamp;
        for (const m of post.media ?? []) {
          addEntry(map, m.uri, m.creation_timestamp ?? postTs, m.title ?? postCaption, 'post');
        }
      }
    } else if (base === 'stories.json') {
      const data = await readJson<IgStoriesFile>(file);
      for (const m of data?.ig_stories ?? []) {
        addEntry(map, m.uri, m.creation_timestamp, m.title, 'story');
      }
    } else if (base === 'reels.json') {
      const data = await readJson<{ ig_reels_media?: IgPost[] } | IgPost[]>(file);
      const arr = Array.isArray(data) ? data : data?.ig_reels_media ?? [];
      for (const post of arr) {
        for (const m of post.media ?? []) {
          addEntry(map, m.uri, m.creation_timestamp ?? post.creation_timestamp, m.title ?? post.title, 'reel');
        }
      }
    } else if (base === 'profile_photos.json') {
      const data = await readJson<{ ig_profile_picture?: IgMediaItem[] }>(file);
      for (const m of data?.ig_profile_picture ?? []) {
        addEntry(map, m.uri, m.creation_timestamp, m.title, 'other');
      }
    }
  }

  return map;
}

function inferSourceFromPath(p: string): Photo['source'] {
  const lower = p.toLowerCase();
  if (lower.includes('/stories/')) return 'story';
  if (lower.includes('/reels/')) return 'reel';
  if (lower.includes('/posts/')) return 'post';
  return 'other';
}

export interface ScanResult {
  photos: Photo[];
  scannedAt: string;
  exportRoot: string;
}

export async function scanExport(exportRoot: string): Promise<ScanResult> {
  const meta = await buildMetadataMap(exportRoot);
  const all = await walk(exportRoot);
  const photos: Photo[] = [];

  for (const abs of all) {
    const ext = path.extname(abs).toLowerCase();
    if (!IMAGE_EXT.has(ext)) continue;

    const relPath = path.relative(exportRoot, abs).replace(/\\/g, '/');
    const lookup = relPath.toLowerCase();
    const m = meta.get(lookup);

    let timestampSec: number;
    if (m?.timestamp) {
      timestampSec = m.timestamp;
    } else {
      const stat = await fs.stat(abs);
      timestampSec = Math.floor(stat.mtimeMs / 1000);
    }

    const taken = new Date(timestampSec * 1000);
    const id = crypto.createHash('sha1').update(relPath).digest('hex').slice(0, 16);

    photos.push({
      id,
      relPath,
      year: taken.getUTCFullYear(),
      takenAt: taken.toISOString(),
      caption: m?.caption,
      source: m?.source ?? inferSourceFromPath(relPath),
    });
  }

  photos.sort((a, b) => a.takenAt.localeCompare(b.takenAt));
  return { photos, scannedAt: new Date().toISOString(), exportRoot };
}
