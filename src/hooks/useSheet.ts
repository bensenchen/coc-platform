import { useQuery } from '@tanstack/react-query';
import { listColumns, listRows, listCellsForPage } from '@/services/sheet.service';

export interface SheetData {
  columns: Awaited<ReturnType<typeof listColumns>>;
  rows: Awaited<ReturnType<typeof listRows>>;
  cells: Record<string, Record<string, unknown>>;
}

export function useSheet(pageId: string) {
  return useQuery<SheetData>({
    queryKey: ['sheet', pageId],
    queryFn: async () => {
      const [columns, rows, rawCells] = await Promise.all([
        listColumns(pageId),
        listRows(pageId),
        listCellsForPage(pageId),
      ]);

      const cells: Record<string, Record<string, unknown>> = {};
      rawCells.forEach((c) => {
        if (!cells[c.rowId]) cells[c.rowId] = {};
        cells[c.rowId]![c.columnId] = c.value;
      });

      return { columns, rows, cells };
    },
    enabled: !!pageId,
  });
}
