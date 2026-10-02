import { supabase } from '@/infrastructure/supabase/client';
import type { PageSnapshot, RevisionComparison, SnapshotContent } from '@/models/snapshot.model';

function normalize(content: any): SnapshotContent {
  return {
    schemaVersion: Number(content?.schemaVersion ?? 1),
    page: content?.page,
    columns: (content?.columns ?? []).map((c: any) => ({ id: c.id, pageId: c.page_id ?? c.pageId, name: c.name, position: c.position, dataType: c.data_type ?? c.dataType, isDefault: c.is_default ?? c.isDefault, format: c.format ?? {} })),
    rows: (content?.rows ?? []).map((r: any) => ({ id: r.id, pageId: r.page_id ?? r.pageId, position: r.position, canvasObjectId: r.canvas_object_id ?? r.canvasObjectId ?? null, format: r.format ?? {} })),
    cells: (content?.cells ?? []).map((c: any) => ({ rowId: c.row_id ?? c.rowId, columnId: c.column_id ?? c.columnId, value: c.value, format: c.format ?? {} })),
    view: content?.view ?? {},
  };
}
function map(r: any): PageSnapshot { return { id:r.id, pageId:r.page_id, takenAt:r.taken_at, takenBy:r.taken_by, content:normalize(r.content) }; }
export async function listRevisions(pageId:string):Promise<PageSnapshot[]> {
  const {data,error}=await supabase.from('page_snapshot').select('*').eq('page_id',pageId).order('taken_at',{ascending:false});
  if(error) throw error; return (data??[]).map(map);
}
export async function createRevision(pageId:string):Promise<PageSnapshot> {
  const {data,error}=await supabase.rpc('take_page_snapshot',{p_page_id:pageId});
  if(error) throw error; return map(data);
}
export function compareRevisions(before:PageSnapshot, after:PageSnapshot):RevisionComparison {
  const bRows=new Map(before.content.rows.map(r=>[r.id,r])), aRows=new Map(after.content.rows.map(r=>[r.id,r]));
  const bCols=new Map(before.content.columns.map(c=>[c.id,c])), aCols=new Map(after.content.columns.map(c=>[c.id,c]));
  const cv=(s:SnapshotContent)=>new Map(s.cells.map(c=>[`${c.rowId}:${c.columnId}`,c.value])); const bc=cv(before.content), ac=cv(after.content);
  const changedCells:Array<RevisionComparison['changedCells'][number]>=[];
  for(const key of new Set([...bc.keys(),...ac.keys()])) { const [rowId='',columnId='']=key.split(':');
    if (bRows.has(rowId)&&aRows.has(rowId)&&(bc.has(key)!==ac.has(key)||JSON.stringify(bc.get(key))!==JSON.stringify(ac.get(key)))) changedCells.push({rowId,columnId,columnName:aCols.get(columnId)?.name??bCols.get(columnId)?.name??columnId,before:bc.get(key),after:ac.get(key)});
  }
  return { beforeId:before.id, afterId:after.id, addedRows:[...aRows.values()].filter(r=>!bRows.has(r.id)), removedRows:[...bRows.values()].filter(r=>!aRows.has(r.id)), changedCells };
}

function esc(v:unknown){return String(v??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');}
export function downloadExcel(content:SnapshotContent, fileName:string){
  const values=new Map(content.cells.map(c=>[`${c.rowId}:${c.columnId}`,c.value]));
  const row=(cells:unknown[])=>`<Row>${cells.map(v=>`<Cell><Data ss:Type="String">${esc(v)}</Data></Cell>`).join('')}</Row>`;
  const xml=`<?xml version="1.0"?><Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"><Worksheet ss:Name="Revision"><Table>${row(content.columns.map(c=>c.name))}${content.rows.map(r=>row(content.columns.map(c=>values.get(`${r.id}:${c.id}`)))).join('')}</Table></Worksheet></Workbook>`;
  const a=document.createElement('a'); a.href=URL.createObjectURL(new Blob([xml],{type:'application/vnd.ms-excel'})); a.download=`${fileName}.xls`; a.click(); URL.revokeObjectURL(a.href);
}

export async function exportGoogleSheet(connectionId:string, snapshotId:string){
  const {data,error}=await supabase.functions.invoke('google-sheets-export',{body:{connectionId,snapshotId}}); if(error) throw error; return data as {spreadsheetUrl:string};
}
