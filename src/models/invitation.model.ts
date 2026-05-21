import type { WorkspaceRole } from './workspace.model';

export type InvitationStatus = 'pending' | 'accepted' | 'expired' | 'revoked';

export interface WorkspaceInvitation {
  id: string;
  workspaceId: string;
  email: string;
  role: WorkspaceRole;
  status: InvitationStatus;
  invitedBy: string | null;
  createdAt: string;
  acceptedAt: string | null;
}
