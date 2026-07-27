import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createColumn, updateColumn, deleteColumn, createRow, deleteRow, upsertCell } from '@/services/sheet.service';
import { updatePageMeta } from '@/services/page.service';
import type { Page } from '@/models/page.model';

function inv(qc: ReturnType<typeof useQueryClient>, sheetPageId: string, linkedDataPageId: string | null) {
  qc.invalidateQueries({ queryKey: ['sheet-view', sheetPageId] });
  if (linkedDataPageId) qc.invalidateQueries({ queryKey: ['sheet', linkedDataPageId] });
}

export function useLinkDataPage(sheetPage: Page) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dataPageId: string) =>
      updatePageMeta(sheetPage.id, { ...sheetPage.metadata, linkedDataPageId: dataPageId }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['pages', sheetPage.projectId] });
      qc.invalidateQueries({ queryKey: ['sheet-view', sheetPage.id] });
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

// Renames a column — works for both data page columns and mgmt columns,
// since a data column rename writes through to the source page.
export function useRenameSheetColumn(sheetPageId: string, linkedDataPageId: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) => updateColumn(id, { name }),
    onSuccess: () => inv(qc, sheetPageId, linkedDataPageId),
  });
}

export function useAddMgmtColumn(sheetPageId: string, linkedDataPageId: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (name: string) => createColumn(sheetPageId, name),
    onSuccess: () => inv(qc, sheetPageId, linkedDataPageId),
  });
}

export function useDeleteMgmtColumn(sheetPageId: string, linkedDataPageId: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteColumn(id),
    onSuccess: () => inv(qc, sheetPageId, linkedDataPageId),
  });
}

export function useAddMgmtRow(sheetPageId: string, linkedDataPageId: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (canvasObjectId: string | undefined) => createRow(sheetPageId, canvasObjectId),
    onSuccess: () => inv(qc, sheetPageId, linkedDataPageId),
  });
}

export function useDeleteMgmtRow(sheetPageId: string, linkedDataPageId: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteRow(id),
    onSuccess: () => inv(qc, sheetPageId, linkedDataPageId),
  });
}

export function useUpsertSheetCell(sheetPageId: string, linkedDataPageId: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ rowId, columnId, value }: { rowId: string; columnId: string; value: unknown }) =>
      upsertCell(rowId, columnId, value),
    onSuccess: () => inv(qc, sheetPageId, linkedDataPageId),
  });
}
