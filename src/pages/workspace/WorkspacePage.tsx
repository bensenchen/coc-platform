import { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useWorkspaces } from '@/hooks/useWorkspaces';
import { useProjects } from '@/hooks/useCurrentProject';
import { useWorkspaceStore } from '@/stores/workspace.store';
import { Spinner } from '@/components/ui/Spinner';

export function WorkspacePage() {
  const { workspaceSlug, projectSlug } = useParams();
  const navigate = useNavigate();
  const { data: workspaces, isLoading: wsLoading } = useWorkspaces();
  const { currentWorkspace, setCurrentWorkspace, currentProject, setCurrentProject } = useWorkspaceStore();
  const { data: projects } = useProjects(currentWorkspace?.id ?? null);

  useEffect(() => {
    if (!workspaces) return;
    const w = workspaces.find((x) => x.slug === workspaceSlug);
    if (w && w.id !== currentWorkspace?.id) setCurrentWorkspace(w);
    else if (!w && !wsLoading) navigate('/home', { replace: true });
  }, [workspaceSlug, workspaces, currentWorkspace, setCurrentWorkspace, navigate, wsLoading]);

  useEffect(() => {
    if (!projects) return;
    const p = projects.find((x) => x.slug === projectSlug);
    if (p && p.id !== currentProject?.id) setCurrentProject(p);
  }, [projectSlug, projects, currentProject, setCurrentProject]);

  if (wsLoading) return <div className="flex h-full items-center justify-center"><Spinner/></div>;

  return (
    <div className="h-full flex items-center justify-center">
      <div className="text-center text-slate-400">
        <div className="text-6xl mb-3">⬡</div>
        <div className="text-sm font-medium text-slate-600">
          {currentProject?.name ?? 'No project selected'}
        </div>
        <div className="text-xs mt-1">Select a page from the sidebar.</div>
        <div className="text-xs mt-3 text-slate-300">Phase 5+ adds page management.</div>
      </div>
    </div>
  );
}
