import { useState } from 'react';
import { Dialog, DialogFooter } from '@/components/ui/Dialog';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useCreatePage } from '@/hooks/usePageMutations';
import { usePages } from '@/hooks/usePages';
import type { PageKind } from '@/models/page.model';

const KIND_LABELS: Record<PageKind, string> = {
  context: 'Context Page',
  org: 'Org Page',
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
  const { data: pages = [] } = usePages(projectId);
  const [linkedContextPageId, setLinkedContextPageId] = useState('');
  const [linkedSourcePageId, setLinkedSourcePageId] = useState('');
  const contextPages = pages.filter((page) => page.kind === 'context');
  const managementSources = pages.filter((page) => page.kind === 'data' || page.kind === 'sheet');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) {
      setError('Title is required');
      return;
    }
    if (kind === 'org' && !linkedContextPageId) {
      setError('Select a linked Context Page');
      return;
    }
    if (kind === 'sheet' && !linkedSourcePageId) {
      setError('Select a Data or Management source');
      return;
    }
    setError(null);
    try {
      await create.mutateAsync({
        projectId,
        kind,
        title: title.trim(),
        metadata:
          kind === 'org'
            ? { linkedContextPageId }
            : kind === 'sheet'
              ? { linkedDataPageId: linkedSourcePageId }
              : undefined,
      });
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
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={`Untitled ${KIND_LABELS[kind]}`}
            autoFocus
          />
        </div>
        {kind === 'org' && (
          <div>
            <label className="text-xs font-medium text-slate-700 block mb-1">
              Linked Context Page <span className="text-red-500">*</span>
            </label>
            <select
              required
              value={linkedContextPageId}
              onChange={(e) => setLinkedContextPageId(e.target.value)}
              className="w-full h-9 rounded-md border border-slate-300 bg-white px-2 text-sm text-slate-900"
            >
              <option value="">Select a Context Page…</option>
              {contextPages.map((page) => (
                <option key={page.id} value={page.id}>
                  {page.title}
                </option>
              ))}
            </select>
            <p className="mt-1 text-[11px] text-slate-500">
              Org objects are inherited from this context and its linked data entities.
            </p>
          </div>
        )}
        {kind === 'sheet' && (
          <div>
            <label className="text-xs font-medium text-slate-700 block mb-1">
              Inherited source <span className="text-red-500">*</span>
            </label>
            <select
              required
              value={linkedSourcePageId}
              onChange={(e) => setLinkedSourcePageId(e.target.value)}
              className="w-full h-9 rounded-md border border-slate-300 bg-white px-2 text-sm text-slate-900"
            >
              <option value="">Select Data or Mgmt Page…</option>
              {managementSources.map((page) => (
                <option key={page.id} value={page.id}>
                  {page.title} ({page.kind === 'data' ? 'Data' : 'Mgmt'})
                </option>
              ))}
            </select>
            <p className="mt-1 text-[11px] text-slate-500">
              Upstream rows, columns, and changes remain inherited and read-only.
            </p>
          </div>
        )}
        {error && <div className="text-xs text-red-600">{error}</div>}
        <DialogFooter>
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={create.isPending}>
            {create.isPending ? 'Creating…' : 'Create'}
          </Button>
        </DialogFooter>
      </form>
    </Dialog>
  );
}
