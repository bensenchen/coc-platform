import { supabase } from '@/infrastructure/supabase/client';
import type { Database } from '@/infrastructure/supabase/database.types';
import type { Project } from '@/models/project.model';
import type { Workspace } from '@/models/workspace.model';

type WorkspaceRow = Database['public']['Tables']['workspace']['Row'];
type ProjectRow = Database['public']['Tables']['project']['Row'];

const workspaceFromRow = (row: WorkspaceRow): Workspace => ({
  id: row.id, name: row.name, slug: row.slug, createdBy: row.created_by,
  createdAt: row.created_at, updatedAt: row.updated_at, deletedAt: row.deleted_at,
});
const projectFromRow = (row: ProjectRow): Project => ({
  id: row.id, workspaceId: row.workspace_id, name: row.name, slug: row.slug,
  createdBy: row.created_by, createdAt: row.created_at, updatedAt: row.updated_at, deletedAt: row.deleted_at,
});

/** Typed application query boundary. Only service adapters may know about database rows. */
export async function listWorkspaces(): Promise<Workspace[]> {
  const { data, error } = await supabase.from('workspace').select('*').is('deleted_at', null).order('created_at');
  if (error) throw error;
  return data.map(workspaceFromRow);
}

export async function listProjects(workspaceId: string): Promise<Project[]> {
  const { data, error } = await supabase.from('project').select('*').eq('workspace_id', workspaceId).is('deleted_at', null).order('created_at');
  if (error) throw error;
  return data.map(projectFromRow);
}

