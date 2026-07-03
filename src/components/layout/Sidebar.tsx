import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Plus, LogOut, MoreHorizontal, Home } from 'lucide-react';
import { WorkspaceSwitcher } from './WorkspaceSwitcher';
import { ProjectSwitcher } from './ProjectSwitcher';
import { useAuth } from '@/hooks/useAuth';
import { useUIStore } from '@/stores/ui.store';
import { useWorkspaceStore } from '@/stores/workspace.store';
import { usePages } from '@/hooks/usePages';
import { useDeletePage, useRenamePage } from '@/hooks/usePageMutations';
import { CreatePageDialog } from '@/features/page-mgmt/CreatePageDialog';
import { Menu, MenuItem } from '@/components/ui/Menu';
import { cn } from '@/lib/cn';
import type { Page, PageKind } from '@/models/page.model';

interface SectionDef {
  id: string;
  label: string;
  kinds: PageKind[];
  createKind?: PageKind;
}

const SECTIONS: SectionDef[] = [
  { id: 'context',   label: 'CONTEXT PAGES',   kinds: ['context'],                    createKind: 'context' },
  { id: 'data',      label: 'DATA PAGES',      kinds: ['data', 'data_view'],          createKind: 'data' },
  { id: 'interface', label: 'INTERFACE PAGES', kinds: ['interface_list', 'icd'],      createKind: 'interface_list' },
  { id: 'mgmt',      label: 'MGMT PAGES',      kinds: ['sheet'],                      createKind: 'sheet' },
];

export function Sidebar() {
  const navigate = useNavigate();
  const { signOut, user } = useAuth();
  const collapsed = useUIStore((s) => s.collapsedSections);
  const toggleSection = useUIStore((s) => s.toggleSection);
  const currentProject = useWorkspaceStore((s) => s.currentProject);
  const { data: pages = [] } = usePages(currentProject?.id ?? null);
  const [createDialog, setCreateDialog] = useState<{ kind: PageKind } | null>(null);

  return (
    <aside className="h-full bg-sidebar flex flex-col text-slate-200">
      <div className="p-3 border-b border-slate-800">
        <button
          onClick={() => navigate('/home')}
          className="w-full flex items-center gap-2 text-slate-300 hover:text-white hover:bg-sidebar-hover rounded px-2 py-1.5 mb-2 text-sm"
        >
          <Home size={14} /> Home
        </button>
        <WorkspaceSwitcher />
        <ProjectSwitcher />
      </div>

      <nav className="flex-1 overflow-y-auto py-2">
        {SECTIONS.map((sec) => {
          const isOpen = !collapsed[sec.id];
          const sectionPages = pages.filter((p) => sec.kinds.includes(p.kind));
          const hasInterfaceList = sec.id === 'interface' && pages.some((p) => p.kind === 'interface_list');
          const showCreate = sec.createKind && currentProject
            && !(sec.createKind === 'interface_list' && hasInterfaceList);

          return (
            <div key={sec.id} className="mb-2">
              <div className="px-3 flex items-center justify-between">
                <button onClick={() => toggleSection(sec.id)}
                  className="text-[10px] font-bold tracking-wider text-slate-500 hover:text-slate-300">
                  {isOpen ? '−' : '+'} {sec.label}
                </button>
                {showCreate && (
                  <button
                    title={sec.createKind === 'interface_list' ? 'Create List of Interfaces' : 'Create page'}
                    onClick={() => setCreateDialog({ kind: sec.createKind! })}
                    className="text-slate-500 hover:text-slate-200"
                  >
                    <Plus size={14} />
                  </button>
                )}
              </div>
              {isOpen && (
                <div className="mt-1 px-1">
                  {sectionPages.length === 0 ? (
                    <div className="px-3 text-xs text-slate-500 italic">empty</div>
                  ) : (
                    sectionPages.map((p) => <PageRow key={p.id} page={p} />)
                  )}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      <div className="p-3 border-t border-slate-800">
        <div className="flex items-center justify-between">
          <div className="text-xs text-slate-400 truncate">{user?.email}</div>
          <button onClick={() => signOut()} className="text-slate-500 hover:text-slate-200" title="Sign out">
            <LogOut size={14} />
          </button>
        </div>
      </div>

      {createDialog && currentProject && (
        <CreatePageDialog
          open={true}
          onClose={() => setCreateDialog(null)}
          projectId={currentProject.id}
          kind={createDialog.kind}
          defaultTitle={createDialog.kind === 'interface_list' ? 'List of Interfaces' : undefined}
        />
      )}
    </aside>
  );
}

function PageRow({ page }: { page: Page }) {
  const navigate = useNavigate();
  const { pageId, workspaceSlug, projectSlug } = useParams();
  const isActive = pageId === page.id;
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(page.title);
  const rename = useRenamePage();
  const del = useDeletePage();

  function open() {
    if (!workspaceSlug || !projectSlug) return;
    navigate(`/w/${workspaceSlug}/p/${projectSlug}/page/${page.id}`);
  }

  function commitRename() {
    if (title.trim() && title !== page.title) {
      rename.mutate({ id: page.id, title: title.trim() });
    }
    setEditing(false);
  }

  function handleDelete() {
    if (confirm(`Delete "${page.title}"? This cannot be undone.`)) {
      del.mutate(page.id);
    }
  }

  return (
    <div className={cn(
      'group flex items-center justify-between rounded text-xs px-3 py-1.5',
      isActive ? 'bg-sidebar-active text-white' : 'text-slate-300 hover:bg-sidebar-hover',
    )}>
      {editing ? (
        <input autoFocus value={title} onChange={(e) => setTitle(e.target.value)}
          onBlur={commitRename}
          onKeyDown={(e) => {
            if (e.key === 'Enter') commitRename();
            if (e.key === 'Escape') { setTitle(page.title); setEditing(false); }
          }}
          className="flex-1 bg-transparent border-b border-slate-500 outline-none text-xs"
        />
      ) : (
        <button onClick={open} className="flex-1 text-left truncate">{page.title}</button>
      )}
      <Menu trigger={
        <button className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-white p-0.5">
          <MoreHorizontal size={12} />
        </button>
      }>
        <MenuItem onClick={() => setEditing(true)}>Rename</MenuItem>
        <MenuItem onClick={handleDelete} danger>Delete</MenuItem>
      </Menu>
    </div>
  );
}
