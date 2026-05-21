import { createContext, ReactNode, useContext, useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/cn';

const MenuContext = createContext<() => void>(() => {});

interface MenuProps {
  trigger: ReactNode;
  children: ReactNode;
  align?: 'left' | 'right';
}

export function Menu({ trigger, children, align = 'right' }: MenuProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    window.addEventListener('mousedown', onClick);
    return () => window.removeEventListener('mousedown', onClick);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <div onClick={(e) => { e.stopPropagation(); setOpen(!open); }}>{trigger}</div>
      {open && (
        <div className={cn(
          'absolute z-40 mt-1 min-w-[140px] bg-white rounded-md shadow-lg border border-slate-200 py-1',
          align === 'right' ? 'right-0' : 'left-0',
        )}>
          <MenuContext.Provider value={() => setOpen(false)}>
            {children}
          </MenuContext.Provider>
        </div>
      )}
    </div>
  );
}

interface MenuItemProps {
  onClick: () => void;
  children: ReactNode;
  danger?: boolean;
}

export function MenuItem({ onClick, children, danger }: MenuItemProps) {
  const close = useContext(MenuContext);
  return (
    <button
      onClick={(e) => { e.stopPropagation(); onClick(); close(); }}
      className={cn(
        'w-full text-left px-3 py-1.5 text-sm hover:bg-slate-50',
        danger ? 'text-red-600 hover:bg-red-50' : 'text-slate-700',
      )}
    >
      {children}
    </button>
  );
}
