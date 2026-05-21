import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  createWorkspace, renameWorkspace, deleteWorkspace,
  inviteMember, removeMember, revokeInvitation, acceptMyInvitations,
} from '@/services/workspace.service';
import type { WorkspaceRole } from '@/models/workspace.model';

export function useCreateWorkspace() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (name: string) => createWorkspace(name),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['workspaces'] }),
  });
}

export function useRenameWorkspace() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) => renameWorkspace(id, name),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['workspaces'] }),
  });
}

export function useDeleteWorkspace() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteWorkspace(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['workspaces'] }),
  });
}

export function useInviteMember() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ workspaceId, email, role }: { workspaceId: string; email: string; role?: WorkspaceRole }) =>
      inviteMember(workspaceId, email, role),
    onSuccess: (_, vars) => qc.invalidateQueries({ queryKey: ['workspace-invitations', vars.workspaceId] }),
  });
}

export function useRemoveMember() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ workspaceId, userId }: { workspaceId: string; userId: string }) =>
      removeMember(workspaceId, userId),
    onSuccess: (_, vars) => qc.invalidateQueries({ queryKey: ['workspace-members', vars.workspaceId] }),
  });
}

export function useRevokeInvitation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (invitationId: string) => revokeInvitation(invitationId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['workspace-invitations'] }),
  });
}

export function useAcceptMyInvitations() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => acceptMyInvitations(),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['workspaces'] }),
  });
}
