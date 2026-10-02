import type { SheetColumn, SheetRow, SheetCell } from './sheet.model';
export interface SnapshotContent { schemaVersion:number; page?:{id:string;projectId:string;kind:string;title:string}; columns:SheetColumn[]; rows:SheetRow[]; cells:SheetCell[]; view:Record<string,unknown>; }
export interface PageSnapshot { id:string; pageId:string; takenAt:string; takenBy:string|null; content:SnapshotContent; }
export interface ChangedCell { rowId:string; columnId:string; columnName:string; before:unknown; after:unknown; }
export interface RevisionComparison { beforeId:string; afterId:string; addedRows:SheetRow[]; removedRows:SheetRow[]; changedCells:ChangedCell[]; }
