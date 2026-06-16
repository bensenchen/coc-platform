import { useRef, useCallback, useEffect, useState } from 'react';
import { Stage, Layer, Arrow, Circle } from 'react-konva';
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

const DEFAULT_W = 120;
const DEFAULT_H = 60;

interface Props {
  pageId: string;
}

export function ContextCanvas({ pageId }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ width: 800, height: 600 });

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
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [selectedIds, deleteObj, clearSelection, finishConnect]);

  const handleStageClick = useCallback(
    (e: any) => {
      const stage = e.target.getStage();
      const pos = stage.getRelativePointerPosition();

      if (tool === 'shape') {
        createObj.mutate({
          type: 'shape',
          positionX: pos.x - DEFAULT_W / 2,
          positionY: pos.y - DEFAULT_H / 2,
          width: DEFAULT_W,
          height: DEFAULT_H,
          metadata: { shapeKind: activeShapeKind },
        });
        return;
      }

      if (e.target === stage || e.target.getParent() === stage.findOne('Layer')) {
        clearSelection();
        finishConnect();
      }
    },
    [tool, activeShapeKind, createObj, clearSelection, finishConnect],
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

  return (
    <div
      ref={containerRef}
      className="flex-1 overflow-hidden bg-slate-100"
      style={{ cursor: tool === 'shape' ? 'crosshair' : tool === 'connector' ? 'cell' : 'default' }}
    >
      <Stage
        width={size.width}
        height={size.height}
        scaleX={zoom}
        scaleY={zoom}
        x={panX}
        y={panY}
        onClick={handleStageClick}
        onWheel={handleWheel}
        draggable={tool === 'pan'}
        onDragEnd={(e: any) => {
          if (tool === 'pan') setPan(e.target.x(), e.target.y());
        }}
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
            return (
              <Arrow
                key={conn.id}
                points={[sx, sy, tx, ty]}
                stroke={selectedIds.includes(conn.id) ? '#3b82f6' : '#64748b'}
                strokeWidth={selectedIds.includes(conn.id) ? 2 : 1.5}
                fill={selectedIds.includes(conn.id) ? '#3b82f6' : '#64748b'}
                pointerLength={8}
                pointerWidth={7}
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

          {connectingFromId && (() => {
            const src = objMap.get(connectingFromId);
            if (!src) return null;
            const [cx, cy] = anchorPoint(src, 'center');
            return <Circle x={cx} y={cy} radius={6} fill="#3b82f6" opacity={0.6} listening={false} />;
          })()}
        </Layer>
      </Stage>
    </div>
  );
}
