import { supabase } from '@/infrastructure/supabase/client';
import type { Page, PageKind } from '@/models/page.model';

function mapPage(row: any): Page {
  return {
    id: row.id, projectId: row.project_id, kind: row.kind,
    title: row.title, position: row.position, metadata: row.metadata ?? {},
    createdBy: row.created_by, createdAt: row.created_at,
    updatedAt: row.updated_at, deletedAt: row.deleted_at,
  };
}

export async function listPages(projectId: string): Promise<Page[]> {
  const { data, error } = await supabase
    .from('page').select('*')
    .eq('project_id', projectId)
    .is('deleted_at', null)
    .order('position', { ascending: true })
    .order('created_at', { ascending: true });
  if (error) throw error;
  return (data ?? []).map(mapPage);
}

export async function createPage(
  projectId: string,
  kind: PageKind,
  title: string,
): Promise<Page> {
  if (kind === 'interface_list') {
    const { data: existing } = await supabase
      .from('page').select('id')
      .eq('project_id', projectId).eq('kind', 'interface_list')
      .is('deleted_at', null).maybeSingle();
    if (existing) throw new Error('List of Interfaces already exists for this project');
  }

  const { data: { user } } = await supabase.auth.getUser();
  const { data, error } = await supabase
    .from('page')
    .insert({ project_id: projectId, kind, title, created_by: user?.id })
    .select().single();
  if (error) throw error;
  const page = mapPage(data);

  // Seed default columns based on kind
  if (kind === 'data') {
    await supabase.from('sheet_column').insert([
      { page_id: page.id, name: 'Level', position: 0, data_type: 'text', is_default: true },
      { page_id: page.id, name: 'Name', position: 1, data_type: 'text', is_default: true },
    ]);
  } else if (kind === 'sheet') {
    await supabase.from('sheet_column').insert([
      { page_id: page.id, name: 'Item', position: 0, data_type: 'text', is_default: true },
      { page_id: page.id, name: 'Link', position: 1, data_type: 'link', is_default: true },
    ]);
  } else if (kind === 'interface_list') {
    await supabase.from('sheet_column').insert([
      { page_id: page.id, name: 'ICD ID', position: 0, data_type: 'text', is_default: true },
      { page_id: page.id, name: 'Source',  position: 1, data_type: 'text', is_default: true },
      { page_id: page.id, name: 'Target',  position: 2, data_type: 'text', is_default: true },
    ]);
  }

  return page;
}

export async function renamePage(id: string, title: string): Promise<Page> {
  const { data, error } = await supabase
    .from('page').update({ title }).eq('id', id).select().single();
  if (error) throw error;
  return mapPage(data);
}

export async function deletePage(id: string): Promise<void> {
  const { error } = await supabase
    .from('page').update({ deleted_at: new Date().toISOString() }).eq('id', id);
  if (error) throw error;
}
