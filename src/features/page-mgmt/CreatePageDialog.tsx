import { useState } from 'react';
import { Dialog, DialogFooter } from '@/components/ui/Dialog';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useCreatePage } from '@/hooks/usePageMutations';
import type { PageKind } from '@/models/page.model';

const KIND_LABELS: Record<PageKind, string> = {
  context: 'Context Page',
  data: 'Data Page',
  data_view: 'Data View',
  interface_list: 'List of Interfaces',
  icd: 'ICD Page',
  sheet: 'Sheet Page',
};

interface Props {
  open: boolean;
  onClose: () => void;
  projectId: string;
  kind: PageKind;
  defaultTitle?: string;
}

export function CreatePageDialog({ open, onClose, projectId, kind, defaultTitle }: Props) {
  const [title, setTitle] = useState(defaultTitle ?? '');
  const [error, setError] = useState<string | null>(null);
  const create = useCreatePage();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) { setError('Title is required'); return; }
    setError(null);
    try {
      await create.mutateAsync({ projectId, kind, title: title.trim() });
      setTitle('');
      onClose();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  return (
    <Dialog open={open} onClose={onClose} title={`Create ${KIND_LABELS[kind]}`}>
      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <label className="text-xs font-medium text-slate-700 block mb-1">Title</label>
          <Input value={title} onChange={(e) => setTitle(e.target.value)}
            placeholder={`Untitled ${KIND_LABELS[kind]}`} autoFocus />
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
