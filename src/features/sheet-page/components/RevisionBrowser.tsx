import { useMemo,useState } from 'react';
import { useCreateRevision,useRevisions } from '@/hooks/useRevisions';
import { compareRevisions,downloadExcel,exportGoogleSheet } from '@/services/revision.service';
import { useFeature } from '@/hooks/useFeature';

export function RevisionBrowser({pageId,pageTitle,workspaceId,mayEdit}:{pageId:string;pageTitle:string;workspaceId:string;mayEdit:boolean}){
  const [open,setOpen]=useState(false); const [beforeId,setBeforeId]=useState(''); const [afterId,setAfterId]=useState('');
  const revisions=useRevisions(pageId); const create=useCreateRevision(pageId);
  const revisionsEnabled=useFeature(workspaceId,'revisions'); const excelEnabled=useFeature(workspaceId,'excel_export'); const googleEnabled=useFeature(workspaceId,'google_sheets_export');
  const selected=revisions.data?.find(r=>r.id===afterId)||revisions.data?.[0];
  const comparison=useMemo(()=>{const a=revisions.data?.find(r=>r.id===beforeId),b=revisions.data?.find(r=>r.id===afterId);return a&&b?compareRevisions(a,b):null},[revisions.data,beforeId,afterId]);
  if(revisionsEnabled.data===false) return <button disabled title="Your subscription does not include revisions" className="text-xs text-slate-400">Revisions · Locked</button>;
  return <div className="relative">
    <button onClick={()=>setOpen(v=>!v)} className="px-3 py-1.5 text-xs rounded border border-slate-300">Revisions</button>
    {open&&<section aria-label="Revision browser" className="absolute right-0 top-9 z-30 w-[560px] rounded-lg border bg-white p-4 shadow-xl text-slate-800">
      <div className="flex items-center gap-2"><h2 className="font-semibold">Revision history</h2><span className="text-xs text-slate-500">Immutable snapshots</span><div className="flex-1"/>
        <button disabled={!mayEdit||create.isPending} onClick={()=>create.mutate()} className="rounded bg-indigo-600 px-2 py-1 text-xs text-white disabled:opacity-40">{create.isPending?'Saving…':'Create revision'}</button>
      </div>
      {create.error instanceof Error&&<p role="alert" className="mt-2 text-xs text-red-600">{create.error.message}</p>}
      <div className="mt-3 max-h-40 overflow-auto border rounded divide-y">{revisions.data?.map(r=><button key={r.id} onClick={()=>setAfterId(r.id)} className={`block w-full px-3 py-2 text-left text-xs ${selected?.id===r.id?'bg-indigo-50':''}`}><strong>{new Date(r.takenAt).toLocaleString()}</strong><span className="ml-2 text-slate-500">{r.id.slice(0,8)}</span></button>)}{!revisions.isLoading&&!revisions.data?.length&&<p className="p-3 text-xs text-slate-500">No revisions yet.</p>}</div>
      {selected&&<div className="mt-3 flex gap-2"><button disabled={excelEnabled.data!==true} title={excelEnabled.data===false?'Not included in subscription':''} onClick={()=>downloadExcel(selected.content,`${pageTitle}-${selected.takenAt.slice(0,10)}`)} className="rounded border px-2 py-1 text-xs disabled:opacity-40">Export Excel</button><button disabled={googleEnabled.data!==true} onClick={async()=>{const connectionId=prompt('Authenticated Google connection ID');if(connectionId){const r=await exportGoogleSheet(connectionId,selected.id);window.open(r.spreadsheetUrl,'_blank','noopener,noreferrer')}}} className="rounded border px-2 py-1 text-xs disabled:opacity-40">Export Google Sheets</button></div>}
      {(revisions.data?.length??0)>1&&<div className="mt-4 border-t pt-3"><h3 className="text-sm font-semibold">Compare two revisions</h3><div className="mt-2 flex gap-2">{[beforeId,afterId].map((value,i)=><select key={i} aria-label={i?'Newer revision':'Older revision'} value={value} onChange={e=>i?setAfterId(e.target.value):setBeforeId(e.target.value)} className="min-w-0 flex-1 rounded border px-2 py-1 text-xs"><option value="">Select…</option>{revisions.data?.map(r=><option key={r.id} value={r.id}>{new Date(r.takenAt).toLocaleString()}</option>)}</select>)}</div>
      {comparison&&<div className="mt-3 grid grid-cols-3 gap-2 text-xs"><div className="rounded bg-emerald-50 p-2"><strong>{comparison.addedRows.length}</strong><br/>added rows</div><div className="rounded bg-red-50 p-2"><strong>{comparison.removedRows.length}</strong><br/>removed rows</div><div className="rounded bg-amber-50 p-2"><strong>{comparison.changedCells.length}</strong><br/>changed cells</div><div className="col-span-3 max-h-36 overflow-auto">{comparison.changedCells.map((c)=><div key={`${c.rowId}:${c.columnId}`} className="border-b py-1"><strong>{c.columnName}</strong>: <del className="text-red-700">{String(c.before??'')}</del> → <ins className="text-emerald-700">{String(c.after??'')}</ins></div>)}</div></div>}</div>}
    </section>}
  </div>
}
