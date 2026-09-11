import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface UIState {
  sidebarWidth: number;
  sidebarMinimized: boolean;
  collapsedSections: Record<string, boolean>;
  setSidebarWidth: (w: number) => void;
  toggleSection: (id: string) => void;
  toggleSidebar: () => void;
}

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      sidebarWidth: 240,
      sidebarMinimized: false,
      collapsedSections: {},
      setSidebarWidth: (sidebarWidth) =>
        set({ sidebarWidth: Math.max(180, Math.min(480, sidebarWidth)) }),
      toggleSection: (id) =>
        set((s) => ({ collapsedSections: { ...s.collapsedSections, [id]: !s.collapsedSections[id] } })),
      toggleSidebar: () => set((s) => ({ sidebarMinimized: !s.sidebarMinimized })),
    }),
    { name: 'coc-ui-state' },
  ),
);
