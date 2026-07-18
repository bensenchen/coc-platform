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
import { borderPoint, anchorPoint, nearestAnchor, anchorsFor, outwardNormal } from './anchor';
import { resolveConnStyle, pathPoints, curvedPoints } from './connector-utils';
import { Spinner } from '@/components/ui/Spinner';
import type { CanvasObject, AnchorPosition, ShapeKind } from '@/models/canvas-object.model';

const MIN_DRAW = 10;
const DEFAULT_W = 120;
const DEFAULT_H = 60;
const MIN_SIZE = 20;
const HIT_PAD = 8;

interface Props {
  pageId: string;
}

interface EndpointHit {
  objectId: string | null;
  anchor: AnchorPosition | null;
  x: number;
  y: number;
}

interface ResizeDraft {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
}

function kindOf(o: CanvasObject): ShapeKind {
  return ((o.metadata as any)?.shapeKind ?? 'rect') as ShapeKind;
}

function objCenter(o: CanvasObject): [number, number] {
  return [o.positionX + (o.width ?? DEFAULT_W) / 2, o.positionY + (o.height ?? DEFAULT_H) / 2];
}

function containsPoint(o: CanvasObject, px: number, py: number, pad = 0): boolean {
  const w = o.width ?? DEFAULT_W;
  const h = o.height ?? DEFAULT_H;
  return px >= o.positionX - pad && px <= o.positionX + w + pad
    && py >= o.positionY - pad && py <= o.positionY + h + pad;
}

function unitTowards(fromX: number, fromY: number, toX: number, toY: number): [number, number] {
  const dx = toX - fromX;
  const dy = toY - fromY;
  const len = Math.hypot(dx, dy) || 1;
  return [dx / len, dy / len];
}

export function ContextCanvas({ pageId }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ width: 800, height: 600 });
  const [drawStart, setDrawStart] = useState<{ x: number; y: number } | null>(null);
  const [drawPreview, setDrawPreview] = useState<{ x: number; y: number; w: number; h: number } | null>(null);
  const [pendingStart, setPendingStart] = useState<EndpointHit | null>(null);
  const [connectPointer, setConnectPointer] = useState<{ x: number; y: number } | null>(null);
  const [freehandPts, setFreehandPts] = useState<number[] | null>(null);
  const [hoverHit, setHoverHit] = useState<{ shapeId: string; x: number; y: number } | null>(null);
  const [draggingEndpoint, setDraggingEndpoint] = useState(false);
  const [resizeDraft, setResizeDraft] = useState<ResizeDraft | null>(null);

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
        setHoverHit(null);
        setResizeDraft(null);
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

  const selectedShape = selectedIds.length === 1
    ? shapes.find((s) => s.id === selectedIds[0]) ?? null
    : null;

  // While resizing, render the shape from the draft instead of the DB values
  function shapeBox(o: CanvasObject): { x: number; y: number; w: number; h: number } {
    if (resizeDraft && resizeDraft.id === o.id) {
      return { x: resizeDraft.x, y: resizeDraft.y, w: resizeDraft.w, h: resizeDraft.h };
    }
    return { x: o.positionX, y: o.positionY, w: o.width ?? DEFAULT_W, h: o.height ?? DEFAULT_H };
  }

  // A click lands either on a shape (snap to its nearest valid anchor)
  // or on empty canvas (free point).
  function hitEndpoint(px: number, py: number): EndpointHit {
    const target = [...shapes].reverse().find((o) => containsPoint(o, px, py, HIT_PAD));
    if (target) return { objectId: target.id, anchor: nearestAnchor(target, px, py, kindOf(target)), x: px, y: py };
    return { objectId: null, anchor: null, x: px, y: py };
  }

  function updateHover(px: number, py: number) {
    const target = [...shapes].reverse().find((o) => containsPoint(o, px, py, HIT_PAD));
    setHoverHit(target ? { shapeId: target.id, x: px, y: py } : null);
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
    setHoverHit(null);
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
      updateHover(pos.x, pos.y);
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
          setHoverHit(null);
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

  function computeResize(obj: CanvasObject, corner: string, kx: number, ky: number): ResizeDraft {
    const ox = obj.positionX;
    const oy = obj.positionY;
    const ow = obj.width ?? DEFAULT_W;
    const oh = obj.height ?? DEFAULT_H;
    let x = ox, y = oy, w = ow, h = oh;
    if (corner === 'br') {
      w = Math.max(MIN_SIZE, kx - ox);
      h = Math.max(MIN_SIZE, ky - oy);
    } else if (corner === 'tr') {
      w = Math.max(MIN_SIZE, kx - ox);
      y = Math.min(ky, oy + oh - MIN_SIZE);
      h = oy + oh - y;
    } else if (corner === 'bl') {
      x = Math.min(kx, ox + ow - MIN_SIZE);
      w = ox + ow - x;
      h = Math.max(MIN_SIZE, ky - oy);
    } else {
      x = Math.min(kx, ox + ow - MIN_SIZE);
      w = ox + ow - x;
      y = Math.min(ky, oy + oh - MIN_SIZE);
      h = oy + oh - y;
    }
    return { id: obj.id, x, y, w, h };
  }

  // Precompute connector geometry so lines render below shapes while
  // their endpoint handles render on top of everything.
  const connGeo = connectors.flatMap((conn) => {
    const anchor = anchors.find((a) => a.connectorId === conn.id);
    const md = (conn.metadata as any) ?? {};
    const src = anchor?.sourceObjectId ? objMap.get(anchor.sourceObjectId) : undefined;
    const tgt = anchor?.targetObjectId ? objMap.get(anchor.targetObjectId) : undefined;
    const sp = md.sourcePoint as { x: number; y: number } | undefined;
    const tp = md.targetPoint as { x: number; y: number } | undefined;
    if ((!src && !sp) || (!tgt && !tp)) return [];

    const srcRef: [number, number] = src ? objCenter(src) : [sp!.x, sp!.y];
    const tgtRef: [number, number] = tgt ? objCenter(tgt) : [tp!.x, tp!.y];

    const [sx, sy] = src
      ? (anchor?.sourceAnchor && anchor.sourceAnchor !== 'center'
          ? anchorPoint(src, anchor.sourceAnchor, kindOf(src))
          : borderPoint(src, tgtRef[0], tgtRef[1]))
      : [sp!.x, sp!.y];
    const [tx, ty] = tgt
      ? (anchor?.targetAnchor && anchor.targetAnchor !== 'center'
          ? anchorPoint(tgt, anchor.targetAnchor, kindOf(tgt))
          : borderPoint(tgt, srcRef[0], srcRef[1]))
      : [tp!.x, tp!.y];

    const style = resolveConnStyle(md);
    const isCurved = style.pathKind === 'curved';

    // Curved connectors leave/enter perpendicular to the shape edge
    let pts: number[];
    if (isCurved) {
      const [snx, sny] = src && anchor?.sourceAnchor && anchor.sourceAnchor !== 'center'
        ? outwardNormal(src, anchor.sourceAnchor, kindOf(src))
        : unitTowards(sx, sy, tx, ty);
      const [tnx, tny] = tgt && anchor?.targetAnchor && anchor.targetAnchor !== 'center'
        ? outwardNormal(tgt, anchor.targetAnchor, kindOf(tgt))
        : unitTowards(tx, ty, sx, sy);
      pts = curvedPoints(sx, sy, snx, sny, tx, ty, tnx, tny);
    } else {
      pts = pathPoints(style.pathKind, sx, sy, tx, ty, md.freehandPoints as number[] | undefined);
      if (style.pathKind === 'freehand' && pts.length >= 4) {
        pts = [...pts];
        pts[0] = sx;
        pts[1] = sy;
        pts[pts.length - 2] = tx;
        pts[pts.length - 1] = ty;
      }
    }

    const isSelected = selectedIds.includes(conn.id);
    return [{
      conn, pts, sx, sy, tx, ty, style, isSelected, isCurved,
      color: isSelected ? '#3b82f6' : '#64748b',
      curvy: style.pathKind === 'freehand',
      fontSize: (md.fontSize as number | undefined) ?? 10,
    }];
  });

  // Hovered shape whose anchor dots should be visible
  const hoverShape = hoverHit && (tool === 'connector' || draggingEndpoint)
    ? shapes.find((s) => s.id === hoverHit.shapeId) ?? null
    : null;

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
          {/* Connector lines + labels */}
          {connGeo.map(({ conn, pts, sx, sy, tx, ty, style, isSelected, isCurved, curvy, color, fontSize }) => {
            const mx = (sx + tx) / 2;
            const my = (sy + ty) / 2;
            return (
              <Group key={conn.id}>
                <Arrow
                  points={pts}
                  bezier={isCurved}
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
                    offsetX={(conn.name.length * fontSize * 0.5 + 6) / 2}
                    offsetY={fontSize / 2 + 3}
                    listening={false}
                  >
                    <Tag fill="#ffffff" stroke="#e2e8f0" strokeWidth={0.5} cornerRadius={2} />
                    <Text
                      text={conn.name}
                      fontSize={fontSize}
                      fontFamily="Inter, system-ui, sans-serif"
                      fill={color}
                      padding={3}
                    />
                  </Label>
                )}
              </Group>
            );
          })}

          {/* Shapes — draggable only when already selected */}
          {shapes.map((obj) => {
            const b = shapeBox(obj);
            return (
              <ShapeNode
                key={obj.id}
                x={b.x}
                y={b.y}
                width={b.w}
                height={b.h}
                kind={kindOf(obj)}
                name={obj.name}
                isPhysical={obj.isPhysical}
                isSelected={selectedIds.includes(obj.id)}
                draggable={tool === 'select' && selectedIds.includes(obj.id) && !resizeDraft}
                onDragEnd={(x, y) => handleDragEnd(obj.id, x, y)}
                onClick={(e: any) => handleObjectClick(obj, e)}
                fontSize={((obj.metadata as any)?.fontSize as number | undefined) ?? 11}
              />
            );
          })}

          {/* Preview while placing a connector */}
          {tool === 'connector' && pendingStart && connectPointer && (() => {
            let pts: number[];
            let bezier = false;
            if (activeConnectorKind === 'curved') {
              const sObj = pendingStart.objectId ? objMap.get(pendingStart.objectId) : undefined;
              const [snx, sny] = sObj && pendingStart.anchor && pendingStart.anchor !== 'center'
                ? outwardNormal(sObj, pendingStart.anchor, kindOf(sObj))
                : unitTowards(pendingStart.x, pendingStart.y, connectPointer.x, connectPointer.y);
              const [tnx, tny] = unitTowards(connectPointer.x, connectPointer.y, pendingStart.x, pendingStart.y);
              pts = curvedPoints(pendingStart.x, pendingStart.y, snx, sny, connectPointer.x, connectPointer.y, tnx, tny);
              bezier = true;
            } else {
              pts = pathPoints(activeConnectorKind, pendingStart.x, pendingStart.y, connectPointer.x, connectPointer.y);
            }
            return (
              <Arrow
                points={pts}
                bezier={bezier}
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

          {/* Resize knobs for the selected shape */}
          {tool === 'select' && selectedShape && (() => {
            const b = shapeBox(selectedShape);
            const corners = [
              { k: 'tl', x: b.x, y: b.y },
              { k: 'tr', x: b.x + b.w, y: b.y },
              { k: 'bl', x: b.x, y: b.y + b.h },
              { k: 'br', x: b.x + b.w, y: b.y + b.h },
            ];
            return corners.map((c) => (
              <Rect
                key={c.k}
                x={c.x - 4}
                y={c.y - 4}
                width={8}
                height={8}
                fill="#ffffff"
                stroke="#3b82f6"
                strokeWidth={1.5}
                draggable
                onMouseDown={(e: any) => { e.cancelBubble = true; }}
                onDragMove={(e: any) => {
                  setResizeDraft(computeResize(selectedShape, c.k, e.target.x() + 4, e.target.y() + 4));
                }}
                onDragEnd={(e: any) => {
                  e.cancelBubble = true;
                  const r = computeResize(selectedShape, c.k, e.target.x() + 4, e.target.y() + 4);
                  updateObj.mutate({ id: selectedShape.id, patch: { positionX: r.x, positionY: r.y, width: r.w, height: r.h } });
                  setResizeDraft(null);
                }}
              />
            ));
          })()}

          {/* Anchor dots on the hovered shape — always on top */}
          {hoverShape && (() => {
            const kind = kindOf(hoverShape);
            const snapped = nearestAnchor(hoverShape, hoverHit!.x, hoverHit!.y, kind);
            return anchorsFor(kind).map((a) => {
              const [ax, ay] = anchorPoint(hoverShape, a, kind);
              return (
                <Circle
                  key={hoverShape.id + ':' + a}
                  x={ax}
                  y={ay}
                  radius={4}
                  fill={a === snapped ? '#3b82f6' : '#ffffff'}
                  stroke="#3b82f6"
                  strokeWidth={1.5}
                  listening={false}
                />
              );
            });
          })()}

          {/* Endpoint handles of the selected connector — always on top */}
          {tool === 'select' && connGeo.filter((g) => g.isSelected).map(({ conn, sx, sy, tx, ty }) => (
            <Group key={conn.id + ':handles'}>
              <Circle
                x={sx} y={sy} radius={5}
                fill="#ffffff" stroke="#3b82f6" strokeWidth={1.5}
                draggable
                onMouseDown={(e: any) => { e.cancelBubble = true; }}
                onDragStart={() => setDraggingEndpoint(true)}
                onDragMove={(e: any) => updateHover(e.target.x(), e.target.y())}
                onDragEnd={(e: any) => {
                  e.cancelBubble = true;
                  setDraggingEndpoint(false);
                  setHoverHit(null);
                  handleEndpointDrag(conn, 'source', e.target.x(), e.target.y());
                }}
              />
              <Circle
                x={tx} y={ty} radius={5}
                fill="#ffffff" stroke="#3b82f6" strokeWidth={1.5}
                draggable
                onMouseDown={(e: any) => { e.cancelBubble = true; }}
                onDragStart={() => setDraggingEndpoint(true)}
                onDragMove={(e: any) => updateHover(e.target.x(), e.target.y())}
                onDragEnd={(e: any) => {
                  e.cancelBubble = true;
                  setDraggingEndpoint(false);
                  setHoverHit(null);
                  handleEndpointDrag(conn, 'target', e.target.x(), e.target.y());
                }}
              />
            </Group>
          ))}
        </Layer>
      </Stage>
    </div>
  );
}
