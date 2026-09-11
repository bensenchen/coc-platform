import { useRef, useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { useUIStore } from '@/stores/ui.store';
import { AppNavigation } from './AppNavigation';
import { AppFooter } from './AppFooter';

export function AppShell() {
  const sidebarWidth = useUIStore((s) => s.sidebarWidth);
  const minimized = useUIStore((s) => s.sidebarMinimized);
  const setSidebarWidth = useUIStore((s) => s.setSidebarWidth);
  const [dragging, setDragging] = useState(false);
  const startX = useRef(0);
  const startW = useRef(0);

  useEffect(() => {
    if (!dragging) return;
    const onMove = (e: MouseEvent) => setSidebarWidth(startW.current + (e.clientX - startX.current));
    const onUp = () => setDragging(false);
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, [dragging, setSidebarWidth]);

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <AppNavigation />
      <div className="flex min-h-0 flex-1">
      <div style={{ width: minimized ? 56 : sidebarWidth }} className="flex-shrink-0 h-full transition-[width]">
        <Sidebar />
      </div>
      {!minimized && <div
        className="w-1 cursor-col-resize bg-slate-200 hover:bg-blue-400 flex-shrink-0"
        onMouseDown={(e) => { startX.current = e.clientX; startW.current = sidebarWidth; setDragging(true); }}
      />}
      <main className="flex min-w-0 flex-1 flex-col overflow-hidden bg-slate-50">
        <div className="min-h-0 flex-1 overflow-hidden">
        <Outlet />
        </div>
        <AppFooter />
      </main>
      </div>
    </div>
  );
}
