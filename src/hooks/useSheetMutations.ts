import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  createColumn,
  updateColumn,
  deleteColumn,
  createRow,
  deleteRow,
  upsertCell,
  reorderColumns,
  reorderRows,
} from '@/services/sheet.service';
import {
  createDataRowWithPhysicalObject,
  deleteDataRowRelationship,
} from '@/services/physical-data-link.service';
import type { SheetData } from '@/hooks/useSheet';
import { queryKeys } from '@/lib/query-keys';

function inv(qc: ReturnType<typeof useQueryClient>, pageId: string) {
  qc.invalidateQueries({ queryKey: ['sheet', pageId] });
}

export function useCreateColumn(pageId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (name: string) => createColumn(pageId, name),
    onSuccess: () => inv(qc, pageId),
  });
}

export function useUpdateColumn(pageId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Parameters<typeof updateColumn>[1] }) =>
      updateColumn(id, patch),
    onMutate: async ({ id, patch }) => {
      await qc.cancelQueries({ queryKey: queryKeys.sheet(pageId) });
      const previous = qc.getQueryData<SheetData>(queryKeys.sheet(pageId));
      qc.setQueryData<SheetData>(queryKeys.sheet(pageId), (current) => current && ({ ...current,
        columns: current.columns.map((column) => column.id === id ? { ...column, ...patch } : column),
      }));
      return { previous };
    },
    onError: (_error, _variables, context) => qc.setQueryData(queryKeys.sheet(pageId), context?.previous),
    onSettled: () => inv(qc, pageId),
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
    mutationFn: (canvasObjectId: string | undefined) => createRow(pageId, canvasObjectId),
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

export function useReorderColumns(pageId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (orderedIds: string[]) => reorderColumns(orderedIds),
    onSuccess: () => inv(qc, pageId),
  });
}

export function useReorderRows(pageId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (orderedIds: string[]) => reorderRows(orderedIds),
    onSuccess: () => inv(qc, pageId),
  });
}

export function useUpsertCell(pageId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ rowId, columnId, value }: { rowId: string; columnId: string; value: unknown }) =>
      upsertCell(rowId, columnId, value),
    onMutate: async ({ rowId, columnId, value }) => {
      await qc.cancelQueries({ queryKey: queryKeys.sheet(pageId) });
      const previous = qc.getQueryData<SheetData>(queryKeys.sheet(pageId));
      qc.setQueryData<SheetData>(queryKeys.sheet(pageId), (current) => current && ({ ...current,
        cells: { ...current.cells, [rowId]: { ...current.cells[rowId], [columnId]: value } },
      }));
      return { previous };
    },
    onError: (_error, _variables, context) => qc.setQueryData(queryKeys.sheet(pageId), context?.previous),
    onSettled: () => inv(qc, pageId),
  });
}

export function useCreateLinkedPhysicalRow(pageId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: {
      contextPageId?: string;
      newContextTitle?: string;
      objectName?: string;
    }) => createDataRowWithPhysicalObject({ ...input, dataPageId: pageId }),
    onSuccess: (result) => {
      inv(qc, pageId);
      qc.invalidateQueries({ queryKey: ['canvas', result.contextPageId] });
      qc.invalidateQueries({ queryKey: ['pages'] });
    },
  });
}

export function useDeleteLinkedRow(pageId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ rowId, deleteCanvasObject }: { rowId: string; deleteCanvasObject: boolean }) =>
      deleteDataRowRelationship(rowId, deleteCanvasObject),
    onSuccess: (result) => {
      inv(qc, pageId);
      if (result?.canvas_object_id) {
        qc.invalidateQueries({ queryKey: ['canvas'] });
        qc.invalidateQueries({ queryKey: ['physical-data-link', result.canvas_object_id] });
      }
    },
  });
}
