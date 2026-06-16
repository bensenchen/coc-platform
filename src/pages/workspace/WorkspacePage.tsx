import { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useWorkspaces } from '@/hooks/useWorkspaces';
import { useProjects } from '@/hooks/useCurrentProject';
import { useWorkspaceStore } from '@/stores/workspace.store';
import { usePages } from '@/hooks/usePages';
import { Spinner } from '@/components/ui/Spinner';
import { ContextCanvas, ContextToolBar, PropertiesPanel } from '@/features/context-page';
import { DataTable } from '@/features/data-page';
import { useCanvasStore } from '@/stores/canvas.store';
import type { PageKind } from '@/models/page.model';

const KIND_LABEL: Record<PageKind, string> = {
  context: 'Context Page',
  data: 'Data Page',
  data_view: 'Data View',
  interface_list: 'List of Interfaces',
  icd: 'ICD Page',
  sheet: 'Sheet Page',
};

function nextPhase(kind: PageKind): number {
  switch (kind) {
    case 'data_view': return 8;
    case 'interface_list': case 'icd': return 9;
    case 'sheet': return 8;
    default: return 99;
  }
}

export function WorkspacePage() {
  const { workspaceSlug, projectSlug, pageId } = useParams();
  const navigate = useNavigate();
  const { data: workspaces, isLoading: wsLoading } = useWorkspaces();
  const { currentWorkspace, setCurrentWorkspace, currentProject, setCurrentProject } = useWorkspaceStore();
  const { data: projects } = useProjects(currentWorkspace?.id ?? null);
  const { data: pages = [] } = usePages(currentProject?.id ?? null);
  const clearCanvas = useCanvasStore((s) => s.clearSelection);

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

  useEffect(() => { clearCanvas(); }, [pageId, clearCanvas]);

  if (wsLoading) return <div className="flex h-full items-center justify-center"><Spinner /></div>;

  const page = pageId ? pages.find((p) => p.id === pageId) ?? null : null;

  if (!page) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center text-slate-400">
          <div className="text-6xl mb-3">⬡</div>
          <div className="text-sm font-medium text-slate-600">
            {currentProject?.name ?? 'No project selected'}
          </div>
          <div className="text-xs mt-1">Select a page from the sidebar, or create one with the "+" buttons.</div>
        </div>
      </div>
    );
  }

  if (page.kind === 'context') {
    return (
      <div className="h-full flex flex-col overflow-hidden">
        <header className="bg-white border-b border-slate-200 px-6 h-12 flex items-center gap-3 flex-shrink-0">
          <span className="text-xs font-medium uppercase tracking-wider text-slate-500">{KIND_LABEL[page.kind]}</span>
          <h1 className="text-base font-semibold text-slate-900">{page.title}</h1>
        </header>
        <ContextToolBar pageId={page.id} />
        <div className="flex flex-1 overflow-hidden">
          <ContextCanvas pageId={page.id} />
          <PropertiesPanel pageId={page.id} />
        </div>
      </div>
    );
  }

  if (page.kind === 'data') {
    return (
      <div className="h-full flex flex-col overflow-hidden">
        <header className="bg-white border-b border-slate-200 px-6 h-12 flex items-center gap-3 flex-shrink-0">
          <span className="text-xs font-medium uppercase tracking-wider text-slate-500">{KIND_LABEL[page.kind]}</span>
          <h1 className="text-base font-semibold text-slate-900">{page.title}</h1>
        </header>
        <DataTable pageId={page.id} />
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <header className="bg-white border-b border-slate-200 px-6 h-12 flex items-center gap-3">
        <span className="text-xs font-medium uppercase tracking-wider text-slate-500">{KIND_LABEL[page.kind]}</span>
        <h1 className="text-base font-semibold text-slate-900">{page.title}</h1>
      </header>
      <div className="flex-1 flex items-center justify-center text-slate-400">
        <div className="text-center">
          <div className="text-sm">Page renderer for <strong>{KIND_LABEL[page.kind]}</strong> comes in Phase {nextPhase(page.kind)}+</div>
          <div className="text-xs mt-1 font-mono text-slate-300">{page.id}</div>
        </div>
      </div>
    </div>
  );
}
