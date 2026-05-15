import { useNavigate } from 'react-router-dom';
import { useWorkspaces } from '@/hooks/useWorkspaces';
import { useProjects } from '@/hooks/useCurrentProject';
import { useWorkspaceStore } from '@/stores/workspace.store';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Spinner';
import { Settings, LogOut } from 'lucide-react';
import type { Project } from '@/models/project.model';

export function HomePage() {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { data: workspaces = [], isLoading: wsLoading } = useWorkspaces();
  const { currentWorkspace, setCurrentWorkspace, setCurrentProject } = useWorkspaceStore();
  const { data: projects = [] } = useProjects(currentWorkspace?.id ?? null);

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
        <h2 className="text-xl font-semibold text-slate-900 mb-1">Select a workspace</h2>
        <p className="text-sm text-slate-500 mb-5">Or have an admin invite you to one.</p>

        {wsLoading ? <Spinner /> : workspaces.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-lg p-8 text-center">
            <p className="text-slate-600 mb-3">You aren't a member of any workspace yet.</p>
            <p className="text-xs text-slate-400">Phase 5 will add workspace creation here.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-8">
            {workspaces.map((w) => (
              <button
                key={w.id}
                onClick={() => setCurrentWorkspace(w)}
                className={`text-left p-4 rounded-lg border ${currentWorkspace?.id === w.id ? 'border-blue-500 bg-blue-50' : 'border-slate-200 bg-white hover:border-slate-300'}`}
              >
                <div className="font-semibold text-slate-900">{w.name}</div>
                <div className="text-xs text-slate-500 mt-1">{w.slug}</div>
              </button>
            ))}
          </div>
        )}

        {currentWorkspace && (
          <>
            <h2 className="text-xl font-semibold text-slate-900 mb-1">Select a project</h2>
            <p className="text-sm text-slate-500 mb-5">Inside {currentWorkspace.name}</p>
            {projects.length === 0 ? (
              <div className="bg-white border border-slate-200 rounded-lg p-6 text-sm text-slate-500">
                No projects in this workspace yet.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {projects.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => open(p)}
                    className="text-left p-4 rounded-lg border border-slate-200 bg-white hover:border-blue-400 hover:shadow-sm"
                  >
                    <div className="font-semibold text-slate-900">{p.name}</div>
                    <div className="text-xs text-slate-500 mt-1">{p.slug}</div>
                  </button>
                ))}
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
