import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/infrastructure/supabase/client';
import type { Project } from '@/models/project.model';

export function useProjects(workspaceId: string | null) {
  return useQuery({
    queryKey: ['projects', workspaceId],
    enabled: !!workspaceId,
    queryFn: async (): Promise<Project[]> => {
      const { data, error } = await supabase
        .from('project')
        .select('*')
        .eq('workspace_id', workspaceId!)
        .is('deleted_at', null)
        .order('created_at', { ascending: true });
      if (error) throw error;
      return (data ?? []).map((row: any) => ({
        id: row.id, workspaceId: row.workspace_id, name: row.name, slug: row.slug,
        createdBy: row.created_by, createdAt: row.created_at,
        updatedAt: row.updated_at, deletedAt: row.deleted_at,
      }));
    },
  });
}
