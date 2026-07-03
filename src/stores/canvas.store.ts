import { create } from 'zustand';
import type { ShapeKind, AnchorPosition } from '@/models/canvas-object.model';

export type CanvasTool = 'select' | 'shape' | 'connector' | 'pan';

interface CanvasState {
  tool: CanvasTool;
  activeShapeKind: ShapeKind;
  selectedIds: string[];
  zoom: number;
  panX: number;
  panY: number;
  connectingFromId: string | null;
  connectingFromAnchor: AnchorPosition | null;

  setTool: (tool: CanvasTool) => void;
  setActiveShapeKind: (kind: ShapeKind) => void;
  setSelection: (ids: string[]) => void;
  clearSelection: () => void;
  setZoom: (zoom: number) => void;
  setPan: (x: number, y: number) => void;
  startConnect: (fromId: string, anchor: AnchorPosition) => void;
  cancelConnect: () => void;
  finishConnect: () => void;
}

export const useCanvasStore = create<CanvasState>((set) => ({
  tool: 'select',
  activeShapeKind: 'rect',
  selectedIds: [],
  zoom: 1,
  panX: 0,
  panY: 0,
  connectingFromId: null,
  connectingFromAnchor: null,

  setTool: (tool) => set({ tool, connectingFromId: null, connectingFromAnchor: null }),
  setActiveShapeKind: (kind) => set({ activeShapeKind: kind, tool: 'shape' }),
  setSelection: (ids) => set({ selectedIds: ids }),
  clearSelection: () => set({ selectedIds: [] }),
  setZoom: (zoom) => set({ zoom: Math.min(4, Math.max(0.1, zoom)) }),
  setPan: (panX, panY) => set({ panX, panY }),
  startConnect: (fromId, anchor) => set({ connectingFromId: fromId, connectingFromAnchor: anchor }),
  cancelConnect: () => set({ connectingFromId: null, connectingFromAnchor: null }),
  finishConnect: () => set({ connectingFromId: null, connectingFromAnchor: null }),
}));
