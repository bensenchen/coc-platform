import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { queryKeys } from '@/lib/query-keys';
import { subscribeToDomainChanges, type ConnectionState, type DomainChange } from '@/services/realtime.service';
import type { CanvasData } from '@/hooks/useCanvasObjects';
import type { SheetData } from '@/hooks/useSheet';

interface SyncContextValue {
  state: ConnectionState;
  error: Error | null;
  deferredCount: number;
  beginEditing: (entity: string) => void;
  endEditing: (entity: string) => void;
}

const SyncContext = createContext<SyncContextValue>({
  state: 'connected', error: null, deferredCount: 0, beginEditing: () => undefined, endEditing: () => undefined,
});

function changeId(change: DomainChange): string | undefined {
  const record = change.event === 'DELETE' ? change.old : change.next;
  return (record.id ?? record.connector_id ??
    (record.row_id && record.column_id ? `${record.row_id}:${record.column_id}` : undefined)) as string | undefined;
}

export function DomainSyncProvider({ workspaceId, projectId, pageId, children }: {
  workspaceId: string; projectId?: string | null; pageId?: string | null; children: ReactNode;
}) {
  const qc = useQueryClient();
  const [state, setState] = useState<ConnectionState>('connecting');
  const [error, setError] = useState<Error | null>(null);
  const [deferredCount, setDeferredCount] = useState(0);
  const editing = useRef(new Set<string>());
  const deferred = useRef(new Map<string, DomainChange>());

  const apply = useCallback((change: DomainChange) => {
    if (change.entity === 'project') void qc.invalidateQueries({ queryKey: queryKeys.projects(workspaceId) });
    if (change.entity === 'page' && projectId) void qc.invalidateQueries({ queryKey: queryKeys.pages(projectId) });
    if ((change.entity === 'canvas_object' || change.entity === 'connector_anchor') && pageId) {
      if (change.entity === 'connector_anchor') {
        const id = changeId(change);
        const canvas = qc.getQueryData<CanvasData>(queryKeys.canvas(pageId));
        if (id && canvas && !canvas.objects.some((object) => object.id === id)) return;
      }
      void qc.invalidateQueries({ queryKey: queryKeys.canvas(pageId) });
    }
    if ((change.entity === 'sheet_row' || change.entity === 'sheet_column' || change.entity === 'sheet_cell') && pageId) {
      if (change.entity === 'sheet_cell') {
        const record = change.event === 'DELETE' ? change.old : change.next;
        const sheet = qc.getQueryData<SheetData>(queryKeys.sheet(pageId));
        if (sheet && !sheet.rows.some((row) => row.id === record.row_id) && !sheet.columns.some((column) => column.id === record.column_id)) return;
      }
      void qc.invalidateQueries({ queryKey: queryKeys.sheet(pageId) });
      void qc.invalidateQueries({ queryKey: queryKeys.sheetViews() });
    }
    if (change.entity === 'interface' && projectId) void qc.invalidateQueries({ queryKey: queryKeys.interfaces(projectId) });
    if (change.entity === 'page_snapshot' && pageId) void qc.invalidateQueries({ queryKey: queryKeys.revisions(pageId) });
  }, [pageId, projectId, qc, workspaceId]);

  useEffect(() => subscribeToDomainChanges(
    { workspaceId, projectId, pageId },
    (change) => {
      const key = `${change.entity}:${changeId(change) ?? '*'}`;
      if (editing.current.has(key)) {
        deferred.current.set(key, change); // latest server version wins after edit
        setDeferredCount(deferred.current.size);
      } else apply(change);
    },
    (next, cause) => {
      setState(next); setError(cause ?? null);
      // A successful reconnect refetches everything in scope to close event gaps.
      if (next === 'connected') void qc.invalidateQueries();
    },
  ), [apply, pageId, projectId, qc, workspaceId]);

  const value = useMemo<SyncContextValue>(() => ({ state, error, deferredCount,
    beginEditing: (entity) => editing.current.add(entity),
    endEditing: (entity) => {
      editing.current.delete(entity);
      const pending = deferred.current.get(entity);
      if (pending) { deferred.current.delete(entity); apply(pending); setDeferredCount(deferred.current.size); }
    },
  }), [apply, deferredCount, error, state]);
  return <SyncContext.Provider value={value}>{children}</SyncContext.Provider>;
}

// Provider and hook intentionally live together so the synchronization contract is private.
// eslint-disable-next-line react-refresh/only-export-components
export const useDomainSync = () => useContext(SyncContext);
