import { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useWorkspaces } from '@/hooks/useWorkspaces';
import { useProjects } from '@/hooks/useCurrentProject';
import { useWorkspaceStore } from '@/stores/workspace.store';
import { usePages } from '@/hooks/usePages';
import { Spinner } from '@/components/ui/Spinner';
import type { PageKind } from '@/models/page.model';
import { ContextCanvas, ContextToolBar, PropertiesPanel } from '@/features/context-page';
import { DataTable } from '@/features/data-page';
import { SheetTable } from '@/features/sheet-page';
import { DomainSyncProvider } from '@/hooks/useDomainSync';
import { SyncStatus } from '@/components/layout/SyncStatus';
import { MoreHorizontal } from 'lucide-react';
import { Menu, MenuItem } from '@/components/ui/Menu';
import { useDeletePage, useRenamePage } from '@/hooks/usePageMutations';
import { useAccess } from '@/hooks/useAccess';
import { canEditProject, isSystemAdmin } from '@/lib/permissions';
import { useAuth } from '@/hooks/useAuth';

const KIND_LABEL: Record<PageKind, string> = {
  context: 'Context Page',
  org: 'Org Page',
  data: 'Data Page',
  data_view: 'Data View',
  interface_list: 'INTERFACE PAGE',
  icd: 'ICD Page',
  sheet: 'MGMT PAGE',
};

function nextPhase(kind: PageKind): number {
  switch (kind) {
    case 'context':
    case 'org':
      return 6;
    case 'data':
    case 'data_view':
      return 7;
    case 'sheet':
      return 8;
    case 'interface_list':
    case 'icd':
      return 9;
  }
}

export function WorkspacePage() {
  const { workspaceSlug, projectSlug, pageId } = useParams();
  const navigate = useNavigate();
  const { data: workspaces, isLoading: wsLoading } = useWorkspaces();
  const { currentWorkspace, setCurrentWorkspace, currentProject, setCurrentProject } =
    useWorkspaceStore();
  const { data: projects } = useProjects(currentWorkspace?.id ?? null);
  const { data: pages = [], isFetched: pagesFetched } = usePages(currentProject?.id ?? null);
  const { user } = useAuth();
  const { data: access } = useAccess(currentWorkspace?.id, currentProject?.id);
  const rename = useRenamePage();
  const del = useDeletePage();
  const mayEdit = isSystemAdmin(user) || canEditProject(access?.workspaceRole, access?.projectRole);

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

  useEffect(() => {
    if (pageId && pagesFetched && currentProject && !pages.some((candidate) => candidate.id === pageId)) {
      // A remotely deleted page must not leave editors on a stale entity.
      navigate(`/w/${workspaceSlug}/p/${projectSlug}`, { replace: true });
    }
  }, [currentProject, navigate, pageId, pages, pagesFetched, projectSlug, workspaceSlug]);

  if (wsLoading || !currentWorkspace)
    return (
      <div className="flex h-full items-center justify-center">
        <Spinner />
      </div>
    );

  const page = pageId ? (pages.find((p) => p.id === pageId) ?? null) : null;

  if (!page) {
    return (
      <DomainSyncProvider workspaceId={currentWorkspace!.id} projectId={currentProject?.id}>
      <div className="h-full flex items-center justify-center">
        <div className="text-center text-slate-400">
          <div className="text-6xl mb-3">⬡</div>
          <div className="text-sm font-medium text-slate-600">
            {currentProject?.name ?? 'No project selected'}
          </div>
          <div className="text-xs mt-1">
            Select a page from the sidebar, or create one with the "+" buttons.
          </div>
        </div>
      </div>
      </DomainSyncProvider>
    );
  }

  return (
    <DomainSyncProvider workspaceId={currentWorkspace!.id} projectId={currentProject?.id} pageId={page.id}>
    <div className="h-full flex flex-col">
      <SyncStatus />
      <header className="bg-white border-b border-slate-200 px-6 h-12 flex items-center gap-3 flex-shrink-0">
        <span className="text-xs font-medium uppercase tracking-wider text-slate-500">
          {KIND_LABEL[page.kind]}
        </span>
        <h1 className="text-base font-semibold text-slate-900">{page.title}</h1>
        {mayEdit && <div className="ml-auto"><Menu trigger={<button aria-label="Page actions" className="rounded p-1 text-slate-500 hover:bg-slate-100"><MoreHorizontal size={18}/></button>}>
          <MenuItem onClick={() => { const title = prompt('Page title', page.title); if (title?.trim() && title.trim() !== page.title) rename.mutate({id: page.id, title: title.trim()}); }}>Rename</MenuItem>
          <MenuItem danger onClick={() => { if (confirm(`Delete "${page.title}"? This cannot be undone.`)) { del.mutate(page.id); navigate(`/w/${workspaceSlug}/p/${projectSlug}`); } }}>Delete page</MenuItem>
        </Menu></div>}
      </header>

      {(page.kind === 'context' || page.kind === 'org') && (
        <div className="flex flex-col flex-1 overflow-hidden">
          <ContextToolBar pageId={page.id} />
          <div className="flex flex-1 overflow-hidden">
            <ContextCanvas pageId={page.id} />
            <PropertiesPanel pageId={page.id} projectId={currentProject?.id ?? null} />
          </div>
        </div>
      )}

      {page.kind === 'data' && (
        <div className="flex-1 overflow-hidden">
          <DataTable pageId={page.id} projectId={currentProject?.id ?? null} />
        </div>
      )}

      {page.kind === 'sheet' && currentProject && (
        <div className="flex-1 overflow-hidden">
          <SheetTable sheetPage={page} projectId={currentProject.id} />
        </div>
      )}

      {page.kind !== 'context' && page.kind !== 'org' && page.kind !== 'data' && page.kind !== 'sheet' && (
        <div className="flex-1 flex items-center justify-center text-slate-400">
          <div className="text-center">
            <div className="text-sm">
              Page renderer for <strong>{KIND_LABEL[page.kind]}</strong> comes in Phase{' '}
              {nextPhase(page.kind)}+
            </div>
            <div className="text-xs mt-1 font-mono text-slate-300">{page.id}</div>
          </div>
        </div>
      )}
    </div>
    </DomainSyncProvider>
  );
}
