import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useWorkspaces } from '@/hooks/useWorkspaces';
import { useProjects } from '@/hooks/useCurrentProject';
import { useWorkspaceStore } from '@/stores/workspace.store';
import { useAuth } from '@/hooks/useAuth';
import { useAcceptMyInvitations } from '@/hooks/useWorkspaceMutations';
import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Spinner';
import { Settings, LogOut, Plus } from 'lucide-react';
import { CreateWorkspaceDialog } from '@/features/workspace-mgmt/CreateWorkspaceDialog';
import { CreateProjectDialog } from '@/features/project-mgmt/CreateProjectDialog';
import type { Project } from '@/models/project.model';

export function HomePage() {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { data: workspaces = [], isLoading: wsLoading } = useWorkspaces();
  const { currentWorkspace, setCurrentWorkspace, setCurrentProject } = useWorkspaceStore();
  const { data: projects = [] } = useProjects(currentWorkspace?.id ?? null);
  const acceptInvitations = useAcceptMyInvitations();
  const [showCreateWs, setShowCreateWs] = useState(false);
  const [showCreateProject, setShowCreateProject] = useState(false);

  useEffect(() => {
    acceptInvitations.mutate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function open(p: Project) {
    if (!currentWorkspace) return;
    setCurrentProject(p);
    navigate(`/w/${currentWorkspace.slug}/p/${p.slug}`);
  }

  return (
    <div className="min-h-full bg-slate-50">
      <header className="border-b border-slate-200 bg-white px-6 h-14 flex items-center justify-between">
        <h1 className="text-lg font-bold text-slate-900">COC</h1>
        <div className="flex items-center gap-3">
          <span className="text-sm text-slate-500">{user?.email}</span>
          <Button variant="ghost" size="sm" onClick={() => navigate('/admin')}>
            <Settings size={14}/> Admin
          </Button>
          <Button variant="ghost" size="sm" onClick={() => signOut()}>
            <LogOut size={14}/> Sign out
          </Button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto p-8">
        <div className="flex items-center justify-between mb-1">
          <h2 className="text-xl font-semibold text-slate-900">Select a workspace</h2>
          <Button size="sm" onClick={() => setShowCreateWs(true)}>
            <Plus size={14}/> New workspace
          </Button>
        </div>
        <p className="text-sm text-slate-500 mb-5">Or have an admin invite you to one.</p>

        {wsLoading ? <Spinner /> : workspaces.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-lg p-8 text-center">
            <p className="text-slate-600 mb-3">You aren't a member of any workspace yet.</p>
            <Button onClick={() => setShowCreateWs(true)}>
              <Plus size={14}/> Create your first workspace
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-8">
            {workspaces.map((w) => (
              <button key={w.id} onClick={() => setCurrentWorkspace(w)}
                className={`text-left p-4 rounded-lg border ${currentWorkspace?.id === w.id ? 'border-blue-500 bg-blue-50' : 'border-slate-200 bg-white hover:border-slate-300'}`}>
                <div className="font-semibold text-slate-900">{w.name}</div>
                <div className="text-xs text-slate-500 mt-1">{w.slug}</div>
              </button>
            ))}
          </div>
        )}

        {currentWorkspace && (
          <>
            <div className="flex items-center justify-between mb-1">
              <h2 className="text-xl font-semibold text-slate-900">Select a project</h2>
              <Button size="sm" onClick={() => setShowCreateProject(true)}>
                <Plus size={14}/> New project
              </Button>
            </div>
            <p className="text-sm text-slate-500 mb-5">Inside {currentWorkspace.name}</p>
            {projects.length === 0 ? (
              <div className="bg-white border border-slate-200 rounded-lg p-6 text-sm text-slate-500">
                No projects in this workspace yet.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {projects.map((p) => (
                  <button key={p.id} onClick={() => open(p)}
                    className="text-left p-4 rounded-lg border border-slate-200 bg-white hover:border-blue-400 hover:shadow-sm">
                    <div className="font-semibold text-slate-900">{p.name}</div>
                    <div className="text-xs text-slate-500 mt-1">{p.slug}</div>
                  </button>
                ))}
              </div>
            )}
          </>
        )}
      </main>

      <CreateWorkspaceDialog open={showCreateWs} onClose={() => setShowCreateWs(false)} />
      {currentWorkspace && (
        <CreateProjectDialog open={showCreateProject} onClose={() => setShowCreateProject(false)}
          workspaceId={currentWorkspace.id} />
      )}
    </div>
  );
}
