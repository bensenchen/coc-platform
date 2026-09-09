import { useQuery } from '@tanstack/react-query';
import { listWorkspaces } from '@/services/domain-query.service';

export function useWorkspaces() {
  return useQuery({
    queryKey: ['workspaces'],
    queryFn: listWorkspaces,
  });
}
