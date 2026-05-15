import type { SheetColumn, SheetRow, SheetCell } from './sheet.model';

export interface SnapshotContent {
  columns: SheetColumn[];
  rows: SheetRow[];
  cells: SheetCell[];
  filters: unknown[];
  sort: unknown[];
}

export interface PageSnapshot {
  id: string;
  pageId: string;
  takenAt: string;
  takenBy: string | null;
  content: SnapshotContent;
}
