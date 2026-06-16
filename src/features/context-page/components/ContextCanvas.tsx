import { useRef, useCallback, useEffect, useState } from 'react';
import { Stage, Layer, Arrow, Rect, Circle, Group, Text } from 'react-konva';
import { useCanvasObjects } from '@/hooks/useCanvasObjects';
import {
  useCreateObject,
  useUpdateObject,
  useDeleteObject,
  useCreateConnector,
} from '@/hooks/useCanvasMutations';
import { useCanvasStore } from '@/stores/canvas.store';
import { ShapeNode } from './shapes';
import { borderPoint } from './anchor';
import { Spinner } from '@/components/ui/Spinner';
import type { CanvasObject } from '@/models/canvas-object.model';

const MIN_DRAW = 10;
const DEFAULT_W = 120;
const DEFAULT_H = 60;

interface Props {
  pageId: string;
}

function objCenter(o: CanvasObject): [number, number] {
  return [o.positionX + (o.width ?? DEFAULT_W) / 2, o.positionY + (o.height ?? DEFAULT_H) / 2];
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
      if (e.target !== stage) return;
      const pos = stage.getRelativePointerPosition();
      setDrawStart(pos);
      setDrawPreview({ x: pos.x, y: pos.y, w: 0, h: 0 });
    },
    [tool],
  );

  const handleMouseMove = useCallback(
    (e: any) => {
      if (tool !== 'shape' || !drawStart) return;
      const pos = e.target.getStage().getRelativePointerPosition();
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
      const pos = e.target.getStage().getRelativePointerPosition();
      const w = Math.abs(pos.x - drawStart.x);
      const h = Math.abs(pos.y - drawStart.y);
      const start = drawStart;
      setDrawStart(null);
      setDrawPreview(null);

      if (w > MIN_DRAW && h > MIN_DRAW) {
        createObj.mutate({
          type: 'shape',
          positionX: Math.min(start.x, pos.x),
          positionY: Math.min(start.y, pos.y),
          width: w,
          height: h,
          metadata: { shapeKind: activeShapeKind },
        });
      } else {
        // Plain click — place default-sized shape centered on click
        createObj.mutate({
          type: 'shape',
          positionX: start.x - DEFAULT_W / 2,
          positionY: start.y - DEFAULT_H / 2,
          width: DEFAULT_W,
          height: DEFAULT_H,
          metadata: { shapeKind: activeShapeKind },
        });
      }
    },
    [tool, drawStart, activeShapeKind, createObj],
  );

  const handleStageClick = useCallback(
    (e: any) => {
      if (tool === 'shape') return; // mouseUp already handled it
      const stage = e.target.getStage();
      if (e.target === stage || e.target.getParent() === stage.findOne('Layer')) {
        clearSelection();
        finishConnect();
      }
    },
    [tool, clearSelection, finishConnect],
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
      setZoom(clamped);
      setPan(
        pointer.x - mousePointTo.x * clamped,
        pointer.y - mousePointTo.y * clamped,
      );
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

  const stageDraggable = tool === 'select' || tool === 'pan';
  const cursor = tool === 'shape' ? 'crosshair' : tool === 'connector' ? 'cell' : 'default';

  return (
    <div ref={containerRef} className="flex-1 overflow-hidden bg-slate-100" style={{ cursor }}>
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
          {/* Connectors */}
          {connectors.map((conn) => {
            const anchor = anchors.find((a) => a.connectorId === conn.id);
            if (!anchor) return null;
            const src = anchor.sourceObjectId ? objMap.get(anchor.sourceObjectId) : null;
            const tgt = anchor.targetObjectId ? objMap.get(anchor.targetObjectId) : null;
            if (!src || !tgt) return null;

            const [tcx, tcy] = objCenter(tgt);
            const [scx, scy] = objCenter(src);
            const [sx, sy] = borderPoint(src, tcx, tcy);
            const [tx, ty] = borderPoint(tgt, scx, scy);

            const isSelected = selectedIds.includes(conn.id);
            const color = isSelected ? '#3b82f6' : '#64748b';
            const connKind = (conn.metadata as any)?.connectorKind ?? 'arrow';
            const isDashed = connKind === 'dashed-arrow' || connKind === 'dashed-line';
            const hasEndArrow = connKind === 'arrow' || connKind === 'dashed-arrow' || connKind === 'double-arrow';
            const hasStartArrow = connKind === 'double-arrow';
            const mx = (sx + tx) / 2;
            const my = (sy + ty) / 2;

            return (
              <Group key={conn.id}>
                <Arrow
                  points={[sx, sy, tx, ty]}
                  stroke={color}
                  strokeWidth={isSelected ? 2 : 1.5}
                  fill={color}
                  dash={isDashed ? [8, 4] : undefined}
                  pointerLength={hasEndArrow ? 8 : 0}
                  pointerWidth={hasEndArrow ? 7 : 0}
                  pointerAtBeginning={hasStartArrow}
                  hitStrokeWidth={12}
                  onClick={(e: any) => { e.cancelBubble = true; setSelection([conn.id]); }}
                />
                {conn.name && (
                  <Text
                    x={mx - 40}
                    y={my - 9}
                    width={80}
                    text={conn.name}
                    fontSize={10}
                    fontFamily="Inter, system-ui, sans-serif"
                    fill={color}
                    align="center"
                    padding={2}
                    listening={false}
                  />
                )}
              </Group>
            );
          })}

          {/* Shapes */}
          {shapes.map((obj) => {
            const kind = (obj.metadata as any)?.shapeKind ?? 'rect';
            return (
              <ShapeNode
                key={obj.id}
                x={obj.positionX}
                y={obj.positionY}
                width={obj.width ?? DEFAULT_W}
                height={obj.height ?? DEFAULT_H}
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

          {/* Connecting-from indicator */}
          {connectingFromId && (() => {
            const src = objMap.get(connectingFromId);
            if (!src) return null;
            const [cx, cy] = objCenter(src);
            return <Circle x={cx} y={cy} radius={6} fill="#3b82f6" opacity={0.6} listening={false} />;
          })()}

          {/* Draw preview */}
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
