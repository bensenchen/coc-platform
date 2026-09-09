import { CloudOff, RefreshCw, TriangleAlert } from 'lucide-react';
import { useDomainSync } from '@/hooks/useDomainSync';

/** Persistent, non-blocking feedback for reconnects, conflicts and sync failures. */
export function SyncStatus() {
  const { state, error, deferredCount } = useDomainSync();
  if (state === 'connected' && deferredCount === 0) return null;

  const failed = state === 'failed';
  return (
    <div role={failed ? 'alert' : 'status'} className={`flex items-center gap-2 px-4 py-1.5 text-xs ${failed ? 'bg-red-50 text-red-700' : 'bg-amber-50 text-amber-800'}`}>
      {failed ? <CloudOff size={14} /> : state === 'connected' ? <TriangleAlert size={14} /> : <RefreshCw size={14} className="animate-spin" />}
      {failed
        ? `Live synchronization failed${error ? `: ${error.message}` : ''}. Your local view is retained; retry by reconnecting.`
        : deferredCount > 0
          ? `${deferredCount} remote edit${deferredCount === 1 ? '' : 's'} arrived while you are editing. It will be applied when editing ends.`
          : 'Reconnecting… Changes made by others will be refreshed when the connection returns.'}
    </div>
  );
}
