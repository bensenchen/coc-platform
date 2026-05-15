import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface UIState {
  sidebarWidth: number;
  collapsedSections: Record<string, boolean>;
  setSidebarWidth: (w: number) => void;
  toggleSection: (id: string) => void;
}

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      sidebarWidth: 240,
      collapsedSections: {},
      setSidebarWidth: (sidebarWidth) =>
        set({ sidebarWidth: Math.max(180, Math.min(480, sidebarWidth)) }),
      toggleSection: (id) =>
        set((s) => ({ collapsedSections: { ...s.collapsedSections, [id]: !s.collapsedSections[id] } })),
    }),
    { name: 'coc-ui-state' },
  ),
);
