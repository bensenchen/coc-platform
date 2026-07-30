import { useQuery } from '@tanstack/react-query';
import { listColumns, listRows, listCellsForPage } from '@/services/sheet.service';
import { listPages } from '@/services/page.service';
import type { SheetColumn, SheetRow } from '@/models/sheet.model';
import type { Page } from '@/models/page.model';

export interface ComposedSheetData {
  columns: SheetColumn[];
  rows: SheetRow[];
  cells: Record<string, Record<string, unknown>>;
}

const MAX_CHAIN = 20;

function linkedIdOf(p: Page): string | null {
  return (p.metadata?.linkedDataPageId as string | undefined) ?? null;
}

// Follow the link chain from `startId` up to its root, returned root-first
// so inherited columns/rows appear before the pages that build on them.
// Guards against cycles (visited set) and runaway depth (MAX_CHAIN).
function resolveChain(startId: string, byId: Map<string, Page>): Page[] {
  const stack: Page[] = [];
  const visited = new Set<string>();
  let cur: Page | undefined = byId.get(startId);
  while (cur && !visited.has(cur.id) && stack.length < MAX_CHAIN) {
    visited.add(cur.id);
    stack.push(cur);
    const next = linkedIdOf(cur);
    cur = next ? byId.get(next) : undefined;
  }
  return stack.reverse(); // root first, current page last
}

// The full composed view of a sheet/MGMT page: every column, row and cell
// from its whole link chain (root data/sheet page → … → this page), merged.
export function useSheetView(sheetPageId: string, projectId: string) {
  return useQuery<ComposedSheetData>({
    queryKey: ['sheet-view', sheetPageId, projectId],
    enabled: !!sheetPageId && !!projectId,
    queryFn: async () => {
      const pages = await listPages(projectId);
      const byId = new Map(pages.map((p) => [p.id, p]));
      const chain = resolveChain(sheetPageId, byId);

      const perPage = await Promise.all(
        chain.map(async (p) => {
          const [columns, rows, cellList] = await Promise.all([
            listColumns(p.id),
            listRows(p.id),
            listCellsForPage(p.id),
          ]);
          return { columns, rows, cellList };
        }),
      );

      const columns: SheetColumn[] = perPage.flatMap((x) => x.columns);
      const rows: SheetRow[] = perPage.flatMap((x) => x.rows);
      const cells: Record<string, Record<string, unknown>> = {};
      perPage.flatMap((x) => x.cellList).forEach((c) => {
        if (!cells[c.rowId]) cells[c.rowId] = {};
        cells[c.rowId]![c.columnId] = c.value;
      });

      return { columns, rows, cells };
    },
  });
}

// Pages this sheet page may link to: data + other sheet pages, excluding
// itself and any page whose own chain already passes through this page
// (which would create a cycle).
export function useLinkablePages(sheetPageId: string, projectId: string) {
  return useQuery<Page[]>({
    queryKey: ['linkable-pages', sheetPageId, projectId],
    enabled: !!projectId,
    queryFn: async () => {
      const pages = await listPages(projectId);
      const byId = new Map(pages.map((p) => [p.id, p]));

      const reachesSelf = (startId: string): boolean => {
        const visited = new Set<string>();
        let cur: Page | undefined = byId.get(startId);
        let depth = 0;
        while (cur && !visited.has(cur.id) && depth < MAX_CHAIN) {
          if (cur.id === sheetPageId) return true;
          visited.add(cur.id);
          const next = linkedIdOf(cur);
          cur = next ? byId.get(next) : undefined;
          depth++;
        }
        return false;
      };

      return pages.filter(
        (p) =>
          p.id !== sheetPageId &&
          (p.kind === 'data' || p.kind === 'sheet') &&
          !reachesSelf(p.id),
      );
    },
  });
}
