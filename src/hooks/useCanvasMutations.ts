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
    mutationFn: ({ connectorId, patch }: { connectorId: string; patch: Partial<ConnectorAnchor> }) =>
      updateConnectorAnchor(connectorId, patch),
    onSuccess: () => invalidate(qc, pageId),
  });
}
