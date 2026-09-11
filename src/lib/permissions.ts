import type { User } from '@supabase/supabase-js';
import type { WorkspaceRole } from '@/models/workspace.model';

export type ProjectRole = 'project_editor' | 'commenter' | 'viewer';

export function isSystemAdmin(user: User | null) {
  return user?.app_metadata?.system_role === 'system_admin';
}

export function canAdminWorkspace(role?: WorkspaceRole) {
  return role === 'workspace_admin';
}

export function canEditProject(workspaceRole?: WorkspaceRole, projectRole?: ProjectRole) {
  return workspaceRole === 'workspace_admin' || projectRole === 'project_editor';
}

export function canComment(workspaceRole?: WorkspaceRole, projectRole?: ProjectRole) {
  return canEditProject(workspaceRole, projectRole) || projectRole === 'commenter';
}
