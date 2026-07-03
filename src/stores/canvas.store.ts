import { create } from 'zustand';
import type { ShapeKind, ConnectorKind } from '@/models/canvas-object.model';

export type CanvasTool = 'select' | 'shape' | 'connector' | 'pan';

interface CanvasState {
  tool: CanvasTool;
  activeShapeKind: ShapeKind;
  activeConnectorKind: ConnectorKind;
  selectedIds: string[];
  zoom: number;
  panX: number;
  panY: number;

  setTool: (tool: CanvasTool) => void;
  setActiveShapeKind: (kind: ShapeKind) => void;
  setActiveConnectorKind: (kind: ConnectorKind) => void;
  setSelection: (ids: string[]) => void;
  clearSelection: () => void;
  setZoom: (zoom: number) => void;
  setPan: (x: number, y: number) => void;
}

export const useCanvasStore = create<CanvasState>((set) => ({
  tool: 'select',
  activeShapeKind: 'rect',
  activeConnectorKind: 'straight',
  selectedIds: [],
  zoom: 1,
  panX: 0,
  panY: 0,

  setTool: (tool) => set({ tool }),
  setActiveShapeKind: (kind) => set({ activeShapeKind: kind, tool: 'shape' }),
  setActiveConnectorKind: (kind) => set({ activeConnectorKind: kind, tool: 'connector' }),
  setSelection: (ids) => set({ selectedIds: ids }),
  clearSelection: () => set({ selectedIds: [] }),
  setZoom: (zoom) => set({ zoom: Math.min(4, Math.max(0.1, zoom)) }),
  setPan: (panX, panY) => set({ panX, panY }),
}));
