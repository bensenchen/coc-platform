import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const json=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:{'content-type':'application/json'}});
Deno.serve(async(req)=>{
  if(req.method!=='POST') return json({error:'Method not allowed'},405);
  const authorization=req.headers.get('authorization'); if(!authorization) return json({error:'Authentication required'},401);
  const url=Deno.env.get('SUPABASE_URL')!, anon=Deno.env.get('SUPABASE_ANON_KEY')!, serviceKey=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const caller=createClient(url,anon,{global:{headers:{Authorization:authorization}}});
  const {data:{user}}=await caller.auth.getUser(); if(!user) return json({error:'Authentication required'},401);
  const {connectionId,snapshotId}=await req.json(); if(!connectionId||!snapshotId) return json({error:'connectionId and snapshotId are required'},400);
  const admin=createClient(url,serviceKey); const {data:connection}=await admin.from('provider_connection').select('*').eq('id',connectionId).is('revoked_at',null).single();
  if(!connection) return json({error:'Connection not found'},404);
  const {data:membership}=await admin.from('workspace_member').select('role').eq('workspace_id',connection.workspace_id).eq('user_id',user.id).maybeSingle();
  if(!membership) return json({error:'Not authorized'},403);
  const {data:enabled}=await caller.rpc('has_feature',{p_workspace_id:connection.workspace_id,p_feature_key:'google_sheets_export'}); if(!enabled) return json({error:'Feature not entitled'},403);
  const {data:snapshot}=await caller.from('page_snapshot').select('*,page!inner(project!inner(workspace_id))').eq('id',snapshotId).single();
  if(!snapshot||snapshot.page.project.workspace_id!==connection.workspace_id) return json({error:'Snapshot not authorized'},403);
  // Credentials remain behind an authenticated broker; credential_ref is never returned to the browser.
  const broker=Deno.env.get('OAUTH_TOKEN_BROKER_URL'); const brokerKey=Deno.env.get('OAUTH_TOKEN_BROKER_KEY');
  if(!broker||!brokerKey) return json({error:'Google integration is not configured'},503);
  const tokenResponse=await fetch(broker,{method:'POST',headers:{authorization:`Bearer ${brokerKey}`,'content-type':'application/json'},body:JSON.stringify({credentialRef:connection.credential_ref,provider:'google'})});
  if(!tokenResponse.ok) return json({error:'Could not obtain provider credential'},502); const {accessToken}=await tokenResponse.json();
  const content=snapshot.content; const values=new Map((content.cells??[]).map((c:any)=>[`${c.row_id??c.rowId}:${c.column_id??c.columnId}`,c.value]));
  const matrix=[(content.columns??[]).map((c:any)=>c.name),...(content.rows??[]).map((r:any)=>(content.columns??[]).map((c:any)=>values.get(`${r.id}:${c.id}`)??''))];
  const create=await fetch('https://sheets.googleapis.com/v4/spreadsheets',{method:'POST',headers:{authorization:`Bearer ${accessToken}`,'content-type':'application/json'},body:JSON.stringify({properties:{title:`COC revision ${snapshot.taken_at}`},sheets:[{properties:{title:'Revision'}}]})});
  if(!create.ok) return json({error:'Google Sheets creation failed'},502); const spreadsheet=await create.json();
  const write=await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheet.spreadsheetId}/values/Revision!A1?valueInputOption=RAW`,{method:'PUT',headers:{authorization:`Bearer ${accessToken}`,'content-type':'application/json'},body:JSON.stringify({values:matrix})});
  if(!write.ok) return json({error:'Google Sheets write failed'},502);
  return json({spreadsheetUrl:spreadsheet.spreadsheetUrl});
});
