import { Search, Settings, LogOut, ShieldCheck, UserRound } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { usePages } from '@/hooks/usePages';
import { useWorkspaceStore } from '@/stores/workspace.store';
import { isSystemAdmin } from '@/lib/permissions';
import { Menu, MenuItem } from '@/components/ui/Menu';

export function AppNavigation() {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const project = useWorkspaceStore((s) => s.currentProject);
  const workspace = useWorkspaceStore((s) => s.currentWorkspace);
  const { data: pages = [] } = usePages(project?.id ?? null);
  const [query, setQuery] = useState('');
  const results = useMemo(() => query.trim() ? pages.filter((p) => p.title.toLowerCase().includes(query.toLowerCase())).slice(0, 6) : [], [pages, query]);

  return (
    <header className="relative z-50 flex h-16 w-full flex-shrink-0 items-center gap-5 border-b border-slate-200 bg-white px-5 shadow-sm">
      <Link to="/home" aria-label="COC home" className="flex flex-shrink-0 items-center gap-2 rounded-lg focus:ring-2 focus:ring-indigo-500">
        <span className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-indigo-600 to-violet-600 text-sm font-black text-white">C</span>
        <span className="hidden font-bold text-slate-900 sm:block">COC Platform</span>
      </Link>
      <div className="relative mx-auto w-full max-w-xl">
        <Search className="absolute left-3 top-2.5 text-slate-400" size={16} />
        <input value={query} onChange={(e) => setQuery(e.target.value)} disabled={!project}
          placeholder={project ? `Search ${project.name} pages…` : 'Open a project to search'}
          className="h-9 w-full rounded-lg border border-slate-200 bg-slate-50 pl-9 pr-3 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 disabled:cursor-not-allowed" />
        {results.length > 0 && workspace && project && <div className="absolute top-11 w-full overflow-hidden rounded-lg border border-slate-200 bg-white py-1 shadow-xl">
          {results.map((page) => <button key={page.id} onClick={() => { navigate(`/w/${workspace.slug}/p/${project.slug}/page/${page.id}`); setQuery(''); }} className="block w-full px-3 py-2 text-left text-sm hover:bg-indigo-50">{page.title}<span className="ml-2 text-xs text-slate-400">{page.kind}</span></button>)}
        </div>}
      </div>
      <Menu trigger={<button aria-label="Account menu" className="grid h-9 w-9 place-items-center rounded-full bg-slate-100 text-slate-600 hover:bg-slate-200"><UserRound size={17}/></button>}>
        <div className="max-w-56 truncate border-b border-slate-100 px-3 py-2 text-xs text-slate-500">{user?.email}</div>
        <MenuItem onClick={() => navigate('/settings')}><span className="flex items-center gap-2"><Settings size={14}/> Settings</span></MenuItem>
        {isSystemAdmin(user) && <MenuItem onClick={() => navigate('/admin')}><span className="flex items-center gap-2"><ShieldCheck size={14}/> System administration</span></MenuItem>}
        <MenuItem onClick={() => signOut()}><span className="flex items-center gap-2"><LogOut size={14}/> Sign out</span></MenuItem>
      </Menu>
    </header>
  );
}
