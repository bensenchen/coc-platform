import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  createObject,
  updateObject,
  deleteObject,
  createConnector,
  type CreateObjectProps,
  type UpdateObjectPatch,
} from '@/services/canvas-object.service';
import type { AnchorPosition } from '@/models/canvas-object.model';

function invalidate(qc: ReturnType<typeof useQueryClient>, pageId: string) {
  qc.invalidateQueries({ queryKey: ['canvas', pageId] });
}

export function useCreateObject(pageId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (props: CreateObjectProps) => createObject(pageId, props),
    onSuccess: () => invalidate(qc, pageId),
  });
}

export function useUpdateObject(pageId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: UpdateObjectPatch }) => updateObject(id, patch),
    onSuccess: () => invalidate(qc, pageId),
  });
}

export function useDeleteObject(pageId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteObject(id),
    onSuccess: () => invalidate(qc, pageId),
  });
}

export function useCreateConnector(pageId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      sourceId,
      sourceAnchor,
      targetId,
      targetAnchor,
    }: {
      sourceId: string;
      sourceAnchor: AnchorPosition;
      targetId: string;
      targetAnchor: AnchorPosition;
    }) => createConnector(pageId, sourceId, sourceAnchor, targetId, targetAnchor),
    onSuccess: () => invalidate(qc, pageId),
  });
}
