import {
  MousePointer2,
  Square,
  Circle,
  Diamond,
  Triangle,
  Cylinder,
  Plus,
  Image,
  Paperclip,
  MoveUpRight,
  CornerUpRight,
  Spline,
  PenTool,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Trash2,
} from 'lucide-react';
import { useCanvasStore, type CanvasTool } from '@/stores/canvas.store';
import { useDeleteObject } from '@/hooks/useCanvasMutations';
import { cn } from '@/lib/cn';
import type { ShapeKind, ConnectorKind } from '@/models/canvas-object.model';
import { Menu, MenuItem } from '@/components/ui/Menu';

const SHAPES: { kind: ShapeKind; label: string; icon: React.ReactNode }[] = [
  { kind: 'rect', label: 'Rectangle', icon: <Square size={14} /> },
  {
    kind: 'process',
    label: 'Process',
    icon: <Square size={14} strokeWidth={1} style={{ borderRadius: 4 }} />,
  },
  { kind: 'ellipse', label: 'Ellipse', icon: <Circle size={14} /> },
  { kind: 'diamond', label: 'Diamond', icon: <Diamond size={14} /> },
  { kind: 'triangle', label: 'Triangle', icon: <Triangle size={14} /> },
  { kind: 'cylinder', label: 'Cylinder', icon: <Cylinder size={14} /> },
];

const CONNECTORS: { kind: ConnectorKind; label: string; icon: React.ReactNode }[] = [
  { kind: 'straight', label: 'Straight connector', icon: <MoveUpRight size={14} /> },
  { kind: 'elbow', label: 'Elbow connector', icon: <CornerUpRight size={14} /> },
  { kind: 'curved', label: 'Curved connector', icon: <Spline size={14} /> },
  { kind: 'freehand', label: 'Draw connector', icon: <PenTool size={14} /> },
];

interface Props {
  pageId: string;
  onFitView?: () => void;
  onAddFile?: (kind: 'picture' | 'attachment') => void;
}

export function ToolBar({ pageId, onFitView, onAddFile }: Props) {
  const {
    tool,
    setTool,
    setActiveShapeKind,
    setActiveConnectorKind,
    setZoom,
    zoom,
    selectedIds,
    clearSelection,
  } = useCanvasStore();
  const deleteObj = useDeleteObject(pageId);

  function btn(activeTool: CanvasTool, icon: React.ReactNode, label: string) {
    return (
      <button
        title={label}
        onClick={() => setTool(activeTool)}
        className={cn(
          'p-1.5 rounded',
          tool === activeTool
            ? 'bg-blue-100 text-blue-700'
            : 'text-slate-500 hover:bg-slate-100 hover:text-slate-700',
        )}
      >
        {icon}
      </button>
    );
  }

  function handleDelete() {
    selectedIds.forEach((id) => deleteObj.mutate(id));
    clearSelection();
  }

  return (
    <div className="flex items-center gap-0.5 px-3 py-1.5 bg-white border-b border-slate-200 text-xs select-none">
      {btn('select', <MousePointer2 size={14} />, 'Select')}
      <Menu
        align="left"
        trigger={
          <button
            className={cn(
              'ml-1 flex items-center gap-1 rounded px-2 py-1.5 font-medium',
              tool !== 'select' ? 'bg-blue-100 text-blue-700' : 'text-slate-600 hover:bg-slate-100',
            )}
          >
            <Plus size={14} /> Add object
          </button>
        }
      >
        <div className="px-3 py-1 text-[10px] font-semibold uppercase tracking-wide text-slate-400">
          Shapes
        </div>
        {SHAPES.map(({ kind, label, icon }) => (
          <MenuItem key={kind} onClick={() => setActiveShapeKind(kind)}>
            <span className="flex items-center gap-2">
              {icon}
              {label}
            </span>
          </MenuItem>
        ))}
        <div className="my-1 border-t border-slate-100" />
        <div className="px-3 py-1 text-[10px] font-semibold uppercase tracking-wide text-slate-400">
          Connectors
        </div>
        {CONNECTORS.map(({ kind, label, icon }) => (
          <MenuItem key={kind} onClick={() => setActiveConnectorKind(kind)}>
            <span className="flex items-center gap-2">
              {icon}
              {label}
            </span>
          </MenuItem>
        ))}
        {onAddFile && (
          <>
            <div className="my-1 border-t border-slate-100" />
            <MenuItem onClick={() => onAddFile('picture')}>
              <span className="flex items-center gap-2">
                <Image size={14} />
                Image…
              </span>
            </MenuItem>
            <MenuItem onClick={() => onAddFile('attachment')}>
              <span className="flex items-center gap-2">
                <Paperclip size={14} />
                Attachment…
              </span>
            </MenuItem>
          </>
        )}
      </Menu>

      <div className="w-px h-5 bg-slate-200 mx-1" />

      <button
        title="Zoom out"
        onClick={() => setZoom(zoom / 1.2)}
        className="p-1.5 rounded text-slate-500 hover:bg-slate-100 hover:text-slate-700"
      >
        <ZoomOut size={14} />
      </button>
      <span className="w-10 text-center text-slate-500 tabular-nums">
        {Math.round(zoom * 100)}%
      </span>
      <button
        title="Zoom in"
        onClick={() => setZoom(zoom * 1.2)}
        className="p-1.5 rounded text-slate-500 hover:bg-slate-100 hover:text-slate-700"
      >
        <ZoomIn size={14} />
      </button>
      {onFitView && (
        <button
          title="Fit view"
          onClick={onFitView}
          className="p-1.5 rounded text-slate-500 hover:bg-slate-100 hover:text-slate-700"
        >
          <Maximize2 size={14} />
        </button>
      )}

      <div className="flex-1" />

      {selectedIds.length > 0 && (
        <button
          title="Delete selected"
          onClick={handleDelete}
          className="p-1.5 rounded text-red-500 hover:bg-red-50"
        >
          <Trash2 size={14} />
        </button>
      )}
    </div>
  );
}
