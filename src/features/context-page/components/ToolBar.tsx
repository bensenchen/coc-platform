import {
  MousePointer2, Square, Circle, Diamond, Triangle, Cylinder, Hand,
  MoveUpRight, CornerUpRight, Spline, PenTool,
  ZoomIn, ZoomOut, Maximize2, Trash2,
} from 'lucide-react';
import { useCanvasStore, type CanvasTool } from '@/stores/canvas.store';
import { useDeleteObject } from '@/hooks/useCanvasMutations';
import { cn } from '@/lib/cn';
import type { ShapeKind, ConnectorKind } from '@/models/canvas-object.model';

const SHAPES: { kind: ShapeKind; label: string; icon: React.ReactNode }[] = [
  { kind: 'rect',     label: 'Rectangle',  icon: <Square size={14} /> },
  { kind: 'process',  label: 'Process',    icon: <Square size={14} strokeWidth={1} style={{ borderRadius: 4 }} /> },
  { kind: 'ellipse',  label: 'Ellipse',    icon: <Circle size={14} /> },
  { kind: 'diamond',  label: 'Diamond',    icon: <Diamond size={14} /> },
  { kind: 'triangle', label: 'Triangle',   icon: <Triangle size={14} /> },
  { kind: 'cylinder', label: 'Cylinder',   icon: <Cylinder size={14} /> },
];

const CONNECTORS: { kind: ConnectorKind; label: string; icon: React.ReactNode }[] = [
  { kind: 'straight', label: 'Straight connector', icon: <MoveUpRight size={14} /> },
  { kind: 'elbow',    label: 'Elbow connector',    icon: <CornerUpRight size={14} /> },
  { kind: 'curved',   label: 'Curved connector',   icon: <Spline size={14} /> },
  { kind: 'freehand', label: 'Draw connector',     icon: <PenTool size={14} /> },
];

interface Props {
  pageId: string;
  onFitView?: () => void;
}

export function ToolBar({ pageId, onFitView }: Props) {
  const {
    tool, activeShapeKind, activeConnectorKind,
    setTool, setActiveShapeKind, setActiveConnectorKind, setZoom,
    zoom, selectedIds, clearSelection,
  } = useCanvasStore();
  const deleteObj = useDeleteObject(pageId);

  function btn(activeTool: CanvasTool, icon: React.ReactNode, label: string) {
    return (
      <button
        title={label}
        onClick={() => setTool(activeTool)}
        className={cn(
          'p-1.5 rounded',
          tool === activeTool ? 'bg-blue-100 text-blue-700' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-700',
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
      {btn('pan',    <Hand size={14} />,           'Pan')}

      <div className="w-px h-5 bg-slate-200 mx-1" />

      {SHAPES.map(({ kind, label, icon }) => (
        <button
          key={kind}
          title={label}
          onClick={() => setActiveShapeKind(kind)}
          className={cn(
            'p-1.5 rounded',
            tool === 'shape' && activeShapeKind === kind
              ? 'bg-blue-100 text-blue-700'
              : 'text-slate-500 hover:bg-slate-100 hover:text-slate-700',
          )}
        >
          {icon}
        </button>
      ))}

      <div className="w-px h-5 bg-slate-200 mx-1" />

      {CONNECTORS.map(({ kind, label, icon }) => (
        <button
          key={kind}
          title={label}
          onClick={() => setActiveConnectorKind(kind)}
          className={cn(
            'p-1.5 rounded',
            tool === 'connector' && activeConnectorKind === kind
              ? 'bg-blue-100 text-blue-700'
              : 'text-slate-500 hover:bg-slate-100 hover:text-slate-700',
          )}
        >
          {icon}
        </button>
      ))}

      <div className="w-px h-5 bg-slate-200 mx-1" />

      <button title="Zoom out" onClick={() => setZoom(zoom / 1.2)} className="p-1.5 rounded text-slate-500 hover:bg-slate-100 hover:text-slate-700">
        <ZoomOut size={14} />
      </button>
      <span className="w-10 text-center text-slate-500 tabular-nums">{Math.round(zoom * 100)}%</span>
      <button title="Zoom in" onClick={() => setZoom(zoom * 1.2)} className="p-1.5 rounded text-slate-500 hover:bg-slate-100 hover:text-slate-700">
        <ZoomIn size={14} />
      </button>
      {onFitView && (
        <button title="Fit view" onClick={onFitView} className="p-1.5 rounded text-slate-500 hover:bg-slate-100 hover:text-slate-700">
          <Maximize2 size={14} />
        </button>
      )}

      <div className="flex-1" />

      {selectedIds.length > 0 && (
        <button title="Delete selected" onClick={handleDelete} className="p-1.5 rounded text-red-500 hover:bg-red-50">
          <Trash2 size={14} />
        </button>
      )}
    </div>
  );
}
