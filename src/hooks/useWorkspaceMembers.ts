import { useQuery } from '@tanstack/react-query';
import { listWorkspaceMembers, listWorkspaceInvitations } from '@/services/workspace.service';

export function useWorkspaceMembers(workspaceId: string | null) {
  return useQuery({
    queryKey: ['workspace-members', workspaceId],
    enabled: !!workspaceId,
    queryFn: () => listWorkspaceMembers(workspaceId!),
  });
}

export function useWorkspaceInvitations(workspaceId: string | null) {
  return useQuery({
    queryKey: ['workspace-invitations', workspaceId],
    enabled: !!workspaceId,
    queryFn: () => listWorkspaceInvitations(workspaceId!),
  });
}
