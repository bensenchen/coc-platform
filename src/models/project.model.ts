export type ProjectRole = 'admin' | 'editor' | 'viewer';

export interface Project {
  id: string;
  workspaceId: string;
  name: string;
  slug: string;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}
