import { supabase } from '@/infrastructure/supabase/client';
import type { SheetColumn, SheetRow, SheetCell, ColumnDataType } from '@/models/sheet.model';

function mapCol(r: any): SheetColumn {
  return { id: r.id, pageId: r.page_id, name: r.name, position: r.position, dataType: r.data_type, isDefault: r.is_default, format: r.format ?? {} };
}
function mapRow(r: any): SheetRow {
  return { id: r.id, pageId: r.page_id, position: r.position, canvasObjectId: r.canvas_object_id ?? null, format: r.format ?? {} };
}
function mapCell(r: any): SheetCell {
  return { rowId: r.row_id, columnId: r.column_id, value: r.value, format: r.format ?? {} };
}

// ── Columns ──────────────────────────────────────────────────────────────────

export async function listColumns(pageId: string): Promise<SheetColumn[]> {
  const { data, error } = await supabase.from('sheet_column').select('*').eq('page_id', pageId).order('position');
  if (error) throw error;
  return (data ?? []).map(mapCol);
}

export async function createColumn(pageId: string, name: string, dataType: ColumnDataType = 'text'): Promise<SheetColumn> {
  const { data: ex } = await supabase.from('sheet_column').select('position').eq('page_id', pageId).order('position', { ascending: false }).limit(1);
  const position = (ex?.[0]?.position ?? -1) + 1;
  const { data, error } = await supabase.from('sheet_column').insert({ page_id: pageId, name, data_type: dataType, position }).select().single();
  if (error) throw error;
  return mapCol(data);
}

export async function updateColumn(id: string, patch: { name?: string; dataType?: ColumnDataType }): Promise<SheetColumn> {
  const dbPatch: any = {};
  if (patch.name !== undefined) dbPatch.name = patch.name;
  if (patch.dataType !== undefined) dbPatch.data_type = patch.dataType;
  const { data, error } = await supabase.from('sheet_column').update(dbPatch).eq('id', id).select().single();
  if (error) throw error;
  return mapCol(data);
}

export async function deleteColumn(id: string): Promise<void> {
  const { error } = await supabase.from('sheet_column').delete().eq('id', id);
  if (error) throw error;
}

// ── Rows ─────────────────────────────────────────────────────────────────────

export async function listRows(pageId: string): Promise<SheetRow[]> {
  const { data, error } = await supabase.from('sheet_row').select('*').eq('page_id', pageId).order('position');
  if (error) throw error;
  return (data ?? []).map(mapRow);
}

export async function createRow(pageId: string, canvasObjectId?: string): Promise<SheetRow> {
  const { data: ex } = await supabase.from('sheet_row').select('position').eq('page_id', pageId).order('position', { ascending: false }).limit(1);
  const position = (ex?.[0]?.position ?? -1) + 1;
  const { data, error } = await supabase.from('sheet_row').insert({ page_id: pageId, position, canvas_object_id: canvasObjectId ?? null }).select().single();
  if (error) throw error;
  return mapRow(data);
}

export async function deleteRow(id: string): Promise<void> {
  const { error } = await supabase.from('sheet_row').delete().eq('id', id);
  if (error) throw error;
}

// ── Cells ─────────────────────────────────────────────────────────────────────

export async function listCellsForPage(pageId: string): Promise<SheetCell[]> {
  const { data: rows } = await supabase.from('sheet_row').select('id').eq('page_id', pageId);
  const rowIds = (rows ?? []).map((r: any) => r.id);
  if (rowIds.length === 0) return [];
  const { data, error } = await supabase.from('sheet_cell').select('*').in('row_id', rowIds);
  if (error) throw error;
  return (data ?? []).map(mapCell);
}

export async function upsertCell(rowId: string, columnId: string, value: unknown): Promise<void> {
  const { error } = await supabase.from('sheet_cell').upsert({ row_id: rowId, column_id: columnId, value }, { onConflict: 'row_id,column_id' });
  if (error) throw error;
}
