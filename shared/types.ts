export interface Photo {
  id: string;
  relPath: string;
  year: number;
  takenAt: string;
  caption?: string;
  source: 'post' | 'story' | 'reel' | 'other';
  width?: number;
  height?: number;
}

export interface YearSummary {
  year: number;
  count: number;
}

export interface LibraryStatus {
  exportRoot: string | null;
  totalPhotos: number;
  years: YearSummary[];
}

export interface SelectionState {
  // year -> photo ids
  byYear: Record<string, string[]>;
}

export interface PdfOptions {
  pageSize: 'A4' | 'LETTER' | 'SQUARE';
  perPage: 1 | 2 | 4;
  includeCaptions: boolean;
}
