import { useState } from 'react';
import { useWorkspaceMembers, useWorkspaceInvitations } from '@/hooks/useWorkspaceMembers';
import { useInviteMember, useRevokeInvitation, useRemoveMember } from '@/hooks/useWorkspaceMutations';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Spinner } from '@/components/ui/Spinner';
import type { WorkspaceRole } from '@/models/workspace.model';

interface Props { workspaceId: string }

export function WorkspaceMembersPanel({ workspaceId }: Props) {
  const { data: members = [], isLoading: mLoading } = useWorkspaceMembers(workspaceId);
  const { data: invitations = [], isLoading: iLoading } = useWorkspaceInvitations(workspaceId);
  const invite = useInviteMember();
  const revoke = useRevokeInvitation();
  const remove = useRemoveMember();

  const [email, setEmail] = useState('');
  const [role, setRole] = useState<WorkspaceRole>('editor');
  const [error, setError] = useState<string | null>(null);

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    setError(null);
    try {
      await invite.mutateAsync({ workspaceId, email: email.trim(), role });
      setEmail('');
    } catch (err) {
      setError((err as Error).message);
    }
  }

  return (
    <div className="space-y-6">
      <section>
        <h3 className="text-sm font-semibold text-slate-900 mb-2">Invite a member</h3>
        <form onSubmit={handleInvite} className="flex gap-2">
          <Input type="email" placeholder="email@example.com"
            value={email} onChange={(e) => setEmail(e.target.value)} className="flex-1" />
          <select value={role} onChange={(e) => setRole(e.target.value as WorkspaceRole)}
            className="h-9 rounded-md border border-slate-300 text-sm px-2">
            <option value="viewer">Viewer</option>
            <option value="editor">Editor</option>
            <option value="admin">Admin</option>
          </select>
          <Button type="submit" disabled={invite.isPending}>
            {invite.isPending ? 'Inviting…' : 'Invite'}
          </Button>
        </form>
        {error && <div className="text-xs text-red-600 mt-1">{error}</div>}
        <p className="text-xs text-slate-500 mt-2">
          Auto-accepts when invitee signs up or logs in with this email.
        </p>
      </section>

      <section>
        <h3 className="text-sm font-semibold text-slate-900 mb-2">Members</h3>
        {mLoading ? <Spinner /> : members.length === 0 ? (
          <p className="text-sm text-slate-500">No members yet.</p>
        ) : (
          <ul className="space-y-1">
            {members.map((m) => (
              <li key={m.userId} className="flex items-center justify-between text-sm py-1.5 px-2 hover:bg-slate-50 rounded">
                <div>
                  <span className="font-mono text-xs text-slate-500">{m.userId.slice(0, 8)}…</span>
                  <span className="ml-2 text-xs px-1.5 py-0.5 rounded bg-slate-100 text-slate-700">{m.role}</span>
                </div>
                <button onClick={() => remove.mutate({ workspaceId, userId: m.userId })}
                  className="text-xs text-red-600 hover:underline">Remove</button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h3 className="text-sm font-semibold text-slate-900 mb-2">Pending invitations</h3>
        {iLoading ? <Spinner /> : invitations.length === 0 ? (
          <p className="text-sm text-slate-500">No pending invitations.</p>
        ) : (
          <ul className="space-y-1">
            {invitations.map((inv) => (
              <li key={inv.id} className="flex items-center justify-between text-sm py-1.5 px-2 hover:bg-slate-50 rounded">
                <div>
                  <span className="text-slate-700">{inv.email}</span>
                  <span className="ml-2 text-xs px-1.5 py-0.5 rounded bg-slate-100 text-slate-700">{inv.role}</span>
                </div>
                <button onClick={() => revoke.mutate(inv.id)}
                  className="text-xs text-red-600 hover:underline">Revoke</button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
