import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Plus, PanelLeftClose, PanelLeftOpen, FileText } from 'lucide-react';
import { WorkspaceSwitcher } from './WorkspaceSwitcher';
import { ProjectSwitcher } from './ProjectSwitcher';
import { useAuth } from '@/hooks/useAuth';
import { useUIStore } from '@/stores/ui.store';
import { useWorkspaceStore } from '@/stores/workspace.store';
import { usePages } from '@/hooks/usePages';
import { useAccess } from '@/hooks/useAccess';
import { CreatePageDialog } from '@/features/page-mgmt/CreatePageDialog';
import { Menu, MenuItem } from '@/components/ui/Menu';
import type { Page, PageKind } from '@/models/page.model';
import { canEditProject, isSystemAdmin } from '@/lib/permissions';

interface SectionDef {
  id: string;
  label: string;
  kinds: PageKind[];
  createKind?: PageKind;
}

const SECTIONS: SectionDef[] = [
  { id: 'context',   label: 'CONTEXT',   kinds: ['context', 'org'] },
  { id: 'data',      label: 'DATA',      kinds: ['data', 'data_view'],          createKind: 'data' },
  { id: 'interface', label: 'INTERFACE', kinds: ['interface_list', 'icd'],      createKind: 'interface_list' },
  { id: 'mgmt',      label: 'MGMT',      kinds: ['sheet'],                      createKind: 'sheet' },
];

export function Sidebar() {
  const { user } = useAuth();
  const collapsed = useUIStore((s) => s.collapsedSections);
  const toggleSection = useUIStore((s) => s.toggleSection);
  const currentProject = useWorkspaceStore((s) => s.currentProject);
  const currentWorkspace = useWorkspaceStore((s) => s.currentWorkspace);
  const minimized = useUIStore((s) => s.sidebarMinimized);
  const toggleSidebar = useUIStore((s) => s.toggleSidebar);
  const { data: access } = useAccess(currentWorkspace?.id, currentProject?.id);
  const mayEdit = isSystemAdmin(user) || canEditProject(access?.workspaceRole, access?.projectRole);
  const { data: pages = [] } = usePages(currentProject?.id ?? null);
  const [createDialog, setCreateDialog] = useState<{ kind: PageKind } | null>(null);

  return (
    <aside className="h-full bg-sidebar flex flex-col text-slate-200">
      <div className="p-3 border-b border-slate-800">
        <button onClick={toggleSidebar} title={minimized ? 'Expand sidebar' : 'Minimize sidebar'} className="mb-2 flex w-full justify-end text-slate-400 hover:text-white">{minimized ? <PanelLeftOpen size={18}/> : <PanelLeftClose size={18}/>}</button>
        {!minimized && <><WorkspaceSwitcher /><ProjectSwitcher /></>}
      </div>

      <nav className="flex-1 overflow-y-auto py-2">
        {!minimized && SECTIONS.map((sec) => {
          const isOpen = !collapsed[sec.id];
          const sectionPages = pages.filter((p) => sec.kinds.includes(p.kind));
          const hasInterfaceList = sec.id === 'interface' && pages.some((p) => p.kind === 'interface_list');
          const showCreate = mayEdit && currentProject && (sec.id === 'context' || sec.createKind)
            && !(sec.createKind === 'interface_list' && hasInterfaceList);

          return (
            <div key={sec.id} className="mb-2">
              <div className="px-3 flex items-center justify-between">
                <button onClick={() => toggleSection(sec.id)}
                  className="text-[10px] font-bold tracking-wider text-slate-500 hover:text-slate-300">
                  {isOpen ? '−' : '+'} {sec.label}
                </button>
                {showCreate && sec.id === 'context' && <Menu align="right" trigger={<button title="Create Context or Org page" className="text-slate-500 hover:text-slate-200"><Plus size={14}/></button>}>
                  <MenuItem onClick={() => setCreateDialog({kind: 'context'})}>Context page</MenuItem>
                  <MenuItem onClick={() => setCreateDialog({kind: 'org'})}>Org page</MenuItem>
                </Menu>}
                {showCreate && sec.id !== 'context' && (
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

      {minimized && <div className="p-3 text-slate-500"><FileText size={18}/></div>}

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

  function open() {
    if (!workspaceSlug || !projectSlug) return;
    navigate(`/w/${workspaceSlug}/p/${projectSlug}/page/${page.id}`);
  }

  return (
    <div className={`flex rounded px-3 py-1.5 text-xs ${isActive ? 'bg-sidebar-active text-white' : 'text-slate-300 hover:bg-sidebar-hover'}`}>
      <button onClick={open} className="flex-1 truncate text-left">{page.title}</button>
    </div>
  );
}
