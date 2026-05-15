import { Plus, LogOut } from 'lucide-react';
import { WorkspaceSwitcher } from './WorkspaceSwitcher';
import { ProjectSwitcher } from './ProjectSwitcher';
import { useAuth } from '@/hooks/useAuth';
import { useUIStore } from '@/stores/ui.store';

const SECTIONS = [
  { id: 'context', label: 'CONTEXT PAGES', createable: true },
  { id: 'data', label: 'DATA PAGES', createable: false },
  { id: 'interface', label: 'INTERFACE PAGES', createable: false },
  { id: 'mgmt', label: 'MGMT PAGES', createable: true },
];

export function Sidebar() {
  const { signOut, user } = useAuth();
  const collapsed = useUIStore((s) => s.collapsedSections);
  const toggleSection = useUIStore((s) => s.toggleSection);

  return (
    <aside className="h-full bg-sidebar flex flex-col text-slate-200">
      <div className="p-3 border-b border-slate-800">
        <WorkspaceSwitcher />
        <ProjectSwitcher />
      </div>
      <nav className="flex-1 overflow-y-auto py-2">
        {SECTIONS.map((sec) => {
          const isOpen = !collapsed[sec.id];
          return (
            <div key={sec.id} className="mb-2">
              <div className="px-3 flex items-center justify-between">
                <button
                  onClick={() => toggleSection(sec.id)}
                  className="text-[10px] font-bold tracking-wider text-slate-500 hover:text-slate-300"
                >
                  {isOpen ? '−' : '+'} {sec.label}
                </button>
                {sec.createable && (
                  <button title="Create new" className="text-slate-500 hover:text-slate-200">
                    <Plus size={14} />
                  </button>
                )}
              </div>
              {isOpen && (
                <div className="mt-1 px-3 text-xs text-slate-500 italic">(no pages yet)</div>
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
    </aside>
  );
}
