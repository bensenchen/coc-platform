import { useRef, useCallback, useEffect, useState } from 'react';
import { Stage, Layer, Arrow, Rect, Group, Text } from 'react-konva';
import { useCanvasObjects } from '@/hooks/useCanvasObjects';
import {
  useCreateObject,
  useUpdateObject,
  useDeleteObject,
  useCreateConnector,
} from '@/hooks/useCanvasMutations';
import { useCanvasStore } from '@/stores/canvas.store';
import { ShapeNode } from './shapes';
import { borderPoint, anchorPoint, nearestAnchor } from './anchor';
import { Spinner } from '@/components/ui/Spinner';
import type { CanvasObject, AnchorPosition } from '@/models/canvas-object.model';

const MIN_DRAW = 10;
const DEFAULT_W = 120;
const DEFAULT_H = 60;

interface Props {
  pageId: string;
}

function objCenter(o: CanvasObject): [number, number] {
  return [o.positionX + (o.width ?? DEFAULT_W) / 2, o.positionY + (o.height ?? DEFAULT_H) / 2];
}

function containsPoint(o: CanvasObject, px: number, py: number): boolean {
  const w = o.width ?? DEFAULT_W;
  const h = o.height ?? DEFAULT_H;
  return px >= o.positionX && px <= o.positionX + w && py >= o.positionY && py <= o.positionY + h;
}

export function ContextCanvas({ pageId }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ width: 800, height: 600 });
  const [drawStart, setDrawStart] = useState<{ x: number; y: number } | null>(null);
  const [drawPreview, setDrawPreview] = useState<{ x: number; y: number; w: number; h: number } | null>(null);
  const [connectPointer, setConnectPointer] = useState<{ x: number; y: number } | null>(null);

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
    connectingFromAnchor,
    setTool,
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
        setConnectPointer(null);
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [selectedIds, deleteObj, clearSelection, finishConnect]);

  const objects = data?.objects ?? [];
  const anchors = data?.anchors ?? [];
  const shapes = objects.filter((o) => o.type !== 'connector');
  const connectors = objects.filter((o) => o.type === 'connector');
  const objMap = new Map(objects.map((o) => [o.id, o]));

  // --- Shape drawing (shape tool) ---

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
      const stage = e.target.getStage();
      if (tool === 'shape' && drawStart) {
        const pos = stage.getRelativePointerPosition();
        setDrawPreview({
          x: Math.min(drawStart.x, pos.x),
          y: Math.min(drawStart.y, pos.y),
          w: Math.abs(pos.x - drawStart.x),
          h: Math.abs(pos.y - drawStart.y),
        });
      }
      if (tool === 'connector' && connectingFromId) {
        setConnectPointer(stage.getRelativePointerPosition());
      }
    },
    [tool, drawStart, connectingFromId],
  );

  const handleMouseUp = useCallback(
    (e: any) => {
      const stage = e.target.getStage();

      // Finish a connector drag: drop on a target shape
      if (tool === 'connector' && connectingFromId) {
        const pos = stage.getRelativePointerPosition();
        const target = [...shapes]
          .reverse()
          .find((o) => o.id !== connectingFromId && containsPoint(o, pos.x, pos.y));
        if (target) {
          createConn.mutate({
            sourceId: connectingFromId,
            sourceAnchor: connectingFromAnchor ?? 'center',
            targetId: target.id,
            targetAnchor: nearestAnchor(target, pos.x, pos.y),
          });
        }
        finishConnect();
        setConnectPointer(null);
        return;
      }

      // Finish shape drawing
      if (tool !== 'shape' || !drawStart) return;
      const pos = stage.getRelativePointerPosition();
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
        createObj.mutate({
          type: 'shape',
          positionX: start.x - DEFAULT_W / 2,
          positionY: start.y - DEFAULT_H / 2,
          width: DEFAULT_W,
          height: DEFAULT_H,
          metadata: { shapeKind: activeShapeKind },
        });
      }

      // One shape created — return to the select tool
      setTool('select');
    },
    [tool, drawStart, activeShapeKind, createObj, setTool,
     connectingFromId, connectingFromAnchor, shapes, createConn, finishConnect],
  );

  const handleStageClick = useCallback(
    (e: any) => {
      if (tool === 'shape' || tool === 'connector') return;
      const stage = e.target.getStage();
      if (e.target === stage || e.target.getParent() === stage.findOne('Layer')) {
        clearSelection();
      }
    },
    [tool, clearSelection],
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

  // Press on a shape with the connector tool: start dragging a link
  // from the nearest edge anchor to the pointer.
  const handleShapeMouseDown = useCallback(
    (obj: CanvasObject, e: any) => {
      if (tool !== 'connector') return;
      e.cancelBubble = true;
      const stage = e.target.getStage();
      const pos = stage.getRelativePointerPosition();
      startConnect(obj.id, nearestAnchor(obj, pos.x, pos.y));
      setConnectPointer(pos);
    },
    [tool, startConnect],
  );

  const handleObjectClick = useCallback(
    (obj: CanvasObject, e: any) => {
      if (tool === 'connector') return;
      e.cancelBubble = true;
      setSelection([obj.id]);
    },
    [tool, setSelection],
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

  const stageDraggable = tool === 'select' || tool === 'pan';
  const cursor = tool === 'shape' ? 'crosshair' : tool === 'connector' ? 'crosshair' : 'default';

  // A connector end uses its pinned anchor; 'center' falls back to the
  // dynamic border point aimed at the other object.
  function endpoint(
    self: CanvasObject,
    selfAnchor: AnchorPosition | null,
    other: CanvasObject,
  ): [number, number] {
    if (selfAnchor && selfAnchor !== 'center') return anchorPoint(self, selfAnchor);
    const [ocx, ocy] = objCenter(other);
    return borderPoint(self, ocx, ocy);
  }

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
        onDragEnd={(e: any) => {
          // Shape drags bubble up here too — only pan when the STAGE
          // itself was dragged, otherwise the whole canvas jumps.
          if (e.target === e.target.getStage()) setPan(e.target.x(), e.target.y());
        }}
      >
        <Layer>
          {/* Connectors */}
          {connectors.map((conn) => {
            const anchor = anchors.find((a) => a.connectorId === conn.id);
            if (!anchor) return null;
            const src = anchor.sourceObjectId ? objMap.get(anchor.sourceObjectId) : null;
            const tgt = anchor.targetObjectId ? objMap.get(anchor.targetObjectId) : null;
            if (!src || !tgt) return null;

            const [sx, sy] = endpoint(src, anchor.sourceAnchor, tgt);
            const [tx, ty] = endpoint(tgt, anchor.targetAnchor, src);

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

          {/* Shapes — draggable only when already selected */}
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
                draggable={tool === 'select' && selectedIds.includes(obj.id)}
                onDragEnd={(x, y) => handleDragEnd(obj.id, x, y)}
                onClick={(e: any) => handleObjectClick(obj, e)}
                onMouseDown={(e: any) => handleShapeMouseDown(obj, e)}
              />
            );
          })}

          {/* Live preview line while dragging a connector */}
          {tool === 'connector' && connectingFromId && connectPointer && (() => {
            const src = objMap.get(connectingFromId);
            if (!src) return null;
            const [sx, sy] = connectingFromAnchor
              ? anchorPoint(src, connectingFromAnchor)
              : objCenter(src);
            return (
              <Arrow
                points={[sx, sy, connectPointer.x, connectPointer.y]}
                stroke="#3b82f6"
                strokeWidth={1.5}
                fill="#3b82f6"
                dash={[6, 3]}
                pointerLength={8}
                pointerWidth={7}
                listening={false}
              />
            );
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
