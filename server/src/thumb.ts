import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import { THUMBS_DIR } from './config.js';

export async function getThumb(absSourcePath: string, id: string, size: number): Promise<string> {
  const dir = path.join(THUMBS_DIR, String(size));
  await fs.mkdir(dir, { recursive: true });
  const out = path.join(dir, `${id}.jpg`);
  try {
    await fs.access(out);
    return out;
  } catch {
    // fall through to generate
  }
  await sharp(absSourcePath, { failOn: 'none' })
    .rotate()
    .resize(size, size, { fit: 'cover' })
    .jpeg({ quality: 78 })
    .toFile(out);
  return out;
}
