import { supabase } from '@/infrastructure/supabase/client';
import type { Interface } from '@/models/interface.model';
import { updateObject } from './canvas-object.service';

export interface InterfaceRecord extends Interface {
  contextPageId: string;
  connectorName: string | null;
  sys1: string;
  sys2: string;
  type: string;
  description: string;
  specification: string;
}

export async function listInterfaces(projectId: string): Promise<InterfaceRecord[]> {
  const { data: links, error } = await supabase
    .from('interface')
    .select('*')
    .eq('project_id', projectId)
    .eq('hidden', false)
    .order('display_id');
  if (error) throw error;
  const result: InterfaceRecord[] = [];
  for (const link of links ?? []) {
    const { data: connector } = await supabase
      .from('canvas_object')
      .select('*')
      .eq('id', link.connector_id)
      .is('deleted_at', null)
      .maybeSingle();
    if (!connector) continue;
    const { data: anchor } = await supabase
      .from('connector_anchor')
      .select('*')
      .eq('connector_id', connector.id)
      .maybeSingle();
    const ids = [anchor?.source_object_id, anchor?.target_object_id].filter(Boolean) as string[];
    const { data: endpoints } = ids.length
      ? await supabase.from('canvas_object').select('id,name').in('id', ids)
      : { data: [] as any[] };
    const names = new Map((endpoints ?? []).map((x: any) => [x.id, x.name || 'Unnamed system']));
    const meta = (connector.metadata ?? {}) as Record<string, unknown>;
    result.push({
      id: link.id,
      projectId: link.project_id,
      connectorId: link.connector_id,
      displayId: link.display_id,
      icdPageId: link.icd_page_id,
      hidden: link.hidden,
      contextPageId: connector.page_id,
      connectorName: connector.name,
      sys1: names.get(anchor?.source_object_id) ?? 'Unconnected',
      sys2: names.get(anchor?.target_object_id) ?? 'Unconnected',
      type: String(meta.interfaceType ?? meta.pathKind ?? 'Connection'),
      description: String(meta.description ?? connector.name ?? ''),
      specification: String(meta.specification ?? ''),
    });
  }
  return result;
}

async function nextDisplayId(projectId: string): Promise<string> {
  const { data } = await supabase
    .from('interface')
    .select('display_id')
    .eq('project_id', projectId);
  const used = new Set((data ?? []).map((x: any) => x.display_id));
  let n = 1;
  while (used.has(`IF-${String(n).padStart(3, '0')}`)) n++;
  return `IF-${String(n).padStart(3, '0')}`;
}

export async function setConnectorInterface(
  projectId: string,
  connectorId: string,
  enabled: boolean,
) {
  const { data: connector, error: connectorError } = await supabase
    .from('canvas_object')
    .select('*')
    .eq('id', connectorId)
    .single();
  if (connectorError) throw connectorError;
  const currentMeta =
    connector.metadata &&
    typeof connector.metadata === 'object' &&
    !Array.isArray(connector.metadata)
      ? connector.metadata
      : {};
  const meta = { ...currentMeta, isInterface: enabled };
  await updateObject(connectorId, { metadata: meta });
  const { data: existing } = await supabase
    .from('interface')
    .select('*')
    .eq('connector_id', connectorId)
    .maybeSingle();
  if (!enabled) {
    if (existing) {
      await supabase.from('interface').update({ hidden: true }).eq('id', existing.id);
      if (existing.icd_page_id)
        await supabase
          .from('page')
          .update({ deleted_at: new Date().toISOString() })
          .eq('id', existing.icd_page_id);
    }
    return;
  }
  if (existing) {
    await supabase.from('interface').update({ hidden: false }).eq('id', existing.id);
    if (existing.icd_page_id)
      await supabase.from('page').update({ deleted_at: null }).eq('id', existing.icd_page_id);
    return;
  }
  const displayId = await nextDisplayId(projectId);
  const { data: page, error: pageError } = await supabase
    .from('page')
    .insert({
      project_id: projectId,
      kind: 'icd',
      title: `ICD ${displayId}`,
      metadata: { connectorId, contextPageId: connector.page_id, locked: true },
    })
    .select()
    .single();
  if (pageError) throw pageError;
  const { error } = await supabase
    .from('interface')
    .insert({
      project_id: projectId,
      connector_id: connectorId,
      display_id: displayId,
      icd_page_id: page.id,
    });
  if (error) throw error;
  await updateObject(connectorId, { metadata: { ...meta, icdPageId: page.id } });
}

export async function updateInterface(
  record: InterfaceRecord,
  patch: { displayId?: string; type?: string; description?: string; specification?: string },
) {
  if (patch.displayId !== undefined) {
    const { error } = await supabase
      .from('interface')
      .update({ display_id: patch.displayId })
      .eq('id', record.id);
    if (error) throw error;
  }
  const metaPatch: Record<string, unknown> = {};
  if (patch.type !== undefined) metaPatch.interfaceType = patch.type;
  if (patch.description !== undefined) metaPatch.description = patch.description;
  if (patch.specification !== undefined) metaPatch.specification = patch.specification;
  if (Object.keys(metaPatch).length) {
    const { data } = await supabase
      .from('canvas_object')
      .select('metadata')
      .eq('id', record.connectorId)
      .single();
    await updateObject(record.connectorId, {
      metadata: { ...((data?.metadata ?? {}) as Record<string, unknown>), ...metaPatch },
    });
  }
}
