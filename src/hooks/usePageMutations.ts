import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createPage, renamePage, deletePage } from '@/services/page.service';
import type { Page, PageKind } from '@/models/page.model';

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
    mutationFn: ({ id, title }: { id: string; title: string }) => {
      const page = qc.getQueriesData<Page[]>({ queryKey: ['pages'] })
        .flatMap(([, pages]) => pages ?? []).find((candidate) => candidate.id === id);
      return renamePage(id, title, page?.updatedAt);
    },
    onMutate: async ({ id, title }) => {
      await qc.cancelQueries({ queryKey: ['pages'] });
      const previous = qc.getQueriesData<Page[]>({ queryKey: ['pages'] });
      qc.setQueriesData<Page[]>({ queryKey: ['pages'] }, (pages) =>
        pages?.map((page) => page.id === id ? { ...page, title } : page));
      return { previous };
    },
    onError: (_error, _variables, context) => context?.previous.forEach(([key, pages]) => qc.setQueryData(key, pages)),
    onSettled: () => qc.invalidateQueries({ queryKey: ['pages'] }),
  });
}

export function useDeletePage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deletePage(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['pages'] }),
  });
}
