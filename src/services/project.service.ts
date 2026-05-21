import { supabase } from '@/infrastructure/supabase/client';
import { slugify } from '@/lib/slug';
import type { Project } from '@/models/project.model';

function mapProject(row: any): Project {
  return {
    id: row.id, workspaceId: row.workspace_id, name: row.name, slug: row.slug,
    createdBy: row.created_by, createdAt: row.created_at,
    updatedAt: row.updated_at, deletedAt: row.deleted_at,
  };
}

export async function createProject(workspaceId: string, name: string): Promise<Project> {
  const { data: { user } } = await supabase.auth.getUser();
  const baseSlug = slugify(name) || 'project';
  let slug = baseSlug;
  let attempt = 1;
  while (attempt < 100) {
    const { data, error } = await supabase
      .from('project')
      .insert({ workspace_id: workspaceId, name, slug, created_by: user?.id })
      .select().single();
    if (!error) return mapProject(data);
    if (error.code === '23505') { attempt++; slug = `${baseSlug}-${attempt}`; continue; }
    throw error;
  }
  throw new Error('Could not generate a unique slug');
}

export async function renameProject(id: string, name: string): Promise<Project> {
  const { data, error } = await supabase
    .from('project').update({ name }).eq('id', id).select().single();
  if (error) throw error;
  return mapProject(data);
}

export async function deleteProject(id: string): Promise<void> {
  const { error } = await supabase
    .from('project').update({ deleted_at: new Date().toISOString() }).eq('id', id);
  if (error) throw error;
}
