import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/infrastructure/supabase/client';
import type { Workspace } from '@/models/workspace.model';

export function useWorkspaces() {
  return useQuery({
    queryKey: ['workspaces'],
    queryFn: async (): Promise<Workspace[]> => {
      const { data, error } = await supabase
        .from('workspace')
        .select('*')
        .is('deleted_at', null)
        .order('created_at', { ascending: true });
      if (error) throw error;
      return (data ?? []).map((row: any) => ({
        id: row.id, name: row.name, slug: row.slug,
        createdBy: row.created_by, createdAt: row.created_at,
        updatedAt: row.updated_at, deletedAt: row.deleted_at,
      }));
    },
  });
}
