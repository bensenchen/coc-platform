import { useState } from 'react';
import { useSheetView, useLinkablePages } from '@/hooks/useSheetView';
import {
  useSetLinkedPage,
  useUpdateColumnOrder,
  useUpdateRowOrder,
  useRenameColumn,
  useAddColumn,
  useDeleteColumn,
  useAddRow,
  useDeleteRow,
  useUpsertSheetCell,
} from '@/hooks/useSheetViewMutations';
import type { Page } from '@/models/page.model';

interface Props {
  sheetPage: Page;
  projectId: string;
}

// Apply a saved order to items; anything NOT in the saved order (e.g. a
// column inherited later from a linked page) is appended so it is never
// hidden.
function applyOrder<T extends { id: string }>(items: T[], order: string[] | null): T[] {
  if (!order) return items;
  const byId = new Map(items.map((it) => [it.id, it]));
  const ordered: T[] = [];
  for (const id of order) {
    const it = byId.get(id);
    if (it) {
      ordered.push(it);
      byId.delete(id);
    }
  }
  return [...ordered, ...byId.values()];
}

function moveId(ids: string[], dragId: string, targetId: string): string[] {
  const from = ids.indexOf(dragId);
  const to = ids.indexOf(targetId);
  if (from === -1 || to === -1 || from === to) return ids;
  const without = ids.filter((id) => id !== dragId);
  const targetIdx = without.indexOf(targetId);
  const insertAt = from < to ? targetIdx + 1 : targetIdx;
  without.splice(insertAt, 0, dragId);
  return without;
}

export function SheetTable({ sheetPage, projectId }: Props) {
  const linkedId = (sheetPage.metadata.linkedDataPageId as string | undefined) ?? null;
  const columnOrder = (sheetPage.metadata.columnOrder as string[] | undefined) ?? null;
  const rowOrder = (sheetPage.metadata.rowOrder as string[] | undefined) ?? null;

  const { data, isLoading } = useSheetView(sheetPage.id, projectId);
  const { data: linkable = [] } = useLinkablePages(sheetPage.id, projectId);

  const setLinkedPage = useSetLinkedPage(sheetPage);
  const updateColOrder = useUpdateColumnOrder(sheetPage);
  const updateRowOrder = useUpdateRowOrder(sheetPage);
  const renameCol = useRenameColumn();
  const addCol = useAddColumn(sheetPage.id);
  const deleteCol = useDeleteColumn();
  const addRow = useAddRow(sheetPage.id);
  const delRow = useDeleteRow();
  const upsertCell = useUpsertSheetCell();

  const [editingCell, setEditingCell] = useState<{ rowId: string; colId: string } | null>(null);
  const [cellDraft, setCellDraft] = useState('');
  const [editingColId, setEditingColId] = useState<string | null>(null);
  const [colDraft, setColDraft] = useState('');
  const [newColName, setNewColName] = useState('');
  const [addingCol, setAddingCol] = useState(false);
  const [dragColId, setDragColId] = useState<string | null>(null);
  const [overColId, setOverColId] = useState<string | null>(null);
  const [dragRowId, setDragRowId] = useState<string | null>(null);
  const [overRowId, setOverRowId] = useState<string | null>(null);

  if (isLoading) {
    return <div className="flex items-center justify-center h-full text-slate-400">Loading…</div>;
  }

  const columns = applyOrder(data?.columns ?? [], columnOrder);
  const rows = applyOrder(data?.rows ?? [], rowOrder);
  const cells = data?.cells ?? {};

  const isOwnCol = (pageId: string) => pageId === sheetPage.id;
  const isOwnRow = (pageId: string) => pageId === sheetPage.id;
  const linkedTitle = linkable.find((p) => p.id === linkedId)?.title ?? null;

  function startEdit(rowId: string, colId: string) {
    const val = cells[rowId]?.[colId];
    setCellDraft(val == null ? '' : String(val));
    setEditingCell({ rowId, colId });
  }

  function commitEdit() {
    if (!editingCell) return;
    upsertCell.mutate({ rowId: editingCell.rowId, columnId: editingCell.colId, value: cellDraft });
    setEditingCell(null);
  }

  function startColEdit(id: string, name: string) {
    setColDraft(name);
    setEditingColId(id);
  }

  function commitColEdit(id: string, current: string) {
    if (colDraft.trim() && colDraft !== current) {
      renameCol.mutate({ id, name: colDraft.trim() });
    }
    setEditingColId(null);
  }

  function handleAddCol() {
    if (!newColName.trim()) return;
    addCol.mutate(newColName.trim());
    setNewColName('');
    setAddingCol(false);
  }

  // Reordering only touches this page's metadata — linked pages keep their
  // own order and their cell data stays linked.
  function handleColDrop(targetId: string) {
    if (dragColId && dragColId !== targetId) {
      updateColOrder.mutate(moveId(columns.map((c) => c.id), dragColId, targetId));
    }
    setDragColId(null);
    setOverColId(null);
  }

  function handleRowDrop(targetId: string) {
    if (dragRowId && dragRowId !== targetId) {
      updateRowOrder.mutate(moveId(rows.map((r) => r.id), dragRowId, targetId));
    }
    setDragRowId(null);
    setOverRowId(null);
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Toolbar */}
      <div className="flex items-center gap-2 px-4 py-2 border-b border-slate-200 bg-white">
        <span className="text-sm font-medium text-slate-700">Sheet</span>

        <span className="text-[11px] text-slate-500">Linked to</span>
        <select
          value={linkedId ?? ''}
          onChange={(e) => setLinkedPage.mutate(e.target.value || null)}
          className="text-xs border border-slate-300 rounded px-2 py-1 text-slate-900 bg-white max-w-[180px]"
        >
          <option value="">— None (standalone) —</option>
          {linkable.map((p) => (
            <option key={p.id} value={p.id}>{p.title}</option>
          ))}
        </select>
        {linkedId && !linkedTitle && (
          <span className="text-[11px] text-red-500">source unavailable</span>
        )}

        <div className="flex-1" />
        <button
          onClick={() => addRow.mutate(undefined)}
          className="px-3 py-1.5 text-xs font-medium rounded border border-amber-300 text-amber-700 hover:bg-amber-50"
        >
          + Row
        </button>
        <button
          onClick={() => setAddingCol(true)}
          className="px-3 py-1.5 text-xs font-medium rounded border border-amber-300 text-amber-700 hover:bg-amber-50"
        >
          + Column
        </button>
      </div>

      {addingCol && (
        <div className="flex items-center gap-2 px-4 py-2 bg-amber-50 border-b border-amber-200">
          <input
            autoFocus
            value={newColName}
            onChange={(e) => setNewColName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleAddCol();
              if (e.key === 'Escape') setAddingCol(false);
            }}
            placeholder="Column name…"
            className="flex-1 text-sm border border-slate-300 rounded px-2 py-1 outline-none focus:ring-1 focus:ring-amber-400 text-slate-900"
          />
          <button onClick={handleAddCol} className="px-3 py-1 text-xs font-medium rounded bg-amber-600 text-white hover:bg-amber-700">Add</button>
          <button onClick={() => setAddingCol(false)} className="px-3 py-1 text-xs font-medium rounded border border-slate-300 text-slate-600 hover:bg-slate-100">Cancel</button>
        </div>
      )}

      <div className="flex-1 overflow-auto">
        {columns.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-slate-400 gap-2">
            <p className="text-sm">
              {linkedId ? 'The linked page has no columns yet.' : 'Standalone sheet — no columns yet.'}
            </p>
            <button onClick={() => setAddingCol(true)} className="text-xs text-amber-600 hover:underline">
              Add your first column →
            </button>
          </div>
        ) : (
          <table className="min-w-full text-sm border-collapse">
            <thead className="sticky top-0 z-10 bg-slate-50">
              <tr>
                <th className="w-8 px-2 py-2 border-b border-r border-slate-200 text-slate-400 font-normal text-xs">#</th>
                {columns.map((col) => {
                  const own = isOwnCol(col.pageId);
                  return (
                    <th
                      key={col.id}
                      draggable
                      onDragStart={() => setDragColId(col.id)}
                      onDragOver={(e) => { e.preventDefault(); setOverColId(col.id); }}
                      onDragLeave={() => setOverColId(null)}
                      onDrop={() => handleColDrop(col.id)}
                      onDragEnd={() => { setDragColId(null); setOverColId(null); }}
                      className={`min-w-[140px] px-3 py-2 border-b border-r border-slate-200 text-left font-medium cursor-grab ${
                        own ? 'bg-amber-50' : ''
                      } ${overColId === col.id && dragColId && dragColId !== col.id ? 'bg-indigo-50' : ''} ${
                        dragColId === col.id ? 'opacity-50' : ''
                      }`}
                    >
                      <div className="flex items-center gap-1.5 group">
                        {editingColId === col.id ? (
                          <input
                            autoFocus
                            value={colDraft}
                            onChange={(e) => setColDraft(e.target.value)}
                            onBlur={() => commitColEdit(col.id, col.name)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') commitColEdit(col.id, col.name);
                              if (e.key === 'Escape') setEditingColId(null);
                            }}
                            className="flex-1 text-sm border border-indigo-400 rounded px-1 outline-none text-slate-900"
                          />
                        ) : (
                          <span
                            className={`flex-1 text-sm cursor-pointer hover:text-indigo-600 ${own ? 'text-amber-800' : 'text-slate-700'}`}
                            onDoubleClick={() => startColEdit(col.id, col.name)}
                          >
                            {col.name}
                          </span>
                        )}
                        {own && (
                          <button
                            onClick={() => deleteCol.mutate(col.id)}
                            className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-red-500 text-xs ml-0.5"
                            title="Delete column"
                          >✕</button>
                        )}
                      </div>
                    </th>
                  );
                })}
                <th className="w-8 border-b border-slate-200" />
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && (
                <tr>
                  <td colSpan={columns.length + 2} className="py-12 text-center text-slate-400 text-sm">
                    No rows yet.
                  </td>
                </tr>
              )}
              {rows.map((row, idx) => {
                const ownRow = isOwnRow(row.pageId);
                return (
                  <tr
                    key={row.id}
                    onDragOver={(e) => { if (dragRowId) { e.preventDefault(); setOverRowId(row.id); } }}
                    onDrop={() => handleRowDrop(row.id)}
                    className={`hover:bg-slate-50 group/row ${ownRow ? 'bg-amber-50/40' : ''} ${
                      overRowId === row.id && dragRowId && dragRowId !== row.id ? 'bg-indigo-50' : ''
                    } ${dragRowId === row.id ? 'opacity-50' : ''}`}
                  >
                    <td
                      draggable
                      onDragStart={() => setDragRowId(row.id)}
                      onDragEnd={() => { setDragRowId(null); setOverRowId(null); }}
                      className="px-2 py-1.5 border-b border-r border-slate-100 text-slate-400 text-xs text-center cursor-grab"
                      title="Drag to reorder"
                    >
                      {idx + 1}
                    </td>
                    {columns.map((col) => {
                      const isEditing = editingCell?.rowId === row.id && editingCell?.colId === col.id;
                      const val = cells[row.id]?.[col.id];
                      return (
                        <td
                          key={col.id}
                          className="px-3 py-1.5 border-b border-r border-slate-100 cursor-text"
                          onClick={() => startEdit(row.id, col.id)}
                        >
                          {isEditing ? (
                            <input
                              autoFocus
                              value={cellDraft}
                              onChange={(e) => setCellDraft(e.target.value)}
                              onBlur={commitEdit}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') commitEdit();
                                if (e.key === 'Escape') setEditingCell(null);
                              }}
                              className="w-full outline-none border border-indigo-400 rounded px-1 text-sm text-slate-900"
                            />
                          ) : (
                            <span className={val == null ? 'text-slate-300 text-xs italic' : 'text-slate-700'}>
                              {val == null ? 'empty' : String(val)}
                            </span>
                          )}
                        </td>
                      );
                    })}
                    <td className="border-b border-slate-100 px-1 text-center">
                      {ownRow && (
                        <button
                          onClick={() => delRow.mutate(row.id)}
                          className="opacity-0 group-hover/row:opacity-100 text-slate-300 hover:text-red-400 text-xs"
                          title="Delete row"
                        >✕</button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
