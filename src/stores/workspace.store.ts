import { create } from 'zustand';
import type { Workspace } from '@/models/workspace.model';
import type { Project } from '@/models/project.model';

interface WorkspaceState {
  currentWorkspace: Workspace | null;
  currentProject: Project | null;
  setCurrentWorkspace: (w: Workspace | null) => void;
  setCurrentProject: (p: Project | null) => void;
}

export const useWorkspaceStore = create<WorkspaceState>((set) => ({
  currentWorkspace: null,
  currentProject: null,
  setCurrentWorkspace: (currentWorkspace) => set({ currentWorkspace }),
  setCurrentProject: (currentProject) => set({ currentProject }),
}));
