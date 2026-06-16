import { useQuery } from '@tanstack/react-query';
import { listColumns, listRows, listCellsForPage } from '@/services/sheet.service';
import { listPages } from '@/services/page.service';
import type { SheetColumn, SheetRow } from '@/models/sheet.model';

export interface MergedSheetData {
  dataPageColumns: SheetColumn[];
  mgmtColumns: SheetColumn[];
  dataPageRows: SheetRow[];
  mgmtRows: SheetRow[];
  cells: Record<string, Record<string, unknown>>;
}

export function useSheetView(sheetPageId: string, linkedDataPageId: string | null) {
  return useQuery<MergedSheetData>({
    queryKey: ['sheet-view', sheetPageId, linkedDataPageId],
    queryFn: async () => {
      const [mgmtColumns, mgmtRows] = await Promise.all([
        listColumns(sheetPageId),
        listRows(sheetPageId),
      ]);

      if (!linkedDataPageId) {
        return { dataPageColumns: [], mgmtColumns, dataPageRows: [], mgmtRows, cells: {} };
      }

      const [dataColumns, dataRows, dataCells, mgmtCells] = await Promise.all([
        listColumns(linkedDataPageId),
        listRows(linkedDataPageId),
        listCellsForPage(linkedDataPageId),
        listCellsForPage(sheetPageId),
      ]);

      const cells: Record<string, Record<string, unknown>> = {};
      [...dataCells, ...mgmtCells].forEach((c) => {
        if (!cells[c.rowId]) cells[c.rowId] = {};
        cells[c.rowId]![c.columnId] = c.value;
      });

      return { dataPageColumns: dataColumns, mgmtColumns, dataPageRows: dataRows, mgmtRows, cells };
    },
    enabled: !!sheetPageId,
  });
}

export function useProjectDataPages(projectId: string) {
  return useQuery({
    queryKey: ['pages', projectId],
    queryFn: () => listPages(projectId),
    select: (pages) => pages.filter((p) => p.kind === 'data'),
    enabled: !!projectId,
  });
}
