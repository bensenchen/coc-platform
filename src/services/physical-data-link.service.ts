import { supabase } from '@/infrastructure/supabase/client';

export interface PhysicalDataLinkResult {
  canvasObjectId: string;
  sheetRowId: string;
  contextPageId?: string;
  dataPageId: string;
}

function mapResult(row: any): PhysicalDataLinkResult {
  return {
    canvasObjectId: row.canvas_object_id,
    sheetRowId: row.sheet_row_id,
    contextPageId: row.context_page_id ?? undefined,
    dataPageId: row.data_page_id,
  };
}

export async function linkPhysicalObjectToDataRow(canvasObjectId: string, dataPageId: string) {
  const { data, error } = await supabase.rpc('create_physical_data_link', {
    p_canvas_object_id: canvasObjectId,
    p_data_page_id: dataPageId,
  });
  if (error) throw error;
  return mapResult(data?.[0]);
}

export async function createDataRowWithPhysicalObject(input: {
  dataPageId: string;
  contextPageId?: string;
  newContextTitle?: string;
  objectName?: string;
}) {
  const { data, error } = await supabase.rpc('create_data_row_with_physical_object', {
    p_data_page_id: input.dataPageId,
    p_context_page_id: input.contextPageId ?? null,
    p_new_context_title: input.newContextTitle ?? null,
    p_object_name: input.objectName ?? null,
  });
  if (error) throw error;
  return mapResult(data?.[0]);
}

export async function deleteDataRowRelationship(sheetRowId: string, deleteCanvasObject: boolean) {
  const { data, error } = await supabase.rpc('delete_data_row_relationship', {
    p_sheet_row_id: sheetRowId,
    p_delete_canvas_object: deleteCanvasObject,
  });
  if (error) throw error;
  return data?.[0] ?? null;
}

export async function findPhysicalDataLink(
  canvasObjectId: string,
): Promise<PhysicalDataLinkResult | null> {
  const { data, error } = await supabase
    .from('sheet_row')
    .select('id, page_id, canvas_object_id')
    .eq('canvas_object_id', canvasObjectId)
    .maybeSingle();
  if (error) throw error;
  return data
    ? { canvasObjectId: data.canvas_object_id!, sheetRowId: data.id, dataPageId: data.page_id }
    : null;
}
