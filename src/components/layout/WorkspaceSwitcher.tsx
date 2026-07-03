import { useNavigate } from 'react-router-dom';
import { useWorkspaces } from '@/hooks/useWorkspaces';
import { useWorkspaceStore } from '@/stores/workspace.store';
import { supabase } from '@/infrastructure/supabase/client';
import { ChevronDown } from 'lucide-react';

export function WorkspaceSwitcher() {
  const navigate = useNavigate();
  const { data: workspaces = [] } = useWorkspaces();
  const { currentWorkspace, setCurrentWorkspace, setCurrentProject } = useWorkspaceStore();

  async function handleChange(id: string) {
    const w = workspaces.find((x) => x.id === id);
    if (!w || w.id === currentWorkspace?.id) return;
    setCurrentWorkspace(w);
    setCurrentProject(null);

    // Jump to the first project of the new workspace
    const { data } = await supabase
      .from('project')
      .select('slug')
      .eq('workspace_id', w.id)
      .is('deleted_at', null)
      .order('created_at', { ascending: true })
      .limit(1);

    if (data && data.length > 0) {
      navigate(`/w/${w.slug}/p/${data[0]!.slug}`);
    } else {
      navigate('/home');
    }
  }

  return (
    <div className="relative">
      <select
        value={currentWorkspace?.id ?? ''}
        onChange={(e) => handleChange(e.target.value)}
        className="w-full appearance-none bg-slate-800 text-slate-100 text-sm font-semibold px-2.5 py-1.5 rounded pr-7 focus:outline-none focus:ring-1 focus:ring-blue-500"
      >
        {workspaces.length === 0 && <option value="">No workspaces</option>}
        {workspaces.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
      </select>
      <ChevronDown size={14} className="absolute right-2 top-2 pointer-events-none text-slate-400" />
    </div>
  );
}
