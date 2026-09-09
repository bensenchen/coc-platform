import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  createObject,
  updateObject,
  deleteObject,
  createConnector,
  updateConnectorAnchor,
  type CreateObjectProps,
  type UpdateObjectPatch,
  type ConnectorEndpoint,
} from '@/services/canvas-object.service';
import type { ConnectorAnchor } from '@/models/canvas-object.model';
import { linkPhysicalObjectToDataRow } from '@/services/physical-data-link.service';
import type { CanvasData } from '@/hooks/useCanvasObjects';
import { queryKeys } from '@/lib/query-keys';

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
    mutationFn: ({ id, patch }: { id: string; patch: UpdateObjectPatch }) => {
      const object = qc.getQueryData<CanvasData>(queryKeys.canvas(pageId))?.objects.find((x) => x.id === id);
      return updateObject(id, patch, object?.updatedAt);
    },
    onMutate: async ({ id, patch }) => {
      await qc.cancelQueries({ queryKey: queryKeys.canvas(pageId) });
      const previous = qc.getQueryData<CanvasData>(queryKeys.canvas(pageId));
      qc.setQueryData<CanvasData>(queryKeys.canvas(pageId), (current) => current && ({
        ...current, objects: current.objects.map((object) => object.id === id ? { ...object, ...patch } : object),
      }));
      return { previous };
    },
    onError: (_error, _variables, context) => qc.setQueryData(queryKeys.canvas(pageId), context?.previous),
    onSettled: () => invalidate(qc, pageId),
  });
}

export function useDeleteObject(pageId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteObject(id),
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: queryKeys.canvas(pageId) });
      const previous = qc.getQueryData<CanvasData>(queryKeys.canvas(pageId));
      qc.setQueryData<CanvasData>(queryKeys.canvas(pageId), (current) => current && ({
        objects: current.objects.filter((object) => object.id !== id),
        anchors: current.anchors.filter((anchor) => anchor.connectorId !== id),
      }));
      return { previous };
    },
    onError: (_error, _id, context) => qc.setQueryData(queryKeys.canvas(pageId), context?.previous),
    onSettled: () => invalidate(qc, pageId),
  });
}

export function useCreateConnector(pageId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      source,
      target,
      metadata,
    }: {
      source: ConnectorEndpoint;
      target: ConnectorEndpoint;
      metadata?: Record<string, unknown>;
    }) => createConnector(pageId, source, target, metadata ?? {}),
    onSuccess: () => invalidate(qc, pageId),
  });
}

export function useUpdateAnchor(pageId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      connectorId,
      patch,
    }: {
      connectorId: string;
      patch: Partial<ConnectorAnchor>;
    }) => updateConnectorAnchor(connectorId, patch),
    onSuccess: () => invalidate(qc, pageId),
  });
}

export function useLinkPhysicalObject(pageId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ objectId, dataPageId }: { objectId: string; dataPageId: string }) =>
      linkPhysicalObjectToDataRow(objectId, dataPageId),
    onSuccess: (result) => {
      invalidate(qc, pageId);
      qc.invalidateQueries({ queryKey: ['sheet', result.dataPageId] });
      qc.invalidateQueries({ queryKey: ['physical-data-link', result.canvasObjectId] });
    },
  });
}
