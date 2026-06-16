import { useQuery } from '@tanstack/react-query';
import { listColumns, listRows, listCellsForPage } from '@/services/sheet.service';
import type { SheetColumn, SheetRow } from '@/models/sheet.model';

export interface SheetData {
  columns: SheetColumn[];
  rows: SheetRow[];
  cells: Record<string, Record<string, unknown>>; // cells[rowId][colId] = value
}

export function useSheet(pageId: string | null) {
  return useQuery<SheetData>({
    queryKey: ['sheet', pageId],
    enabled: !!pageId,
    queryFn: async () => {
      const [columns, rows, rawCells] = await Promise.all([
        listColumns(pageId!),
        listRows(pageId!),
        listCellsForPage(pageId!),
      ]);
      const cells: Record<string, Record<string, unknown>> = {};
      rows.forEach((r) => { cells[r.id] = {}; });
      rawCells.forEach((c) => {
        if (!cells[c.rowId]) cells[c.rowId] = {};
        cells[c.rowId][c.columnId] = c.value;
      });
      return { columns, rows, cells };
    },
  });
}
