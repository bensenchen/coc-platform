import { useQuery } from '@tanstack/react-query';
import { hasFeature,type FeatureKey } from '@/services/entitlement.service';
export function useFeature(workspaceId:string,feature:FeatureKey){return useQuery({queryKey:['feature',workspaceId,feature],queryFn:()=>hasFeature(workspaceId,feature),enabled:!!workspaceId});}
