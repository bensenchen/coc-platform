import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createPage, renamePage, deletePage } from '@/services/page.service';
import type { PageKind } from '@/models/page.model';

export function useCreatePage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ projectId, kind, title }: { projectId: string; kind: PageKind; title: string }) =>
      createPage(projectId, kind, title),
    onSuccess: (_, vars) => qc.invalidateQueries({ queryKey: ['pages', vars.projectId] }),
  });
}

export function useRenamePage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, title }: { id: string; title: string }) => renamePage(id, title),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['pages'] }),
  });
}

export function useDeletePage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deletePage(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['pages'] }),
  });
}
