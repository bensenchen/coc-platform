export type ColumnDataType = 'text' | 'number' | 'boolean' | 'date' | 'link';

export interface CellFormat {
  bold?: boolean;
  italic?: boolean;
  color?: string;
  bg?: string;
}

export interface SheetColumn {
  id: string;
  pageId: string;
  name: string;
  position: number;
  dataType: ColumnDataType;
  isDefault: boolean;
  format: CellFormat;
}

export interface SheetRow {
  id: string;
  pageId: string;
  position: number;
  canvasObjectId: string | null;
  format: CellFormat;
}

export interface SheetCell {
  rowId: string;
  columnId: string;
  value: unknown;
  format: CellFormat;
}
