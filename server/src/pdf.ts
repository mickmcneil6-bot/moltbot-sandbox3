import path from 'node:path';
import fs from 'node:fs';
import PDFDocument from 'pdfkit';
import sharp from 'sharp';
import { OUTPUT_DIR } from './config.js';
import type { Photo, PdfOptions } from '../../shared/types.js';

const PAGE_SIZES: Record<PdfOptions['pageSize'], [number, number]> = {
  A4: [595.28, 841.89],
  LETTER: [612, 792],
  SQUARE: [612, 612],
};

const MARGIN = 36;

interface RenderInput {
  year: number;
  photos: { photo: Photo; absPath: string }[];
  options: PdfOptions;
}

export async function renderYearPdf({ year, photos, options }: RenderInput): Promise<string> {
  const [pageW, pageH] = PAGE_SIZES[options.pageSize];
  const outPath = path.join(OUTPUT_DIR, `photobook-${year}.pdf`);

  // Pre-render print-quality JPEGs in memory so PDFKit can embed them.
  // sharp handles HEIC/auto-rotate/colourspace; PDFKit alone cannot.
  const prepared = await Promise.all(
    photos.map(async ({ photo, absPath }) => {
      const buf = await sharp(absPath, { failOn: 'none' })
        .rotate()
        .resize(2000, 2000, { fit: 'inside', withoutEnlargement: true })
        .jpeg({ quality: 88 })
        .toBuffer({ resolveWithObject: true });
      return { photo, buf: buf.data, w: buf.info.width, h: buf.info.height };
    }),
  );

  const doc = new PDFDocument({ size: [pageW, pageH], margin: MARGIN, info: { Title: `Photo Book ${year}` } });
  const stream = fs.createWriteStream(outPath);
  doc.pipe(stream);

  // Cover page
  doc.fontSize(48).text(String(year), { align: 'center', baseline: 'middle' });
  doc.moveDown(2);
  doc.fontSize(14).text(`${photos.length} photos`, { align: 'center' });

  const cellsPerPage = options.perPage;
  for (let i = 0; i < prepared.length; i += cellsPerPage) {
    doc.addPage();
    const batch = prepared.slice(i, i + cellsPerPage);
    layoutCells(doc, batch, pageW, pageH, options);
  }

  doc.end();
  await new Promise<void>((resolve, reject) => {
    stream.on('finish', () => resolve());
    stream.on('error', reject);
  });
  return outPath;
}

interface PreparedPhoto {
  photo: Photo;
  buf: Buffer;
  w: number;
  h: number;
}

function layoutCells(
  doc: PDFKit.PDFDocument,
  batch: PreparedPhoto[],
  pageW: number,
  pageH: number,
  options: PdfOptions,
) {
  const cols = options.perPage === 1 ? 1 : 2;
  const rows = options.perPage === 4 ? 2 : options.perPage === 2 ? 2 : 1;
  const usableW = pageW - MARGIN * 2;
  const usableH = pageH - MARGIN * 2;
  const captionH = options.includeCaptions ? 28 : 0;
  const cellW = usableW / cols;
  const cellH = usableH / rows;
  const imgH = cellH - captionH - 8;

  batch.forEach((item, idx) => {
    const col = idx % cols;
    const row = Math.floor(idx / cols);
    const x = MARGIN + col * cellW;
    const y = MARGIN + row * cellH;

    const ratio = item.w / item.h;
    let drawW = cellW - 8;
    let drawH = drawW / ratio;
    if (drawH > imgH) {
      drawH = imgH;
      drawW = drawH * ratio;
    }
    const offsetX = x + (cellW - drawW) / 2;
    const offsetY = y + (imgH - drawH) / 2 + 4;

    doc.image(item.buf, offsetX, offsetY, { width: drawW, height: drawH });

    if (options.includeCaptions) {
      const caption = item.photo.caption ?? formatDate(item.photo.takenAt);
      doc
        .fontSize(9)
        .fillColor('#444')
        .text(caption, x + 4, y + cellH - captionH, {
          width: cellW - 8,
          height: captionH,
          ellipsis: true,
        })
        .fillColor('black');
    }
  });
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}
