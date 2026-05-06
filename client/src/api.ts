import type {
  LibraryStatus,
  Photo,
  PdfOptions,
  SelectionState,
} from '@shared/types';

async function json<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`${res.status}: ${body}`);
  }
  return res.json() as Promise<T>;
}

export const api = {
  status: () => fetch('/api/status').then(json<LibraryStatus>),
  rescan: () => fetch('/api/rescan', { method: 'POST' }).then(json<{ ok: true }>),
  photos: (year: number) => fetch(`/api/photos?year=${year}`).then(json<Photo[]>),
  selection: () => fetch('/api/selection').then(json<SelectionState>),
  saveSelection: (state: SelectionState) =>
    fetch('/api/selection', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(state),
    }).then(json<{ ok: true }>),
  thumbUrl: (id: string, size = 320) => `/api/thumb/${id}?size=${size}`,
  buildPdf: async (year: number, options: PdfOptions): Promise<Blob> => {
    const res = await fetch(`/api/pdf/${year}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(options),
    });
    if (!res.ok) throw new Error(await res.text());
    return res.blob();
  },
};
