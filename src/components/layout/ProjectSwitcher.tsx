import { useProjects } from '@/hooks/useCurrentProject';
import { useWorkspaceStore } from '@/stores/workspace.store';
import { ChevronDown } from 'lucide-react';

export function ProjectSwitcher() {
  const { currentWorkspace, currentProject, setCurrentProject } = useWorkspaceStore();
  const { data: projects = [] } = useProjects(currentWorkspace?.id ?? null);

  return (
    <div className="relative mt-2">
      <select
        value={currentProject?.id ?? ''}
        onChange={(e) => setCurrentProject(projects.find((p) => p.id === e.target.value) ?? null)}
        disabled={!currentWorkspace}
        className="w-full appearance-none bg-slate-800 text-slate-200 text-xs px-2.5 py-1.5 rounded pr-7 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-50"
      >
        {projects.length === 0 && <option value="">No projects</option>}
        {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
      </select>
      <ChevronDown size={14} className="absolute right-2 top-2 pointer-events-none text-slate-400" />
    </div>
  );
}
