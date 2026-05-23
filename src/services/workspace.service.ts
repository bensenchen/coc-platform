import { supabase } from '@/infrastructure/supabase/client';
import type { Workspace, WorkspaceRole } from '@/models/workspace.model';
import type { WorkspaceInvitation } from '@/models/invitation.model';

function mapWorkspace(row: any): Workspace {
  return {
    id: row.id, name: row.name, slug: row.slug,
    createdBy: row.created_by, createdAt: row.created_at,
    updatedAt: row.updated_at, deletedAt: row.deleted_at,
  };
}

function mapInvitation(row: any): WorkspaceInvitation {
  return {
    id: row.id, workspaceId: row.workspace_id, email: row.email,
    role: row.role, status: row.status, invitedBy: row.invited_by,
    createdAt: row.created_at, acceptedAt: row.accepted_at,
  };
}

export interface WorkspaceMemberView {
  workspaceId: string;
  userId: string;
  role: WorkspaceRole;
  createdAt: string;
}

export async function createWorkspace(name: string): Promise<Workspace> {
  const { data, error } = await supabase.rpc('create_workspace_for_user', {
    workspace_name: name,
  });
  if (error) throw error;
  return mapWorkspace(data);
}

export async function renameWorkspace(id: string, name: string): Promise<Workspace> {
  const { data, error } = await supabase
    .from('workspace').update({ name }).eq('id', id).select().single();
  if (error) throw error;
  return mapWorkspace(data);
}

export async function deleteWorkspace(id: string): Promise<void> {
  const { error } = await supabase
    .from('workspace').update({ deleted_at: new Date().toISOString() }).eq('id', id);
  if (error) throw error;
}

export async function listWorkspaceMembers(workspaceId: string): Promise<WorkspaceMemberView[]> {
  const { data, error } = await supabase
    .from('workspace_member')
    .select('workspace_id, user_id, role, created_at')
    .eq('workspace_id', workspaceId);
  if (error) throw error;
  return (data ?? []).map((row: any) => ({
    workspaceId: row.workspace_id, userId: row.user_id,
    role: row.role, createdAt: row.created_at,
  }));
}

export async function listWorkspaceInvitations(workspaceId: string): Promise<WorkspaceInvitation[]> {
  const { data, error } = await supabase
    .from('workspace_invitation')
    .select('*')
    .eq('workspace_id', workspaceId)
    .eq('status', 'pending');
  if (error) throw error;
  return (data ?? []).map(mapInvitation);
}

export async function inviteMember(workspaceId: string, email: string, role: WorkspaceRole = 'editor') {
  const { data: { user } } = await supabase.auth.getUser();
  const { error } = await supabase
    .from('workspace_invitation')
    .insert({
      workspace_id: workspaceId,
      email: email.toLowerCase().trim(),
      role,
      invited_by: user?.id,
    });
  if (error) throw error;
}

export async function revokeInvitation(invitationId: string) {
  const { error } = await supabase
    .from('workspace_invitation').update({ status: 'revoked' }).eq('id', invitationId);
  if (error) throw error;
}

export async function removeMember(workspaceId: string, userId: string) {
  const { error } = await supabase
    .from('workspace_member').delete()
    .eq('workspace_id', workspaceId).eq('user_id', userId);
  if (error) throw error;
}

export async function acceptMyInvitations(): Promise<number> {
  const { data, error } = await supabase.rpc('accept_my_invitations');
  if (error) throw error;
  return data ?? 0;
}
