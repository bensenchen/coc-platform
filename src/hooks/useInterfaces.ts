import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  listInterfaces,
  setConnectorInterface,
  updateInterface,
  type InterfaceRecord,
} from '@/services/interface.service';

export function useInterfaces(projectId: string | null) {
  return useQuery({
    queryKey: ['interfaces', projectId],
    enabled: !!projectId,
    queryFn: () => listInterfaces(projectId!),
  });
}
export function useSetConnectorInterface(pageId: string, projectId: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ connectorId, enabled }: { connectorId: string; enabled: boolean }) => {
      if (!projectId) throw new Error('A project is required');
      return setConnectorInterface(projectId, connectorId, enabled);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['canvas', pageId] });
      qc.invalidateQueries({ queryKey: ['interfaces', projectId] });
      qc.invalidateQueries({ queryKey: ['pages', projectId] });
    },
  });
}
export function useUpdateInterface(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      record,
      patch,
    }: {
      record: InterfaceRecord;
      patch: Parameters<typeof updateInterface>[1];
    }) => updateInterface(record, patch),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['interfaces', projectId] }),
  });
}
