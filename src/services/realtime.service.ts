import type { RealtimeChannel, RealtimePostgresChangesPayload } from '@supabase/supabase-js';
import { supabase } from '@/infrastructure/supabase/client';

export type RealtimeEntity =
  | 'project'
  | 'page'
  | 'canvas_object'
  | 'connector_anchor'
  | 'sheet_row'
  | 'sheet_column'
  | 'sheet_cell'
  | 'interface'
  | 'page_snapshot';

export interface SubscriptionScope {
  workspaceId: string;
  projectId?: string | null;
  pageId?: string | null;
}

export interface DomainChange {
  entity: RealtimeEntity;
  event: 'INSERT' | 'UPDATE' | 'DELETE';
  old: Record<string, unknown>;
  next: Record<string, unknown>;
}

export type ConnectionState = 'connecting' | 'connected' | 'reconnecting' | 'failed';

const records = (payload: RealtimePostgresChangesPayload<Record<string, unknown>>): DomainChange => ({
  entity: '' as RealtimeEntity,
  event: payload.eventType,
  old: payload.old,
  next: payload.new,
});

/**
 * One reusable, route-scoped subscription. Calling unsubscribe removes the
 * channel and all table listeners, preventing old routes from updating cache.
 */
export function subscribeToDomainChanges(
  scope: SubscriptionScope,
  onChange: (change: DomainChange) => void,
  onState: (state: ConnectionState, error?: Error) => void,
): () => void {
  const channel = supabase.channel(
    `domain:${scope.workspaceId}:${scope.projectId ?? '-'}:${scope.pageId ?? '-'}`,
  );

  const add = (entity: RealtimeEntity, filter?: string) => {
    channel.on(
      'postgres_changes',
      { event: '*', schema: 'public', table: entity, ...(filter ? { filter } : {}) },
      (payload) => onChange({ ...records(payload), entity }),
    );
  };

  add('project', `workspace_id=eq.${scope.workspaceId}`);
  if (scope.projectId) {
    add('page', `project_id=eq.${scope.projectId}`);
    add('interface', `project_id=eq.${scope.projectId}`);
  }
  if (scope.pageId) {
    add('canvas_object', `page_id=eq.${scope.pageId}`);
    add('sheet_row', `page_id=eq.${scope.pageId}`);
    add('sheet_column', `page_id=eq.${scope.pageId}`);
    add('page_snapshot', `page_id=eq.${scope.pageId}`);
    // These tables have no page_id. The coordinator rejects records that do
    // not reference a currently cached row/column/connector for this page.
    add('sheet_cell');
    add('connector_anchor');
  }

  let connected = false;
  channel.subscribe((status, error) => {
    if (status === 'SUBSCRIBED') {
      connected = true;
      onState('connected');
    } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
      onState(connected ? 'reconnecting' : 'failed', error ?? new Error(`Realtime ${status}`));
    } else if (status === 'CLOSED' && connected) {
      onState('reconnecting');
    }
  });
  onState('connecting');

  return () => {
    void supabase.removeChannel(channel as RealtimeChannel);
  };
}
