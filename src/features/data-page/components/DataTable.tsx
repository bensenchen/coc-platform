import { useState } from 'react';
import { useSheet } from '@/hooks/useSheet';
import {
  useCreateColumn,
  useUpdateColumn,
  useDeleteColumn,
  useCreateRow,
  useDeleteRow,
  useUpsertCell,
  useReorderColumns,
  useReorderRows,
} from '@/hooks/useSheetMutations';
import type { SheetColumn } from '@/models/sheet.model';

interface Props {
  pageId: string;
}

function moveId(ids: string[], dragId: string, targetId: string): string[] {
  const without = ids.filter((id) => id !== dragId);
  const idx = without.indexOf(targetId);
  if (idx === -1) return ids;
  without.splice(idx, 0, dragId);
  return without;
}

export function DataTable({ pageId }: Props) {
  const { data, isLoading } = useSheet(pageId);
  const createCol = useCreateColumn(pageId);
  const updateCol = useUpdateColumn(pageId);
  const deleteCol = useDeleteColumn(pageId);
  const addRow = useCreateRow(pageId);
  const delRow = useDeleteRow(pageId);
  const upsertCell = useUpsertCell(pageId);
  const reorderCols = useReorderColumns(pageId);
  const reorderRows = useReorderRows(pageId);

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
    return (
      <div className="flex items-center justify-center h-full text-slate-400">
        Loading data…
      </div>
    );
  }

  const columns = data?.columns ?? [];
  const rows = data?.rows ?? [];
  const cells = data?.cells ?? {};

  function startCellEdit(rowId: string, colId: string) {
    const val = cells[rowId]?.[colId];
    setCellDraft(val == null ? '' : String(val));
    setEditingCell({ rowId, colId });
  }

  function commitCellEdit() {
    if (!editingCell) return;
    upsertCell.mutate({
      rowId: editingCell.rowId,
      columnId: editingCell.colId,
      value: cellDraft,
    });
    setEditingCell(null);
  }

  function startColEdit(col: SheetColumn) {
    setColDraft(col.name);
    setEditingColId(col.id);
  }

  function commitColEdit(col: SheetColumn) {
    if (colDraft.trim() && colDraft !== col.name) {
      updateCol.mutate({ id: col.id, patch: { name: colDraft.trim() } });
    }
    setEditingColId(null);
  }

  function handleAddCol() {
    if (!newColName.trim()) return;
    createCol.mutate(newColName.trim());
    setNewColName('');
    setAddingCol(false);
  }

  function handleColDrop(targetId: string) {
    if (dragColId && dragColId !== targetId) {
      reorderCols.mutate(moveId(columns.map((c) => c.id), dragColId, targetId));
    }
    setDragColId(null);
    setOverColId(null);
  }

  function handleRowDrop(targetId: string) {
    if (dragRowId && dragRowId !== targetId) {
      reorderRows.mutate(moveId(rows.map((r) => r.id), dragRowId, targetId));
    }
    setDragRowId(null);
    setOverRowId(null);
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Toolbar */}
      <div className="flex items-center gap-2 px-4 py-2 border-b border-slate-200 bg-white">
        <span className="text-sm font-medium text-slate-700">Data Table</span>
        <div className="flex-1" />
        <button
          onClick={() => addRow.mutate(undefined)}
          className="px-3 py-1.5 text-xs font-medium rounded bg-indigo-600 text-white hover:bg-indigo-700"
        >
          + Row
        </button>
        <button
          onClick={() => setAddingCol(true)}
          className="px-3 py-1.5 text-xs font-medium rounded border border-slate-300 text-slate-700 hover:bg-slate-50"
        >
          + Column
        </button>
      </div>

      {/* Add column form */}
      {addingCol && (
        <div className="flex items-center gap-2 px-4 py-2 bg-slate-50 border-b border-slate-200">
          <input
            autoFocus
            value={newColName}
            onChange={(e) => setNewColName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleAddCol();
              if (e.key === 'Escape') setAddingCol(false);
            }}
            placeholder="Column name…"
            className="flex-1 text-sm border border-slate-300 rounded px-2 py-1 outline-none focus:ring-1 focus:ring-indigo-400 text-slate-900"
          />
          <button
            onClick={handleAddCol}
            className="px-3 py-1 text-xs font-medium rounded bg-indigo-600 text-white hover:bg-indigo-700"
          >
            Add
          </button>
          <button
            onClick={() => setAddingCol(false)}
            className="px-3 py-1 text-xs font-medium rounded border border-slate-300 text-slate-600 hover:bg-slate-100"
          >
            Cancel
          </button>
        </div>
      )}

      {/* Table */}
      <div className="flex-1 overflow-auto">
        {columns.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-slate-400 gap-2">
            <p className="text-sm">No columns yet.</p>
            <button
              onClick={() => setAddingCol(true)}
              className="text-xs text-indigo-600 hover:underline"
            >
              Add your first column →
            </button>
          </div>
        ) : (
          <table className="min-w-full text-sm border-collapse">
            <thead className="sticky top-0 z-10 bg-slate-50">
              <tr>
                <th className="w-8 px-2 py-2 border-b border-r border-slate-200 text-slate-400 font-normal text-xs">
                  #
                </th>
                {columns.map((col) => (
                  <th
                    key={col.id}
                    draggable
                    onDragStart={() => setDragColId(col.id)}
                    onDragOver={(e) => { e.preventDefault(); setOverColId(col.id); }}
                    onDragLeave={() => setOverColId(null)}
                    onDrop={() => handleColDrop(col.id)}
                    onDragEnd={() => { setDragColId(null); setOverColId(null); }}
                    className={`min-w-[140px] px-3 py-2 border-b border-r border-slate-200 text-left font-medium text-slate-700 cursor-grab ${
                      overColId === col.id && dragColId && dragColId !== col.id ? 'bg-indigo-50' : ''
                    } ${dragColId === col.id ? 'opacity-50' : ''}`}
                  >
                    <div className="flex items-center gap-1.5 group">
                      {editingColId === col.id ? (
                        <input
                          autoFocus
                          value={colDraft}
                          onChange={(e) => setColDraft(e.target.value)}
                          onBlur={() => commitColEdit(col)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') commitColEdit(col);
                            if (e.key === 'Escape') setEditingColId(null);
                          }}
                          className="flex-1 text-sm border border-indigo-400 rounded px-1 outline-none text-slate-900"
                        />
                      ) : (
                        <span
                          className="flex-1 cursor-pointer hover:text-indigo-600"
                          onDoubleClick={() => startColEdit(col)}
                        >
                          {col.name}
                        </span>
                      )}
                      <button
                        onClick={() => deleteCol.mutate(col.id)}
                        className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-red-500 text-xs ml-1"
                        title="Delete column"
                      >
                        ✕
                      </button>
                    </div>
                  </th>
                ))}
                <th className="w-8 border-b border-slate-200" />
              </tr>
            </thead>
            <tbody>
              {rows.map((row, idx) => (
                <tr
                  key={row.id}
                  onDragOver={(e) => { if (dragRowId) { e.preventDefault(); setOverRowId(row.id); } }}
                  onDrop={() => handleRowDrop(row.id)}
                  className={`hover:bg-slate-50 group/row ${
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
                    const isEditing =
                      editingCell?.rowId === row.id && editingCell?.colId === col.id;
                    const val = cells[row.id]?.[col.id];
                    return (
                      <td
                        key={col.id}
                        className="px-3 py-1.5 border-b border-r border-slate-100 cursor-text"
                        onClick={() => startCellEdit(row.id, col.id)}
                      >
                        {isEditing ? (
                          <input
                            autoFocus
                            value={cellDraft}
                            onChange={(e) => setCellDraft(e.target.value)}
                            onBlur={commitCellEdit}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') commitCellEdit();
                              if (e.key === 'Escape') setEditingCell(null);
                            }}
                            className="w-full outline-none border border-indigo-400 rounded px-1 text-sm text-slate-900"
                          />
                        ) : (
                          <span className="text-slate-700">
                            {val == null ? '' : String(val)}
                          </span>
                        )}
                      </td>
                    );
                  })}
                  <td className="border-b border-slate-100 px-1">
                    <button
                      onClick={() => delRow.mutate(row.id)}
                      className="opacity-0 group-hover/row:opacity-100 text-slate-300 hover:text-red-400 text-xs"
                      title="Delete row"
                    >
                      ✕
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
