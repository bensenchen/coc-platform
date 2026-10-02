import { useMutation,useQuery,useQueryClient } from '@tanstack/react-query';
import { createRevision,listRevisions } from '@/services/revision.service';
export function useRevisions(pageId:string){return useQuery({queryKey:['revisions',pageId],queryFn:()=>listRevisions(pageId)});}
export function useCreateRevision(pageId:string){const qc=useQueryClient();return useMutation({mutationFn:()=>createRevision(pageId),onSuccess:()=>qc.invalidateQueries({queryKey:['revisions',pageId]})});}
