import { useQuery } from '@tanstack/react-query';
import { listProjects } from '@/services/domain-query.service';

export function useProjects(workspaceId: string | null) {
  return useQuery({
    queryKey: ['projects', workspaceId],
    enabled: !!workspaceId,
    queryFn: () => listProjects(workspaceId!),
  });
}
