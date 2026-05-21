import { Link } from 'react-router-dom';
import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { ArrowLeft, Plus } from 'lucide-react';
import { useWorkspaces } from '@/hooks/useWorkspaces';
import { Spinner } from '@/components/ui/Spinner';
import { WorkspaceMembersPanel } from '@/features/workspace-mgmt/WorkspaceMembersPanel';
import { CreateWorkspaceDialog } from '@/features/workspace-mgmt/CreateWorkspaceDialog';
import { useDeleteWorkspace, useRenameWorkspace } from '@/hooks/useWorkspaceMutations';

export function AdminSettingsPage() {
  const { data: workspaces = [], isLoading } = useWorkspaces();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const rename = useRenameWorkspace();
  const del = useDeleteWorkspace();
  const selected = workspaces.find((w) => w.id === selectedId) ?? workspaces[0] ?? null;

  return (
    <div className="min-h-full bg-slate-50">
      <header className="border-b border-slate-200 bg-white px-6 h-14 flex items-center gap-4">
        <Link to="/home"><Button variant="ghost" size="sm"><ArrowLeft size={14}/> Back</Button></Link>
        <h1 className="text-lg font-bold text-slate-900">Admin Settings</h1>
      </header>
      <main className="max-w-5xl mx-auto p-8 grid grid-cols-[260px_1fr] gap-6">
        <aside className="bg-white border border-slate-200 rounded-lg p-3">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-sm font-semibold text-slate-900">Workspaces</h2>
            <button onClick={() => setShowCreate(true)} className="text-slate-500 hover:text-slate-700">
              <Plus size={14}/>
            </button>
          </div>
          {isLoading ? <Spinner /> : workspaces.length === 0 ? (
            <p className="text-xs text-slate-500">No workspaces.</p>
          ) : (
            <ul className="space-y-1">
              {workspaces.map((w) => (
                <li key={w.id}>
                  <button onClick={() => setSelectedId(w.id)}
                    className={`w-full text-left px-2 py-1.5 rounded text-sm ${selected?.id === w.id ? 'bg-blue-50 text-blue-700 font-medium' : 'text-slate-700 hover:bg-slate-50'}`}>
                    {w.name}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </aside>

        <section className="bg-white border border-slate-200 rounded-lg p-5">
          {selected ? (
            <>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-slate-900">{selected.name}</h2>
                <div className="flex gap-2">
                  <Button size="sm" variant="secondary" onClick={() => {
                    const n = prompt('New workspace name', selected.name);
                    if (n && n.trim() && n !== selected.name) rename.mutate({ id: selected.id, name: n.trim() });
                  }}>Rename</Button>
                  <Button size="sm" variant="danger" onClick={() => {
                    if (confirm(`Delete workspace "${selected.name}"? All projects and pages inside will be lost.`)) {
                      del.mutate(selected.id);
                      setSelectedId(null);
                    }
                  }}>Delete</Button>
                </div>
              </div>
              <WorkspaceMembersPanel workspaceId={selected.id} />
            </>
          ) : (
            <p className="text-sm text-slate-500">Select a workspace or create one.</p>
          )}
        </section>
      </main>

      <CreateWorkspaceDialog open={showCreate} onClose={() => setShowCreate(false)} />
    </div>
  );
}
