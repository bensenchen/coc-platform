import { supabase } from '@/infrastructure/supabase/client';
export type FeatureKey='revisions'|'excel_export'|'google_sheets_export'|'ai_retrieval';
export async function hasFeature(workspaceId:string,feature:FeatureKey){const {data,error}=await supabase.rpc('has_feature',{p_workspace_id:workspaceId,p_feature_key:feature});if(error)throw error;return !!data;}
