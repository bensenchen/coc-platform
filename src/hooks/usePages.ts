import { useQuery } from '@tanstack/react-query';
import { listPages } from '@/services/page.service';

export function usePages(projectId: string | null) {
  return useQuery({
    queryKey: ['pages', projectId],
    enabled: !!projectId,
    queryFn: () => listPages(projectId!),
  });
}
