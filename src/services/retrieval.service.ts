import { supabase } from '@/infrastructure/supabase/client';

export interface RetrievalResult { entity_type:string; entity_id:string; title:string; content:string; source_ref:string; updated_at:string }
export interface Dependency { direction:'inbound'|'outbound'; entity_type:string; entity_id:string; relationship:string }

/** Permission checks, tenant scoping and audit logging are enforced by the RPC, not callers. */
export async function retrieveProjectContext(projectId:string,query:string,purpose:string,limit=20):Promise<RetrievalResult[]> {
  const {data,error}=await supabase.rpc('retrieve_project_context',{p_project_id:projectId,p_query:query,p_purpose:purpose,p_limit:limit});
  if(error) throw error; return data??[];
}
export async function traceEntityDependencies(projectId:string,entityId:string):Promise<Dependency[]> {
  const {data,error}=await supabase.rpc('trace_entity_dependencies',{p_project_id:projectId,p_entity_id:entityId});
  if(error) throw error; return (data??[]) as Dependency[];
}
