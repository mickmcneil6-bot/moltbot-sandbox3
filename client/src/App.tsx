import { useEffect, useMemo, useState } from 'react';
import type { LibraryStatus, Photo, PdfOptions, SelectionState } from '@shared/types';
import { api } from './api';

export function App() {
  const [status, setStatus] = useState<LibraryStatus | null>(null);
  const [year, setYear] = useState<number | null>(null);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loadingPhotos, setLoadingPhotos] = useState(false);
  const [selection, setSelection] = useState<SelectionState>({ byYear: {} });
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [pdfOptions, setPdfOptions] = useState<PdfOptions>({
    pageSize: 'A4',
    perPage: 2,
    includeCaptions: true,
  });

  useEffect(() => {
    Promise.all([api.status(), api.selection()])
      .then(([s, sel]) => {
        setStatus(s);
        setSelection(sel);
        if (s.years.length > 0) setYear(s.years[0].year);
      })
      .catch((e) => setError(String(e)));
  }, []);

  useEffect(() => {
    if (year == null) return;
    setLoadingPhotos(true);
    api
      .photos(year)
      .then(setPhotos)
      .catch((e) => setError(String(e)))
      .finally(() => setLoadingPhotos(false));
  }, [year]);

  const selectedIds = useMemo(
    () => new Set(year != null ? selection.byYear[String(year)] ?? [] : []),
    [selection, year],
  );

  function toggle(id: string) {
    if (year == null) return;
    const key = String(year);
    setSelection((prev) => {
      const current = new Set(prev.byYear[key] ?? []);
      if (current.has(id)) current.delete(id);
      else current.add(id);
      const next: SelectionState = {
        byYear: { ...prev.byYear, [key]: [...current] },
      };
      void api.saveSelection(next);
      return next;
    });
  }

  function selectAll(value: boolean) {
    if (year == null) return;
    const key = String(year);
    setSelection((prev) => {
      const next: SelectionState = {
        byYear: {
          ...prev.byYear,
          [key]: value ? photos.map((p) => p.id) : [],
        },
      };
      void api.saveSelection(next);
      return next;
    });
  }

  async function rescan() {
    setBusy('Rescanning…');
    setError(null);
    try {
      await api.rescan();
      const s = await api.status();
      setStatus(s);
      if (year != null) setPhotos(await api.photos(year));
    } catch (e) {
      setError(String(e));
    } finally {
      setBusy(null);
    }
  }

  async function buildPdf() {
    if (year == null) return;
    setBusy('Building PDF…');
    setError(null);
    try {
      const blob = await api.buildPdf(year, pdfOptions);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `photobook-${year}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      setError(String(e));
    } finally {
      setBusy(null);
    }
  }

  if (!status) return <div className="loading">Loading…</div>;

  if (!status.exportRoot) {
    return (
      <div className="setup">
        <h1>Photo Book</h1>
        <p>
          Set <code>EXPORT_ROOT</code> in <code>.env</code> to the absolute path of your unzipped
          Instagram export folder, then restart the server.
        </p>
        <p>See <code>.env.example</code> for the format.</p>
      </div>
    );
  }

  if (status.totalPhotos === 0) {
    return (
      <div className="setup">
        <h1>No photos found</h1>
        <p>Scanned <code>{status.exportRoot}</code> and found no images.</p>
        <button onClick={rescan} disabled={busy != null}>
          {busy ?? 'Rescan'}
        </button>
      </div>
    );
  }

  return (
    <div className="app">
      <header>
        <h1>Photo Book</h1>
        <div className="years">
          {status.years.map((y) => (
            <button
              key={y.year}
              className={y.year === year ? 'year active' : 'year'}
              onClick={() => setYear(y.year)}
            >
              {y.year} <span className="count">({y.count})</span>
            </button>
          ))}
        </div>
        <div className="actions">
          <button onClick={rescan} disabled={busy != null}>Rescan</button>
        </div>
      </header>

      {error && <div className="error">{error}</div>}

      {year != null && (
        <section className="toolbar">
          <div>
            <strong>{year}</strong> · {selectedIds.size} of {photos.length} selected
          </div>
          <div className="toolbar-actions">
            <button onClick={() => selectAll(true)}>Select all</button>
            <button onClick={() => selectAll(false)}>Clear</button>
            <span className="sep" />
            <select
              value={pdfOptions.pageSize}
              onChange={(e) =>
                setPdfOptions((o) => ({ ...o, pageSize: e.target.value as PdfOptions['pageSize'] }))
              }
            >
              <option value="A4">A4</option>
              <option value="LETTER">Letter</option>
              <option value="SQUARE">Square</option>
            </select>
            <select
              value={pdfOptions.perPage}
              onChange={(e) =>
                setPdfOptions((o) => ({ ...o, perPage: Number(e.target.value) as PdfOptions['perPage'] }))
              }
            >
              <option value={1}>1 / page</option>
              <option value={2}>2 / page</option>
              <option value={4}>4 / page</option>
            </select>
            <label className="checkbox">
              <input
                type="checkbox"
                checked={pdfOptions.includeCaptions}
                onChange={(e) => setPdfOptions((o) => ({ ...o, includeCaptions: e.target.checked }))}
              />
              Captions
            </label>
            <button className="primary" onClick={buildPdf} disabled={busy != null || selectedIds.size === 0}>
              {busy && busy.startsWith('Building') ? busy : 'Build PDF'}
            </button>
          </div>
        </section>
      )}

      {loadingPhotos ? (
        <div className="loading">Loading photos…</div>
      ) : (
        <div className="grid">
          {photos.map((p) => (
            <PhotoCard
              key={p.id}
              photo={p}
              selected={selectedIds.has(p.id)}
              onToggle={() => toggle(p.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function PhotoCard({
  photo,
  selected,
  onToggle,
}: {
  photo: Photo;
  selected: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      className={selected ? 'card selected' : 'card'}
      onClick={onToggle}
      title={photo.caption ?? new Date(photo.takenAt).toLocaleString()}
    >
      <img src={api.thumbUrl(photo.id)} loading="lazy" alt="" />
      <span className="check" aria-hidden>
        {selected ? '✓' : ''}
      </span>
      <span className="badge">{photo.source}</span>
    </button>
  );
}
