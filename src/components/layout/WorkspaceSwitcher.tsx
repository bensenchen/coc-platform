import { useWorkspaces } from '@/hooks/useWorkspaces';
import { useWorkspaceStore } from '@/stores/workspace.store';
import { ChevronDown } from 'lucide-react';

export function WorkspaceSwitcher() {
  const { data: workspaces = [] } = useWorkspaces();
  const { currentWorkspace, setCurrentWorkspace } = useWorkspaceStore();

  return (
    <div className="relative">
      <select
        value={currentWorkspace?.id ?? ''}
        onChange={(e) => setCurrentWorkspace(workspaces.find((w) => w.id === e.target.value) ?? null)}
        className="w-full appearance-none bg-slate-800 text-slate-100 text-sm font-semibold px-2.5 py-1.5 rounded pr-7 focus:outline-none focus:ring-1 focus:ring-blue-500"
      >
        {workspaces.length === 0 && <option value="">No workspaces</option>}
        {workspaces.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
      </select>
      <ChevronDown size={14} className="absolute right-2 top-2 pointer-events-none text-slate-400" />
    </div>
  );
}
