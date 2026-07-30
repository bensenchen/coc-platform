import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createColumn, updateColumn, deleteColumn, createRow, deleteRow, upsertCell } from '@/services/sheet.service';
import { updatePageMeta } from '@/services/page.service';
import type { Page } from '@/models/page.model';

// Broad invalidation: a cell/column/row change on any page can affect every
// sheet view that links through it (and the source data table), so refresh
// all of them. Cheap for this app's scale, and keeps linked views live.
function invAll(qc: ReturnType<typeof useQueryClient>) {
  qc.invalidateQueries({ queryKey: ['sheet-view'] });
  qc.invalidateQueries({ queryKey: ['sheet'] });
}

// Set (or clear) which page this sheet page links to. Pass null for a
// standalone sheet page.
export function useSetLinkedPage(sheetPage: Page) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (linkedId: string | null) => {
      const meta: Record<string, unknown> = { ...sheetPage.metadata };
      if (linkedId) meta.linkedDataPageId = linkedId;
      else delete meta.linkedDataPageId;
      return updatePageMeta(sheetPage.id, meta);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['pages', sheetPage.projectId] });
      qc.invalidateQueries({ queryKey: ['linkable-pages'] });
      invAll(qc);
    },
  });
}

export function useUpdateColumnOrder(sheetPage: Page) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (columnOrder: string[]) =>
      updatePageMeta(sheetPage.id, { ...sheetPage.metadata, columnOrder }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['pages', sheetPage.projectId] }),
  });
}

export function useUpdateRowOrder(sheetPage: Page) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (rowOrder: string[]) =>
      updatePageMeta(sheetPage.id, { ...sheetPage.metadata, rowOrder }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['pages', sheetPage.projectId] }),
  });
}

// Renames a column — works for own or inherited columns; an inherited
// rename writes through to wherever the column actually lives.
export function useRenameColumn() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) => updateColumn(id, { name }),
    onSuccess: () => invAll(qc),
  });
}

// Adds a column that belongs to THIS sheet page.
export function useAddColumn(sheetPageId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (name: string) => createColumn(sheetPageId, name),
    onSuccess: () => invAll(qc),
  });
}

export function useDeleteColumn() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteColumn(id),
    onSuccess: () => invAll(qc),
  });
}

// Adds a row that belongs to THIS sheet page.
export function useAddRow(sheetPageId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (canvasObjectId?: string) => createRow(sheetPageId, canvasObjectId),
    onSuccess: () => invAll(qc),
  });
}

export function useDeleteRow() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteRow(id),
    onSuccess: () => invAll(qc),
  });
}

export function useUpsertSheetCell() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ rowId, columnId, value }: { rowId: string; columnId: string; value: unknown }) =>
      upsertCell(rowId, columnId, value),
    onSuccess: () => invAll(qc),
  });
}
