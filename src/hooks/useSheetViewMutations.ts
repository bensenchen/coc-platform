import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createColumn, deleteColumn, createRow, deleteRow, upsertCell } from '@/services/sheet.service';
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
