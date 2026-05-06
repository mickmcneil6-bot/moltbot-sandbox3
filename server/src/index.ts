import express from 'express';
import path from 'node:path';
import fs from 'node:fs';
import { EXPORT_ROOT, PORT } from './config.js';
import { getLibrary, findPhoto } from './library.js';
import { getThumb } from './thumb.js';
import { loadSelection, saveSelection } from './selection.js';
import { renderYearPdf } from './pdf.js';
import type { LibraryStatus, PdfOptions, SelectionState } from '../../shared/types.js';

const app = express();
app.use(express.json({ limit: '1mb' }));

function requireExportRoot(res: express.Response): string | null {
  if (!EXPORT_ROOT) {
    res.status(400).json({ error: 'EXPORT_ROOT is not set. Add it to .env and restart.' });
    return null;
  }
  if (!fs.existsSync(EXPORT_ROOT)) {
    res.status(400).json({ error: `EXPORT_ROOT does not exist: ${EXPORT_ROOT}` });
    return null;
  }
  return EXPORT_ROOT;
}

app.get('/api/status', async (_req, res) => {
  if (!EXPORT_ROOT || !fs.existsSync(EXPORT_ROOT)) {
    const status: LibraryStatus = { exportRoot: EXPORT_ROOT, totalPhotos: 0, years: [] };
    res.json(status);
    return;
  }
  const lib = await getLibrary(EXPORT_ROOT);
  const counts = new Map<number, number>();
  for (const p of lib.photos) counts.set(p.year, (counts.get(p.year) ?? 0) + 1);
  const years = [...counts.entries()]
    .map(([year, count]) => ({ year, count }))
    .sort((a, b) => b.year - a.year);
  const status: LibraryStatus = { exportRoot: EXPORT_ROOT, totalPhotos: lib.photos.length, years };
  res.json(status);
});

app.post('/api/rescan', async (_req, res) => {
  const root = requireExportRoot(res);
  if (!root) return;
  await getLibrary(root, true);
  res.json({ ok: true });
});

app.get('/api/photos', async (req, res) => {
  const root = requireExportRoot(res);
  if (!root) return;
  const year = Number(req.query.year);
  if (!Number.isInteger(year)) {
    res.status(400).json({ error: 'year query param required' });
    return;
  }
  const lib = await getLibrary(root);
  res.json(lib.photos.filter((p) => p.year === year));
});

app.get('/api/thumb/:id', async (req, res) => {
  const root = requireExportRoot(res);
  if (!root) return;
  const lib = await getLibrary(root);
  const photo = findPhoto(lib, req.params.id);
  if (!photo) {
    res.status(404).end();
    return;
  }
  const size = Math.min(800, Math.max(64, Number(req.query.size) || 320));
  try {
    const file = await getThumb(path.join(root, photo.relPath), photo.id, size);
    res.sendFile(file);
  } catch (err) {
    console.error('thumb error', photo.relPath, err);
    res.status(500).end();
  }
});

app.get('/api/selection', async (_req, res) => {
  res.json(await loadSelection());
});

app.put('/api/selection', async (req, res) => {
  const body = req.body as SelectionState;
  if (!body || typeof body !== 'object' || !body.byYear) {
    res.status(400).json({ error: 'invalid body' });
    return;
  }
  await saveSelection(body);
  res.json({ ok: true });
});

app.post('/api/pdf/:year', async (req, res) => {
  const root = requireExportRoot(res);
  if (!root) return;
  const year = Number(req.params.year);
  if (!Number.isInteger(year)) {
    res.status(400).json({ error: 'invalid year' });
    return;
  }
  const options: PdfOptions = {
    pageSize: req.body?.pageSize ?? 'A4',
    perPage: req.body?.perPage ?? 2,
    includeCaptions: req.body?.includeCaptions ?? true,
  };
  const lib = await getLibrary(root);
  const sel = await loadSelection();
  const ids = new Set(sel.byYear[String(year)] ?? []);
  const chosen = lib.photos.filter((p) => p.year === year && ids.has(p.id));
  if (chosen.length === 0) {
    res.status(400).json({ error: 'no photos selected for this year' });
    return;
  }
  const inputs = chosen.map((photo) => ({ photo, absPath: path.join(root, photo.relPath) }));
  const file = await renderYearPdf({ year, photos: inputs, options });
  res.download(file);
});

// Serve built client in production
const clientDir = path.resolve(process.cwd(), 'dist/client');
if (fs.existsSync(clientDir)) {
  app.use(express.static(clientDir));
  app.get('*', (_req, res) => res.sendFile(path.join(clientDir, 'index.html')));
}

app.listen(PORT, () => {
  console.log(`server: http://localhost:${PORT}`);
  if (!EXPORT_ROOT) {
    console.log('warning: EXPORT_ROOT is unset; set it in .env to point at your Instagram export.');
  } else {
    console.log(`export root: ${EXPORT_ROOT}`);
  }
});
