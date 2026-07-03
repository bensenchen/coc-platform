import { supabase } from '@/infrastructure/supabase/client';
import type { CanvasObject, CanvasObjectType, ConnectorAnchor, AnchorPosition } from '@/models/canvas-object.model';

function mapObject(row: any): CanvasObject {
  return {
    id: row.id,
    pageId: row.page_id,
    type: row.type,
    name: row.name ?? null,
    positionX: row.position_x,
    positionY: row.position_y,
    width: row.width ?? null,
    height: row.height ?? null,
    rotation: row.rotation,
    zIndex: row.z_index,
    isPhysical: row.is_physical,
    metadata: row.metadata ?? {},
    createdBy: row.created_by ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    deletedAt: row.deleted_at ?? null,
  };
}

function mapAnchor(row: any): ConnectorAnchor {
  return {
    connectorId: row.connector_id,
    sourceObjectId: row.source_object_id ?? null,
    sourceAnchor: row.source_anchor ?? null,
    targetObjectId: row.target_object_id ?? null,
    targetAnchor: row.target_anchor ?? null,
  };
}

export async function listObjects(pageId: string): Promise<CanvasObject[]> {
  const { data, error } = await supabase
    .from('canvas_object')
    .select('*')
    .eq('page_id', pageId)
    .is('deleted_at', null)
    .order('z_index', { ascending: true })
    .order('created_at', { ascending: true });
  if (error) throw error;
  return (data ?? []).map(mapObject);
}

export async function listConnectorAnchors(pageId: string): Promise<ConnectorAnchor[]> {
  const { data, error } = await supabase
    .from('connector_anchor')
    .select('*, canvas_object!connector_id(page_id)')
    .eq('canvas_object.page_id', pageId);
  if (error) throw error;
  return (data ?? []).map(mapAnchor);
}

export interface CreateObjectProps {
  type: CanvasObjectType;
  positionX: number;
  positionY: number;
  width?: number;
  height?: number;
  name?: string;
  metadata?: Record<string, unknown>;
}

export async function createObject(pageId: string, props: CreateObjectProps): Promise<CanvasObject> {
  const { data: { user } } = await supabase.auth.getUser();
  const { data, error } = await supabase
    .from('canvas_object')
    .insert({
      page_id: pageId,
      type: props.type,
      position_x: props.positionX,
      position_y: props.positionY,
      width: props.width ?? null,
      height: props.height ?? null,
      name: props.name ?? null,
      metadata: props.metadata ?? {},
      created_by: user?.id ?? null,
    })
    .select()
    .single();
  if (error) throw error;
  return mapObject(data);
}

export interface UpdateObjectPatch {
  name?: string | null;
  positionX?: number;
  positionY?: number;
  width?: number | null;
  height?: number | null;
  rotation?: number;
  zIndex?: number;
  isPhysical?: boolean;
  metadata?: Record<string, unknown>;
}

export async function updateObject(id: string, patch: UpdateObjectPatch): Promise<CanvasObject> {
  const dbPatch: Record<string, unknown> = {};
  if (patch.name !== undefined) dbPatch.name = patch.name;
  if (patch.positionX !== undefined) dbPatch.position_x = patch.positionX;
  if (patch.positionY !== undefined) dbPatch.position_y = patch.positionY;
  if (patch.width !== undefined) dbPatch.width = patch.width;
  if (patch.height !== undefined) dbPatch.height = patch.height;
  if (patch.rotation !== undefined) dbPatch.rotation = patch.rotation;
  if (patch.zIndex !== undefined) dbPatch.z_index = patch.zIndex;
  if (patch.isPhysical !== undefined) dbPatch.is_physical = patch.isPhysical;
  if (patch.metadata !== undefined) dbPatch.metadata = patch.metadata;

  const { data, error } = await supabase
    .from('canvas_object')
    .update(dbPatch)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return mapObject(data);
}

export async function deleteObject(id: string): Promise<void> {
  const { error } = await supabase
    .from('canvas_object')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id);
  if (error) throw error;
}

// Each connector end is either anchored to a shape (objectId + anchor)
// or floats at a free canvas point. The free point is always saved in
// the connector's metadata so it survives un-anchoring.
export interface ConnectorEndpoint {
  objectId: string | null;
  anchor: AnchorPosition | null;
  point: { x: number; y: number };
}

export async function createConnector(
  pageId: string,
  source: ConnectorEndpoint,
  target: ConnectorEndpoint,
  metadata: Record<string, unknown> = {},
): Promise<{ obj: CanvasObject; anchor: ConnectorAnchor }> {
  const { data: { user } } = await supabase.auth.getUser();
  const { data: objData, error: objErr } = await supabase
    .from('canvas_object')
    .insert({
      page_id: pageId,
      type: 'connector',
      position_x: 0,
      position_y: 0,
      metadata: { ...metadata, sourcePoint: source.point, targetPoint: target.point },
      created_by: user?.id ?? null,
    })
    .select()
    .single();
  if (objErr) throw objErr;

  const { data: ancData, error: ancErr } = await supabase
    .from('connector_anchor')
    .insert({
      connector_id: objData.id,
      source_object_id: source.objectId,
      source_anchor: source.anchor,
      target_object_id: target.objectId,
      target_anchor: target.anchor,
    })
    .select()
    .single();
  if (ancErr) throw ancErr;

  return { obj: mapObject(objData), anchor: mapAnchor(ancData) };
}

export async function updateConnectorAnchor(
  connectorId: string,
  patch: Partial<ConnectorAnchor>,
): Promise<ConnectorAnchor> {
  const dbPatch: Record<string, unknown> = {};
  if (patch.sourceObjectId !== undefined) dbPatch.source_object_id = patch.sourceObjectId;
  if (patch.sourceAnchor !== undefined) dbPatch.source_anchor = patch.sourceAnchor;
  if (patch.targetObjectId !== undefined) dbPatch.target_object_id = patch.targetObjectId;
  if (patch.targetAnchor !== undefined) dbPatch.target_anchor = patch.targetAnchor;

  const { data, error } = await supabase
    .from('connector_anchor')
    .update(dbPatch)
    .eq('connector_id', connectorId)
    .select()
    .single();
  if (error) throw error;
  return mapAnchor(data);
}
