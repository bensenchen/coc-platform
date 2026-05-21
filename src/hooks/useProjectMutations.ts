import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createProject, renameProject, deleteProject } from '@/services/project.service';

export function useCreateProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ workspaceId, name }: { workspaceId: string; name: string }) =>
      createProject(workspaceId, name),
    onSuccess: (_, vars) => qc.invalidateQueries({ queryKey: ['projects', vars.workspaceId] }),
  });
}

export function useRenameProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) => renameProject(id, name),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['projects'] }),
  });
}

export function useDeleteProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteProject(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['projects'] }),
  });
}
