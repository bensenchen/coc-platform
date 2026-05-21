import { useState } from 'react';
import { Dialog, DialogFooter } from '@/components/ui/Dialog';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useCreateWorkspace } from '@/hooks/useWorkspaceMutations';
import { useWorkspaceStore } from '@/stores/workspace.store';

interface Props { open: boolean; onClose: () => void; }

export function CreateWorkspaceDialog({ open, onClose }: Props) {
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const setCurrentWorkspace = useWorkspaceStore((s) => s.setCurrentWorkspace);
  const create = useCreateWorkspace();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) { setError('Name is required'); return; }
    setError(null);
    try {
      const ws = await create.mutateAsync(name.trim());
      setCurrentWorkspace(ws);
      setName('');
      onClose();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  return (
    <Dialog open={open} onClose={onClose} title="Create workspace">
      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <label className="text-xs font-medium text-slate-700 block mb-1">Workspace name</label>
          <Input value={name} onChange={(e) => setName(e.target.value)}
            placeholder="e.g. COC, Acme Engineering" autoFocus />
        </div>
        {error && <div className="text-xs text-red-600">{error}</div>}
        <DialogFooter>
          <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit" disabled={create.isPending}>
            {create.isPending ? 'Creating…' : 'Create'}
          </Button>
        </DialogFooter>
      </form>
    </Dialog>
  );
}
