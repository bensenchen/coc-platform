import { supabase } from '@/infrastructure/supabase/client';

export type ReferenceSearchResult = {
  entityType: 'page' | 'object';
  entityId: string;
  title: string;
  context: string;
  urlKey: string;
};

export async function searchProjectReferences(projectId: string, query: string) {
  const { data, error } = await supabase.rpc('search_project_entities', {
    p_project_id: projectId,
    p_query: query,
  });
  if (error) throw error;
  return (data ?? []).map((item) => ({
    entityType: item.entity_type,
    entityId: item.entity_id,
    title: item.title,
    context: item.context,
    urlKey: item.url_key,
  })) as ReferenceSearchResult[];
}

export async function resolveReferenceUrl(urlKey: string) {
  const { data, error } = await supabase.rpc('resolve_entity_url', { p_url_key: urlKey });
  if (error) throw error;
  return data?.[0] ?? null;
}
