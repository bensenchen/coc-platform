import { useRef, useEffect, useState } from 'react';
import { Stage, Layer, Arrow, Line, Rect, Circle, Group, Text, Label, Tag } from 'react-konva';
import { useCanvasObjects } from '@/hooks/useCanvasObjects';
import {
  useCreateObject,
  useUpdateObject,
  useDeleteObject,
  useCreateConnector,
  useUpdateAnchor,
} from '@/hooks/useCanvasMutations';
import { useCanvasStore } from '@/stores/canvas.store';
import { ShapeNode } from './shapes';
import { borderPoint, anchorPoint, nearestAnchor } from './anchor';
import { resolveConnStyle, pathPoints } from './connector-utils';
import { Spinner } from '@/components/ui/Spinner';
import type { CanvasObject, AnchorPosition } from '@/models/canvas-object.model';

const MIN_DRAW = 10;
const DEFAULT_W = 120;
const DEFAULT_H = 60;

interface Props {
  pageId: string;
}

interface EndpointHit {
  objectId: string | null;
  anchor: AnchorPosition | null;
  x: number;
  y: number;
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
  const [pendingStart, setPendingStart] = useState<EndpointHit | null>(null);
  const [connectPointer, setConnectPointer] = useState<{ x: number; y: number } | null>(null);
  const [freehandPts, setFreehandPts] = useState<number[] | null>(null);

  const { data, isLoading } = useCanvasObjects(pageId);
  const createObj = useCreateObject(pageId);
  const updateObj = useUpdateObject(pageId);
  const deleteObj = useDeleteObject(pageId);
  const createConn = useCreateConnector(pageId);
  const updateAnchorM = useUpdateAnchor(pageId);

  const {
    tool,
    activeShapeKind,
    activeConnectorKind,
    selectedIds,
    zoom,
    panX,
    panY,
    setTool,
    setSelection,
    clearSelection,
    setZoom,
    setPan,
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
        clearSelection();
        setDrawStart(null);
        setDrawPreview(null);
        setPendingStart(null);
        setConnectPointer(null);
        setFreehandPts(null);
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [selectedIds, deleteObj, clearSelection]);

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
  const cursor = tool === 'shape' || tool === 'connector' ? 'crosshair' : 'default';

  // A click lands either on a shape (snap to its nearest edge anchor)
  // or on empty canvas (free point).
  function hitEndpoint(px: number, py: number): EndpointHit {
    const target = [...shapes].reverse().find((o) => containsPoint(o, px, py));
    if (target) return { objectId: target.id, anchor: nearestAnchor(target, px, py), x: px, y: py };
    return { objectId: null, anchor: null, x: px, y: py };
  }

  function completeConnector(px: number, py: number) {
    if (!pendingStart) return;
    const end = hitEndpoint(px, py);
    createConn.mutate({
      source: { objectId: pendingStart.objectId, anchor: pendingStart.anchor, point: { x: pendingStart.x, y: pendingStart.y } },
      target: { objectId: end.objectId, anchor: end.anchor, point: { x: end.x, y: end.y } },
      metadata: { pathKind: activeConnectorKind, lineStyle: 'solid', startCap: 'none', endCap: 'arrow' },
    });
    setPendingStart(null);
    setConnectPointer(null);
    setTool('select');
  }

  function handleMouseDown(e: any) {
    const stage = e.target.getStage();
    const pos = stage.getRelativePointerPosition();

    if (tool === 'shape') {
      if (e.target !== stage) return;
      setDrawStart(pos);
      setDrawPreview({ x: pos.x, y: pos.y, w: 0, h: 0 });
      return;
    }

    if (tool === 'connector') {
      if (activeConnectorKind === 'freehand') {
        setFreehandPts([pos.x, pos.y]);
      } else if (!pendingStart) {
        setPendingStart(hitEndpoint(pos.x, pos.y));
        setConnectPointer(pos);
      } else {
        completeConnector(pos.x, pos.y);
      }
    }
  }

  function handleMouseMove(e: any) {
    const stage = e.target.getStage();

    if (tool === 'shape' && drawStart) {
      const pos = stage.getRelativePointerPosition();
      setDrawPreview({
        x: Math.min(drawStart.x, pos.x),
        y: Math.min(drawStart.y, pos.y),
        w: Math.abs(pos.x - drawStart.x),
        h: Math.abs(pos.y - drawStart.y),
      });
      return;
    }

    if (tool === 'connector') {
      const pos = stage.getRelativePointerPosition();
      if (freehandPts) setFreehandPts([...freehandPts, pos.x, pos.y]);
      else if (pendingStart) setConnectPointer(pos);
    }
  }

  function handleMouseUp(e: any) {
    const stage = e.target.getStage();

    if (tool === 'connector') {
      const pos = stage.getRelativePointerPosition();

      if (activeConnectorKind === 'freehand' && freehandPts) {
        const pts = freehandPts;
        setFreehandPts(null);
        if (pts.length >= 8) {
          const start = hitEndpoint(pts[0]!, pts[1]!);
          const end = hitEndpoint(pts[pts.length - 2]!, pts[pts.length - 1]!);
          createConn.mutate({
            source: { objectId: start.objectId, anchor: start.anchor, point: { x: start.x, y: start.y } },
            target: { objectId: end.objectId, anchor: end.anchor, point: { x: end.x, y: end.y } },
            metadata: { pathKind: 'freehand', freehandPoints: pts, lineStyle: 'solid', startCap: 'none', endCap: 'arrow' },
          });
          setTool('select');
        }
        return;
      }

      // Drag-in-one-gesture completes; a plain click waits for a second click
      if (pendingStart && Math.hypot(pos.x - pendingStart.x, pos.y - pendingStart.y) > 8) {
        completeConnector(pos.x, pos.y);
      }
      return;
    }

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

    setTool('select');
  }

  function handleStageClick(e: any) {
    if (tool === 'shape' || tool === 'connector') return;
    const stage = e.target.getStage();
    if (e.target === stage || e.target.getParent() === stage.findOne('Layer')) {
      clearSelection();
    }
  }

  function handleWheel(e: any) {
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
  }

  function handleObjectClick(obj: CanvasObject, e: any) {
    if (tool === 'connector') return;
    e.cancelBubble = true;
    setSelection([obj.id]);
  }

  function handleDragEnd(id: string, x: number, y: number) {
    updateObj.mutate({ id, patch: { positionX: x, positionY: y } });
  }

  // Dropping an endpoint handle: re-anchor to a shape, or float freely.
  function handleEndpointDrag(conn: CanvasObject, side: 'source' | 'target', x: number, y: number) {
    const end = hitEndpoint(x, y);
    const md = (conn.metadata as any) ?? {};
    if (side === 'source') {
      updateAnchorM.mutate({ connectorId: conn.id, patch: { sourceObjectId: end.objectId, sourceAnchor: end.anchor } });
      updateObj.mutate({ id: conn.id, patch: { metadata: { ...md, sourcePoint: { x, y } } } });
    } else {
      updateAnchorM.mutate({ connectorId: conn.id, patch: { targetObjectId: end.objectId, targetAnchor: end.anchor } });
      updateObj.mutate({ id: conn.id, patch: { metadata: { ...md, targetPoint: { x, y } } } });
    }
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
          // Shape/handle drags bubble up here too — only pan when the
          // STAGE itself was dragged, otherwise the whole canvas jumps.
          if (e.target === e.target.getStage()) setPan(e.target.x(), e.target.y());
        }}
      >
        <Layer>
          {/* Connectors */}
          {connectors.map((conn) => {
            const anchor = anchors.find((a) => a.connectorId === conn.id);
            const md = (conn.metadata as any) ?? {};
            const src = anchor?.sourceObjectId ? objMap.get(anchor.sourceObjectId) : undefined;
            const tgt = anchor?.targetObjectId ? objMap.get(anchor.targetObjectId) : undefined;
            const sp = md.sourcePoint as { x: number; y: number } | undefined;
            const tp = md.targetPoint as { x: number; y: number } | undefined;
            if (!src && !sp) return null;
            if (!tgt && !tp) return null;

            const srcRef: [number, number] = src ? objCenter(src) : [sp!.x, sp!.y];
            const tgtRef: [number, number] = tgt ? objCenter(tgt) : [tp!.x, tp!.y];

            const [sx, sy] = src
              ? (anchor?.sourceAnchor && anchor.sourceAnchor !== 'center'
                  ? anchorPoint(src, anchor.sourceAnchor)
                  : borderPoint(src, tgtRef[0], tgtRef[1]))
              : [sp!.x, sp!.y];
            const [tx, ty] = tgt
              ? (anchor?.targetAnchor && anchor.targetAnchor !== 'center'
                  ? anchorPoint(tgt, anchor.targetAnchor)
                  : borderPoint(tgt, srcRef[0], srcRef[1]))
              : [tp!.x, tp!.y];

            const style = resolveConnStyle(md);
            let pts = pathPoints(style.pathKind, sx, sy, tx, ty, md.freehandPoints as number[] | undefined);
            if (style.pathKind === 'freehand' && pts.length >= 4) {
              pts = [...pts];
              pts[0] = sx;
              pts[1] = sy;
              pts[pts.length - 2] = tx;
              pts[pts.length - 1] = ty;
            }

            const isSelected = selectedIds.includes(conn.id);
            const color = isSelected ? '#3b82f6' : '#64748b';
            const curvy = style.pathKind === 'curved' || style.pathKind === 'freehand';
            const mx = (sx + tx) / 2;
            const my = (sy + ty) / 2;

            return (
              <Group key={conn.id}>
                <Arrow
                  points={pts}
                  tension={curvy ? 0.5 : 0}
                  stroke={color}
                  strokeWidth={isSelected ? 2 : 1.5}
                  fill={color}
                  dash={style.lineStyle === 'dashed' ? [8, 4] : undefined}
                  pointerLength={8}
                  pointerWidth={7}
                  pointerAtBeginning={style.startCap === 'arrow'}
                  pointerAtEnding={style.endCap === 'arrow'}
                  hitStrokeWidth={12}
                  onClick={(e: any) => { e.cancelBubble = true; setSelection([conn.id]); }}
                />
                {conn.name && (
                  <Label
                    x={mx}
                    y={my}
                    offsetX={(conn.name.length * 5 + 6) / 2}
                    offsetY={8}
                    listening={false}
                  >
                    <Tag fill="#ffffff" stroke="#e2e8f0" strokeWidth={0.5} cornerRadius={2} />
                    <Text
                      text={conn.name}
                      fontSize={10}
                      fontFamily="Inter, system-ui, sans-serif"
                      fill={color}
                      padding={3}
                    />
                  </Label>
                )}
                {isSelected && tool === 'select' && (
                  <>
                    <Circle
                      x={sx} y={sy} radius={5}
                      fill="#ffffff" stroke="#3b82f6" strokeWidth={1.5}
                      draggable
                      onMouseDown={(e: any) => { e.cancelBubble = true; }}
                      onDragEnd={(e: any) => {
                        e.cancelBubble = true;
                        handleEndpointDrag(conn, 'source', e.target.x(), e.target.y());
                      }}
                    />
                    <Circle
                      x={tx} y={ty} radius={5}
                      fill="#ffffff" stroke="#3b82f6" strokeWidth={1.5}
                      draggable
                      onMouseDown={(e: any) => { e.cancelBubble = true; }}
                      onDragEnd={(e: any) => {
                        e.cancelBubble = true;
                        handleEndpointDrag(conn, 'target', e.target.x(), e.target.y());
                      }}
                    />
                  </>
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
              />
            );
          })}

          {/* Preview while placing a connector */}
          {tool === 'connector' && pendingStart && connectPointer && (
            <Arrow
              points={pathPoints(activeConnectorKind, pendingStart.x, pendingStart.y, connectPointer.x, connectPointer.y)}
              tension={activeConnectorKind === 'curved' ? 0.5 : 0}
              stroke="#3b82f6"
              strokeWidth={1.5}
              fill="#3b82f6"
              dash={[6, 3]}
              pointerLength={8}
              pointerWidth={7}
              listening={false}
            />
          )}

          {/* Preview while drawing a freehand connector */}
          {freehandPts && freehandPts.length >= 4 && (
            <Line
              points={freehandPts}
              tension={0.4}
              stroke="#3b82f6"
              strokeWidth={1.5}
              dash={[6, 3]}
              listening={false}
            />
          )}

          {/* Shape draw preview */}
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
