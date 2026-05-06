import fs from 'node:fs/promises';
import { INDEX_FILE } from './config.js';
import { scanExport, type ScanResult } from './scan.js';
import type { Photo } from '../../shared/types.js';

let cache: ScanResult | null = null;

async function loadCache(): Promise<ScanResult | null> {
  try {
    const txt = await fs.readFile(INDEX_FILE, 'utf8');
    return JSON.parse(txt) as ScanResult;
  } catch {
    return null;
  }
}

async function saveCache(res: ScanResult): Promise<void> {
  await fs.writeFile(INDEX_FILE, JSON.stringify(res));
}

export async function getLibrary(exportRoot: string, force = false): Promise<ScanResult> {
  if (!force) {
    if (cache && cache.exportRoot === exportRoot) return cache;
    const onDisk = await loadCache();
    if (onDisk && onDisk.exportRoot === exportRoot) {
      cache = onDisk;
      return onDisk;
    }
  }
  const res = await scanExport(exportRoot);
  cache = res;
  await saveCache(res);
  return res;
}

export function findPhoto(lib: ScanResult, id: string): Photo | undefined {
  return lib.photos.find((p) => p.id === id);
}
