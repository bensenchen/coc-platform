import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createColumn, updateColumn, deleteColumn, createRow, deleteRow, upsertCell } from '@/services/sheet.service';
import type { ColumnDataType } from '@/models/sheet.model';

function inv(qc: ReturnType<typeof useQueryClient>, pageId: string) {
  qc.invalidateQueries({ queryKey: ['sheet', pageId] });
}

export function useCreateColumn(pageId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ name, dataType }: { name: string; dataType?: ColumnDataType }) => createColumn(pageId, name, dataType),
    onSuccess: () => inv(qc, pageId),
  });
}

export function useUpdateColumn(pageId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: { name?: string; dataType?: ColumnDataType } }) => updateColumn(id, patch),
    onSuccess: () => inv(qc, pageId),
  });
}

export function useDeleteColumn(pageId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteColumn(id),
    onSuccess: () => inv(qc, pageId),
  });
}

export function useCreateRow(pageId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (canvasObjectId?: string) => createRow(pageId, canvasObjectId),
    onSuccess: () => inv(qc, pageId),
  });
}

export function useDeleteRow(pageId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteRow(id),
    onSuccess: () => inv(qc, pageId),
  });
}

export function useUpsertCell(pageId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ rowId, columnId, value }: { rowId: string; columnId: string; value: unknown }) => upsertCell(rowId, columnId, value),
    onSuccess: () => inv(qc, pageId),
  });
}
