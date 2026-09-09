import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useWorkspaces } from '@/hooks/useWorkspaces';
import { useProjects } from '@/hooks/useCurrentProject';
import { useWorkspaceStore } from '@/stores/workspace.store';
import { useAuth } from '@/hooks/useAuth';
import { useAcceptMyInvitations } from '@/hooks/useWorkspaceMutations';
import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Spinner';
import { CreateWorkspaceDialog } from '@/features/workspace-mgmt/CreateWorkspaceDialog';
import { CreateProjectDialog } from '@/features/project-mgmt/CreateProjectDialog';
import {
  ArrowUpRight,
  ChevronRight,
  FolderKanban,
  Layers3,
  LogOut,
  Plus,
  Settings,
  Sparkles,
  Users,
} from 'lucide-react';
import type { Project } from '@/models/project.model';
import type { Workspace } from '@/models/workspace.model';

function workspaceMark(name: string) {
  return name.trim().slice(0, 1).toUpperCase() || 'W';
}

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

  const firstName = useMemo(
    () => user?.user_metadata?.display_name?.split(' ')[0] || user?.email?.split('@')[0] || 'there',
    [user],
  );

  function selectWorkspace(workspace: Workspace) {
    setCurrentWorkspace(workspace);
    setCurrentProject(null);
  }

  function open(project: Project) {
    if (!currentWorkspace) return;
    setCurrentProject(project);
    navigate(`/w/${currentWorkspace.slug}/p/${project.slug}`);
  }

  return (
    <div className="min-h-full bg-[#f7f8fc] text-slate-900">
      <header className="h-[72px] border-b border-slate-200/80 bg-white/90 px-5 backdrop-blur sm:px-8">
        <div className="mx-auto flex h-full max-w-7xl items-center justify-between">
          <button
            onClick={() => navigate('/home')}
            className="flex items-center gap-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
            aria-label="COC home"
          >
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-indigo-600 to-violet-600 text-sm font-black tracking-tight text-white shadow-lg shadow-indigo-200">
              C
            </span>
            <span className="hidden text-left sm:block">
              <span className="block text-sm font-bold tracking-tight">COC Platform</span>
              <span className="block text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                Systems engineering
              </span>
            </span>
          </button>
          <div className="flex items-center gap-1.5 sm:gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/admin')}
              className="hidden sm:inline-flex"
            >
              <Settings size={15} /> Settings
            </Button>
            <div className="hidden h-7 w-px bg-slate-200 sm:block" />
            <div className="hidden text-right md:block">
              <p className="max-w-48 truncate text-xs font-semibold text-slate-700">
                {user?.email}
              </p>
              <p className="text-[11px] text-slate-400">Personal account</p>
            </div>
            <button
              onClick={() => signOut()}
              title="Sign out"
              className="grid h-9 w-9 place-items-center rounded-full bg-slate-100 text-slate-500 transition hover:bg-slate-200 hover:text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-5 py-9 sm:px-8 sm:py-12">
        <section className="relative overflow-hidden rounded-3xl bg-slate-950 px-6 py-9 text-white shadow-xl shadow-slate-300/40 sm:px-10 sm:py-11">
          <div className="absolute -right-24 -top-28 h-72 w-72 rounded-full bg-indigo-500/30 blur-3xl" />
          <div className="absolute bottom-0 right-24 h-40 w-40 rounded-full bg-violet-500/20 blur-2xl" />
          <div className="relative max-w-2xl">
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-medium text-indigo-100">
              <Sparkles size={14} /> Your engineering workspace
            </div>
            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Good to see you, {firstName}.
            </h1>
            <p className="mt-3 max-w-xl text-sm leading-6 text-slate-300 sm:text-base">
              Organize project context, data, interfaces, and management work in one connected
              place.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Button
                size="md"
                onClick={() => setShowCreateWs(true)}
                className="bg-white text-slate-900 hover:bg-indigo-50 focus:ring-white"
              >
                <Plus size={16} /> Create workspace
              </Button>
              {currentWorkspace && (
                <Button
                  size="md"
                  variant="secondary"
                  onClick={() => setShowCreateProject(true)}
                  className="border border-white/15 bg-white/10 text-white hover:bg-white/20 focus:ring-white"
                >
                  <FolderKanban size={16} /> New project
                </Button>
              )}
            </div>
          </div>
        </section>

        <section className="mt-10">
          <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-indigo-600">
                Workspaces
              </p>
              <h2 className="mt-1 text-2xl font-bold tracking-tight">Choose where to work</h2>
              <p className="mt-1 text-sm text-slate-500">
                Your teams and their projects, all in one place.
              </p>
            </div>
            <Button size="sm" variant="secondary" onClick={() => setShowCreateWs(true)}>
              <Plus size={15} /> New workspace
            </Button>
          </div>
          {wsLoading ? (
            <div className="flex h-32 items-center justify-center rounded-2xl border border-slate-200 bg-white">
              <Spinner />
            </div>
          ) : workspaces.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center">
              <span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-indigo-50 text-indigo-600">
                <Layers3 size={23} />
              </span>
              <h3 className="mt-4 font-semibold">Start with a workspace</h3>
              <p className="mx-auto mt-1 max-w-sm text-sm leading-6 text-slate-500">
                Create a workspace to give your team a shared home for systems engineering.
              </p>
              <Button className="mt-5" onClick={() => setShowCreateWs(true)}>
                <Plus size={16} /> Create your first workspace
              </Button>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {workspaces.map((workspace) => {
                const active = currentWorkspace?.id === workspace.id;
                return (
                  <button
                    key={workspace.id}
                    onClick={() => selectWorkspace(workspace)}
                    className={`group relative overflow-hidden rounded-2xl border p-5 text-left transition-all focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 ${active ? 'border-indigo-300 bg-indigo-50/70 shadow-md shadow-indigo-100' : 'border-slate-200 bg-white hover:-translate-y-0.5 hover:border-indigo-200 hover:shadow-lg hover:shadow-slate-200/70'}`}
                  >
                    <div className="flex items-start justify-between">
                      <span
                        className={`grid h-11 w-11 place-items-center rounded-xl text-base font-bold ${active ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600 group-hover:bg-indigo-100 group-hover:text-indigo-700'}`}
                      >
                        {workspaceMark(workspace.name)}
                      </span>
                      {active && (
                        <span className="rounded-full bg-indigo-600 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-white">
                          Selected
                        </span>
                      )}
                    </div>
                    <h3 className="mt-6 truncate text-base font-bold">{workspace.name}</h3>
                    <p className="mt-1 truncate text-xs text-slate-500">{workspace.slug}</p>
                    <div className="mt-5 flex items-center gap-1 text-xs font-semibold text-indigo-600">
                      Open workspace{' '}
                      <ChevronRight
                        size={14}
                        className="transition-transform group-hover:translate-x-0.5"
                      />
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </section>

        {currentWorkspace && (
          <section className="mt-12 border-t border-slate-200 pt-10">
            <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
              <div className="flex items-start gap-3">
                <span className="grid h-10 w-10 place-items-center rounded-xl bg-violet-100 font-bold text-violet-700">
                  {workspaceMark(currentWorkspace.name)}
                </span>
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.14em] text-violet-600">
                    {currentWorkspace.name}
                  </p>
                  <h2 className="mt-1 text-2xl font-bold tracking-tight">Projects</h2>
                </div>
              </div>
              <Button size="sm" onClick={() => setShowCreateProject(true)}>
                <Plus size={15} /> New project
              </Button>
            </div>
            {projects.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-10 text-center">
                <FolderKanban size={24} className="mx-auto text-slate-400" />
                <h3 className="mt-3 font-semibold">No projects yet</h3>
                <p className="mt-1 text-sm text-slate-500">
                  Create the first project in {currentWorkspace.name} to begin.
                </p>
                <Button size="sm" className="mt-5" onClick={() => setShowCreateProject(true)}>
                  <Plus size={15} /> Create project
                </Button>
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {projects.map((project) => (
                  <button
                    key={project.id}
                    onClick={() => open(project)}
                    className="group rounded-2xl border border-slate-200 bg-white p-5 text-left transition hover:-translate-y-0.5 hover:border-violet-200 hover:shadow-lg hover:shadow-slate-200/70 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:ring-offset-2"
                  >
                    <div className="flex items-start justify-between">
                      <span className="grid h-10 w-10 place-items-center rounded-xl bg-violet-50 text-violet-600">
                        <FolderKanban size={19} />
                      </span>
                      <ArrowUpRight
                        size={17}
                        className="text-slate-300 transition group-hover:text-violet-600"
                      />
                    </div>
                    <h3 className="mt-6 truncate text-base font-bold">{project.name}</h3>
                    <p className="mt-1 truncate text-xs text-slate-500">{project.slug}</p>
                    <div className="mt-5 flex items-center gap-1 text-xs text-slate-400">
                      <Users size={13} /> Project workspace
                    </div>
                  </button>
                ))}
              </div>
            )}
          </section>
        )}
      </main>
      <CreateWorkspaceDialog open={showCreateWs} onClose={() => setShowCreateWs(false)} />
      {currentWorkspace && (
        <CreateProjectDialog
          open={showCreateProject}
          onClose={() => setShowCreateProject(false)}
          workspaceId={currentWorkspace.id}
        />
      )}
    </div>
  );
}
