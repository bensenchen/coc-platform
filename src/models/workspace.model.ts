export type WorkspaceRole = 'admin' | 'editor' | 'viewer';

export interface Workspace {
  id: string;
  name: string;
  slug: string;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export interface WorkspaceMember {
  workspaceId: string;
  userId: string;
  role: WorkspaceRole;
  createdAt: string;
}
