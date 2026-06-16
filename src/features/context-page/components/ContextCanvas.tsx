import { useRef, useCallback, useEffect, useState } from 'react';
import { Stage, Layer, Arrow, Rect, Circle } from 'react-konva';
import { useCanvasObjects } from '@/hooks/useCanvasObjects';
import {
  useCreateObject,
  useUpdateObject,
  useDeleteObject,
  useCreateConnector,
} from '@/hooks/useCanvasMutations';
import { useCanvasStore } from '@/stores/canvas.store';
import { ShapeNode } from './shapes';
import { anchorPoint } from './anchor';
import { Spinner } from '@/components/ui/Spinner';
import type { CanvasObject } from '@/models/canvas-object.model';

const MIN_DRAW = 10;

interface Props {
  pageId: string;
}

export function ContextCanvas({ pageId }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ width: 800, height: 600 });
  const [drawStart, setDrawStart] = useState<{ x: number; y: number } | null>(null);
  const [drawPreview, setDrawPreview] = useState<{ x: number; y: number; w: number; h: number } | null>(null);

  const { data, isLoading } = useCanvasObjects(pageId);
  const createObj = useCreateObject(pageId);
  const updateObj = useUpdateObject(pageId);
  const deleteObj = useDeleteObject(pageId);
  const createConn = useCreateConnector(pageId);

  const {
    tool,
    activeShapeKind,
    selectedIds,
    zoom,
    panX,
    panY,
    connectingFromId,
    setSelection,
    clearSelection,
    setZoom,
    setPan,
    startConnect,
    finishConnect,
  } = useCanvasStore();

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      setSize({ width: el.offsetWidth, height: el.offsetHeight });
    });
    ro.observe(el);
    setSize({ width: el.offsetWidth, height: el.offsetHeight });
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA') return;
        selectedIds.forEach((id) => deleteObj.mutate(id));
        clearSelection();
      }
      if (e.key === 'Escape') {
        finishConnect();
        clearSelection();
        setDrawStart(null);
        setDrawPreview(null);
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [selectedIds, deleteObj, clearSelection, finishConnect]);

  const handleMouseDown = useCallback(
    (e: any) => {
      if (tool !== 'shape') return;
      const stage = e.target.getStage();
      if (e.target !== stage) return; // only on empty canvas
      const pos = stage.getRelativePointerPosition();
      setDrawStart(pos);
      setDrawPreview({ x: pos.x, y: pos.y, w: 0, h: 0 });
    },
    [tool],
  );

  const handleMouseMove = useCallback(
    (e: any) => {
      if (tool !== 'shape' || !drawStart) return;
      const stage = e.target.getStage();
      const pos = stage.getRelativePointerPosition();
      setDrawPreview({
        x: Math.min(drawStart.x, pos.x),
        y: Math.min(drawStart.y, pos.y),
        w: Math.abs(pos.x - drawStart.x),
        h: Math.abs(pos.y - drawStart.y),
      });
    },
    [tool, drawStart],
  );

  const handleMouseUp = useCallback(
    (e: any) => {
      if (tool !== 'shape' || !drawStart) return;
      const stage = e.target.getStage();
      const pos = stage.getRelativePointerPosition();
      const x = Math.min(drawStart.x, pos.x);
      const y = Math.min(drawStart.y, pos.y);
      const w = Math.abs(pos.x - drawStart.x);
      const h = Math.abs(pos.y - drawStart.y);
      setDrawStart(null);
      setDrawPreview(null);
      if (w > MIN_DRAW && h > MIN_DRAW) {
        createObj.mutate({
          type: 'shape',
          positionX: x,
          positionY: y,
          width: w,
          height: h,
          metadata: { shapeKind: activeShapeKind },
        });
      }
    },
    [tool, drawStart, activeShapeKind, createObj],
  );

  const handleStageClick = useCallback(
    (e: any) => {
      const stage = e.target.getStage();
      if (e.target === stage || e.target.getParent() === stage.findOne('Layer')) {
        clearSelection();
        finishConnect();
      }
    },
    [clearSelection, finishConnect],
  );

  const handleWheel = useCallback(
    (e: any) => {
      e.evt.preventDefault();
      const scaleBy = 1.08;
      const stage = e.target.getStage();
      const oldScale = stage.scaleX();
      const pointer = stage.getPointerPosition();
      const mousePointTo = {
        x: (pointer.x - stage.x()) / oldScale,
        y: (pointer.y - stage.y()) / oldScale,
      };
      const newScale = e.evt.deltaY < 0 ? oldScale * scaleBy : oldScale / scaleBy;
      const clamped = Math.min(4, Math.max(0.1, newScale));
      const newPos = {
        x: pointer.x - mousePointTo.x * clamped,
        y: pointer.y - mousePointTo.y * clamped,
      };
      setZoom(clamped);
      setPan(newPos.x, newPos.y);
    },
    [setZoom, setPan],
  );

  const handleObjectClick = useCallback(
    (obj: CanvasObject, e: any) => {
      e.cancelBubble = true;
      if (tool === 'connector') {
        if (!connectingFromId) {
          startConnect(obj.id);
        } else if (connectingFromId !== obj.id) {
          createConn.mutate({
            sourceId: connectingFromId,
            sourceAnchor: 'center',
            targetId: obj.id,
            targetAnchor: 'center',
          });
          finishConnect();
        }
        return;
      }
      setSelection([obj.id]);
    },
    [tool, connectingFromId, startConnect, createConn, finishConnect, setSelection],
  );

  const handleDragEnd = useCallback(
    (id: string, x: number, y: number) => {
      updateObj.mutate({ id, patch: { positionX: x, positionY: y } });
    },
    [updateObj],
  );

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Spinner />
      </div>
    );
  }

  const objects = data?.objects ?? [];
  const anchors = data?.anchors ?? [];
  const shapes = objects.filter((o) => o.type !== 'connector');
  const connectors = objects.filter((o) => o.type === 'connector');
  const objMap = new Map(objects.map((o) => [o.id, o]));

  // Select and pan tools both allow dragging the canvas background
  const stageDraggable = tool === 'select' || tool === 'pan';
  const cursor = tool === 'shape' ? 'crosshair' : tool === 'connector' ? 'cell' : 'default';

  return (
    <div
      ref={containerRef}
      className="flex-1 overflow-hidden bg-slate-100"
      style={{ cursor }}
    >
      <Stage
        width={size.width}
        height={size.height}
        scaleX={zoom}
        scaleY={zoom}
        x={panX}
        y={panY}
        draggable={stageDraggable}
        onClick={handleStageClick}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onWheel={handleWheel}
        onDragEnd={(e: any) => setPan(e.target.x(), e.target.y())}
      >
        <Layer>
          {connectors.map((conn) => {
            const anchor = anchors.find((a) => a.connectorId === conn.id);
            if (!anchor) return null;
            const src = anchor.sourceObjectId ? objMap.get(anchor.sourceObjectId) : null;
            const tgt = anchor.targetObjectId ? objMap.get(anchor.targetObjectId) : null;
            if (!src || !tgt) return null;
            const [sx, sy] = anchorPoint(src, anchor.sourceAnchor ?? 'center');
            const [tx, ty] = anchorPoint(tgt, anchor.targetAnchor ?? 'center');
            const isSelected = selectedIds.includes(conn.id);
            return (
              <Arrow
                key={conn.id}
                points={[sx, sy, tx, ty]}
                stroke={isSelected ? '#3b82f6' : '#64748b'}
                strokeWidth={isSelected ? 2 : 1.5}
                fill={isSelected ? '#3b82f6' : '#64748b'}
                pointerLength={8}
                pointerWidth={7}
                hitStrokeWidth={12}
                onClick={(e: any) => { e.cancelBubble = true; setSelection([conn.id]); }}
              />
            );
          })}

          {shapes.map((obj) => {
            const kind = (obj.metadata as any)?.shapeKind ?? 'rect';
            return (
              <ShapeNode
                key={obj.id}
                x={obj.positionX}
                y={obj.positionY}
                width={obj.width ?? 120}
                height={obj.height ?? 60}
                kind={kind}
                name={obj.name}
                isPhysical={obj.isPhysical}
                isSelected={selectedIds.includes(obj.id)}
                draggable={tool === 'select'}
                onDragEnd={(x, y) => handleDragEnd(obj.id, x, y)}
                onClick={(e: any) => handleObjectClick(obj, e)}
              />
            );
          })}

          {connectingFromId && (() => {
            const src = objMap.get(connectingFromId);
            if (!src) return null;
            const [cx, cy] = anchorPoint(src, 'center');
            return <Circle x={cx} y={cy} radius={6} fill="#3b82f6" opacity={0.6} listening={false} />;
          })()}

          {drawPreview && drawPreview.w > MIN_DRAW && drawPreview.h > MIN_DRAW && (
            <Rect
              x={drawPreview.x}
              y={drawPreview.y}
              width={drawPreview.w}
              height={drawPreview.h}
              stroke="#3b82f6"
              strokeWidth={1}
              dash={[4, 4]}
              fill="rgba(59,130,246,0.05)"
              listening={false}
            />
          )}
        </Layer>
      </Stage>
    </div>
  );
}
