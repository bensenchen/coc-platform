import { useState, useEffect } from 'react';
import { useCanvasStore } from '@/stores/canvas.store';
import { useUpdateObject, useDeleteObject } from '@/hooks/useCanvasMutations';
import { useCanvasObjects } from '@/hooks/useCanvasObjects';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { resolveConnStyle } from './connector-utils';
import type { ShapeKind } from '@/models/canvas-object.model';

const SHAPE_KINDS: { kind: ShapeKind; label: string }[] = [
  { kind: 'rect',     label: 'Rectangle' },
  { kind: 'process',  label: 'Process'   },
  { kind: 'ellipse',  label: 'Ellipse'   },
  { kind: 'diamond',  label: 'Diamond'   },
  { kind: 'triangle', label: 'Triangle'  },
  { kind: 'cylinder', label: 'Cylinder'  },
];

interface Props {
  pageId: string;
}

export function PropertiesPanel({ pageId }: Props) {
  const { selectedIds, clearSelection } = useCanvasStore();
  const { data } = useCanvasObjects(pageId);
  const updateObj = useUpdateObject(pageId);
  const deleteObj = useDeleteObject(pageId);

  const selectedId = selectedIds[0] ?? null;
  const obj = data?.objects.find((o) => o.id === selectedId) ?? null;

  const [name, setName] = useState('');

  useEffect(() => {
    setName(obj?.name ?? '');
  }, [obj?.id, obj?.name]);

  // Always reserve the panel width to prevent canvas from resizing
  if (!obj) {
    return <div className="w-56 flex-shrink-0 border-l border-slate-200 bg-white" />;
  }

  const isShape = obj.type === 'shape';
  const isConnector = obj.type === 'connector';
  const shapeKind: ShapeKind = (obj.metadata as any)?.shapeKind ?? 'rect';
  const connStyle = resolveConnStyle(obj.metadata as any);
  const fontSize: number = (obj.metadata as any)?.fontSize ?? (isConnector ? 10 : 11);

  function commitName() {
    if (!obj) return;
    const trimmed = name.trim();
    if (trimmed !== (obj.name ?? '')) {
      updateObj.mutate({ id: obj.id, patch: { name: trimmed || null } });
    }
  }

  function setMeta(patch: Record<string, unknown>) {
    if (!obj) return;
    updateObj.mutate({ id: obj.id, patch: { metadata: { ...(obj.metadata as any), ...patch } } });
  }

  function togglePhysical() {
    if (!obj) return;
    updateObj.mutate({ id: obj.id, patch: { isPhysical: !obj.isPhysical } });
  }

  function handleDelete() {
    if (!obj) return;
    deleteObj.mutate(obj.id);
    clearSelection();
  }

  const selectCls = 'w-full h-9 rounded-md border border-slate-300 text-xs px-2 text-slate-900 bg-white';

  return (
    <div className="w-56 flex-shrink-0 bg-white border-l border-slate-200 p-4 overflow-y-auto">
      <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
        {isConnector ? 'Connector' : 'Shape'}
      </h3>

      <label className="block mb-3">
        <span className="text-xs text-slate-600 mb-1 block">Name</span>
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          onBlur={commitName}
          onKeyDown={(e) => { if (e.key === 'Enter') commitName(); }}
          placeholder="Unnamed"
          className="text-xs"
        />
      </label>

      <label className="block mb-3">
        <span className="text-xs text-slate-600 mb-1 block">Text size</span>
        <select
          value={fontSize}
          onChange={(e) => setMeta({ fontSize: Number(e.target.value) })}
          className={selectCls}
        >
          {[8, 9, 10, 11, 12, 14, 16, 18, 20, 24].map((s) => (
            <option key={s} value={s}>{s} px</option>
          ))}
        </select>
      </label>

      {isConnector && (
        <>
          <label className="block mb-3">
            <span className="text-xs text-slate-600 mb-1 block">Path</span>
            <select
              value={connStyle.pathKind}
              onChange={(e) => setMeta({ pathKind: e.target.value })}
              className={selectCls}
            >
              <option value="straight">Straight</option>
              <option value="elbow">Elbow</option>
              <option value="curved">Curved</option>
              <option value="freehand">Freehand</option>
            </select>
          </label>

          <label className="block mb-3">
            <span className="text-xs text-slate-600 mb-1 block">Line</span>
            <select
              value={connStyle.lineStyle}
              onChange={(e) => setMeta({ lineStyle: e.target.value })}
              className={selectCls}
            >
              <option value="solid">Solid</option>
              <option value="dashed">Dashed</option>
            </select>
          </label>

          <div className="flex gap-2 mb-3">
            <label className="block flex-1">
              <span className="text-xs text-slate-600 mb-1 block">Start end</span>
              <select
                value={connStyle.startCap}
                onChange={(e) => setMeta({ startCap: e.target.value })}
                className={selectCls}
              >
                <option value="none">None</option>
                <option value="arrow">Arrow</option>
              </select>
            </label>
            <label className="block flex-1">
              <span className="text-xs text-slate-600 mb-1 block">End end</span>
              <select
                value={connStyle.endCap}
                onChange={(e) => setMeta({ endCap: e.target.value })}
                className={selectCls}
              >
                <option value="none">None</option>
                <option value="arrow">Arrow</option>
              </select>
            </label>
          </div>
        </>
      )}

      {isShape && (
        <label className="block mb-3">
          <span className="text-xs text-slate-600 mb-1 block">Shape</span>
          <select
            value={shapeKind}
            onChange={(e) => setMeta({ shapeKind: e.target.value })}
            className={selectCls}
          >
            {SHAPE_KINDS.map(({ kind, label }) => (
              <option key={kind} value={kind}>{label}</option>
            ))}
          </select>
        </label>
      )}

      <label className="flex items-center gap-2 mb-4 cursor-pointer">
        <input type="checkbox" checked={obj.isPhysical} onChange={togglePhysical} className="rounded" />
        <span className="text-xs text-slate-700">Physical Part</span>
      </label>

      {isShape && obj.isPhysical && (
        <p className="text-[10px] text-amber-600 bg-amber-50 rounded p-2 mb-3">
          Data page auto-link — coming soon
        </p>
      )}

      <div className="pt-2 border-t border-slate-100">
        <Button variant="danger" size="sm" onClick={handleDelete} className="w-full">
          Delete
        </Button>
      </div>

      <p className="text-[10px] text-slate-400 mt-3 font-mono truncate">{obj.id.slice(0, 12)}…</p>
    </div>
  );
}
