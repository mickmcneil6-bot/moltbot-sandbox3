import path from 'node:path';
import fs from 'node:fs';

const root = path.resolve(process.cwd());

export const PORT = Number(process.env.PORT ?? 5174);
export const DATA_DIR = path.join(root, 'data');
export const THUMBS_DIR = path.join(DATA_DIR, 'thumbs');
export const OUTPUT_DIR = path.join(DATA_DIR, 'output');
export const SELECTIONS_FILE = path.join(DATA_DIR, 'selections.json');
export const INDEX_FILE = path.join(DATA_DIR, 'index.json');

// User configures EXPORT_ROOT in .env to point at the unzipped Instagram export folder.
export const EXPORT_ROOT: string | null = process.env.EXPORT_ROOT
  ? path.resolve(process.env.EXPORT_ROOT)
  : null;

for (const dir of [DATA_DIR, THUMBS_DIR, OUTPUT_DIR]) {
  fs.mkdirSync(dir, { recursive: true });
}
