import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/infrastructure/supabase/client';
import { useAuth } from './useAuth';
import type { ProjectRole } from '@/lib/permissions';
import type { WorkspaceRole } from '@/models/workspace.model';

export function useAccess(workspaceId?: string | null, projectId?: string | null) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['access', user?.id, workspaceId, projectId],
    enabled: !!user && !!workspaceId,
    queryFn: async () => {
      const [workspace, project] = await Promise.all([
        supabase.from('workspace_member').select('role').eq('workspace_id', workspaceId!).eq('user_id', user!.id).maybeSingle(),
        projectId ? supabase.from('project_member').select('role').eq('project_id', projectId).eq('user_id', user!.id).maybeSingle() : Promise.resolve({ data: null, error: null }),
      ]);
      if (workspace.error) throw workspace.error;
      if (project.error) throw project.error;
      return { workspaceRole: workspace.data?.role as WorkspaceRole | undefined, projectRole: project.data?.role as ProjectRole | undefined };
    },
  });
}
