import { useState, useRef, useEffect } from 'react';
import { Plus, Trash2, Check } from 'lucide-react';
import { useSheet } from '@/hooks/useSheet';
import {
  useCreateColumn, useUpdateColumn, useDeleteColumn,
  useCreateRow, useDeleteRow, useUpsertCell,
} from '@/hooks/useSheetMutations';
import { Spinner } from '@/components/ui/Spinner';
import { cn } from '@/lib/cn';
import type { ColumnDataType } from '@/models/sheet.model';

const DATA_TYPES: { value: ColumnDataType; label: string }[] = [
  { value: 'text',    label: 'Text'    },
  { value: 'number',  label: 'Number'  },
  { value: 'boolean', label: 'Boolean' },
  { value: 'date',    label: 'Date'    },
];

const TYPE_BADGE: Record<ColumnDataType, string> = {
  text:    'bg-slate-100 text-slate-500',
  number:  'bg-blue-50 text-blue-600',
  boolean: 'bg-green-50 text-green-600',
  date:    'bg-purple-50 text-purple-600',
  link:    'bg-orange-50 text-orange-600',
};

interface Props { pageId: string }

interface EditingCell { rowId: string; colId: string }

export function DataTable({ pageId }: Props) {
  const { data, isLoading } = useSheet(pageId);
  const addCol   = useCreateColumn(pageId);
  const updateCol = useUpdateColumn(pageId);
  const delCol   = useDeleteColumn(pageId);
  const addRow   = useCreateRow(pageId);
  const delRow   = useDeleteRow(pageId);
  const saveCell = useUpsertCell(pageId);

  // Cell editing
  const [editCell, setEditCell] = useState<EditingCell | null>(null);
  const [cellVal, setCellVal]   = useState('');
  const cellRef = useRef<HTMLInputElement>(null);

  // Column header editing
  const [editColId, setEditColId]   = useState<string | null>(null);
  const [colNameVal, setColNameVal] = useState('');
  const colRef = useRef<HTMLInputElement>(null);

  // Add column form
  const [addingCol, setAddingCol]   = useState(false);
  const [newColName, setNewColName] = useState('');
  const [newColType, setNewColType] = useState<ColumnDataType>('text');

  useEffect(() => { if (editCell && cellRef.current) cellRef.current.focus(); }, [editCell]);
  useEffect(() => { if (editColId && colRef.current) colRef.current.focus(); }, [editColId]);

  if (isLoading) return <div className="flex-1 flex items-center justify-center"><Spinner /></div>;

  const { columns = [], rows = [], cells = {} } = data ?? {};

  function startEditCell(rowId: string, colId: string) {
    const raw = cells[rowId]?.[colId];
    setCellVal(raw == null ? '' : String(raw));
    setEditCell({ rowId, colId });
  }

  function commitCell() {
    if (!editCell) return;
    const col = columns.find((c) => c.id === editCell.colId);
    let value: unknown = cellVal;
    if (col?.dataType === 'number') value = cellVal === '' ? null : Number(cellVal);
    else if (col?.dataType === 'boolean') value = cellVal === 'true' || cellVal === '1';
    else if (cellVal === '') value = null;
    saveCell.mutate({ rowId: editCell.rowId, columnId: editCell.colId, value });
    setEditCell(null);
  }

  function startEditCol(id: string, name: string) {
    setEditColId(id);
    setColNameVal(name);
  }

  function commitCol() {
    if (!editColId || !colNameVal.trim()) { setEditColId(null); return; }
    updateCol.mutate({ id: editColId, patch: { name: colNameVal.trim() } });
    setEditColId(null);
  }

  function submitAddCol() {
    if (!newColName.trim()) return;
    addCol.mutate({ name: newColName.trim(), dataType: newColType });
    setNewColName('');
    setNewColType('text');
    setAddingCol(false);
  }

  function renderCell(rowId: string, colId: string, dataType: ColumnDataType) {
    const raw = cells[rowId]?.[colId];
    const isEditing = editCell?.rowId === rowId && editCell?.colId === colId;

    if (isEditing) {
      if (dataType === 'boolean') {
        return (
          <input
            ref={cellRef}
            type="checkbox"
            checked={cellVal === 'true'}
            onChange={(e) => { setCellVal(e.target.checked ? 'true' : 'false'); }}
            onBlur={commitCell}
            className="mx-auto block"
          />
        );
      }
      return (
        <input
          ref={cellRef}
          type={dataType === 'number' ? 'number' : dataType === 'date' ? 'date' : 'text'}
          value={cellVal}
          onChange={(e) => setCellVal(e.target.value)}
          onBlur={commitCell}
          onKeyDown={(e) => {
            if (e.key === 'Enter') commitCell();
            if (e.key === 'Escape') setEditCell(null);
          }}
          className="w-full h-full px-1 outline-none bg-blue-50 text-xs"
        />
      );
    }

    let display = '';
    if (raw == null) display = '';
    else if (dataType === 'boolean') display = raw ? '✓' : '✗';
    else display = String(raw);

    return (
      <span
        className={cn('block truncate', !display && 'text-slate-300')}
        onDoubleClick={() => startEditCell(rowId, colId)}
        onClick={() => startEditCell(rowId, colId)}
      >
        {display || '—'}
      </span>
    );
  }

  return (
    <div className="flex-1 overflow-auto bg-white">
      <table className="min-w-full text-xs border-separate border-spacing-0">
        <thead className="sticky top-0 z-10 bg-slate-50">
          <tr>
            {/* Row number column */}
            <th className="w-10 border-b border-r border-slate-200 px-2 py-2 text-slate-400 font-normal text-right">#</th>

            {columns.map((col) => (
              <th key={col.id} className="border-b border-r border-slate-200 px-2 py-1.5 text-left font-medium min-w-[120px]">
                <div className="flex items-center gap-1 group">
                  {editColId === col.id ? (
                    <input
                      ref={colRef}
                      value={colNameVal}
                      onChange={(e) => setColNameVal(e.target.value)}
                      onBlur={commitCol}
                      onKeyDown={(e) => { if (e.key === 'Enter') commitCol(); if (e.key === 'Escape') setEditColId(null); }}
                      className="flex-1 outline-none bg-white border border-blue-400 rounded px-1 text-xs"
                    />
                  ) : (
                    <span className="flex-1 cursor-pointer truncate" onDoubleClick={() => startEditCol(col.id, col.name)}>
                      {col.name}
                    </span>
                  )}
                  <span className={cn('text-[9px] px-1 rounded flex-shrink-0', TYPE_BADGE[col.dataType])}>
                    {col.dataType}
                  </span>
                  <button
                    onClick={() => delCol.mutate(col.id)}
                    className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-600 flex-shrink-0"
                  >
                    <Trash2 size={10} />
                  </button>
                </div>
              </th>
            ))}

            {/* Add column */}
            <th className="border-b border-slate-200 px-2 py-1.5 w-40">
              {addingCol ? (
                <div className="flex items-center gap-1">
                  <input
                    autoFocus
                    value={newColName}
                    onChange={(e) => setNewColName(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') submitAddCol(); if (e.key === 'Escape') setAddingCol(false); }}
                    placeholder="Column name"
                    className="flex-1 min-w-0 outline-none border border-blue-400 rounded px-1 text-xs"
                  />
                  <select
                    value={newColType}
                    onChange={(e) => setNewColType(e.target.value as ColumnDataType)}
                    className="text-xs border border-slate-300 rounded px-0.5"
                  >
                    {DATA_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                  <button onClick={submitAddCol} className="text-green-600"><Check size={12} /></button>
                </div>
              ) : (
                <button
                  onClick={() => setAddingCol(true)}
                  className="flex items-center gap-1 text-slate-400 hover:text-slate-600"
                >
                  <Plus size={12} /> Column
                </button>
              )}
            </th>
          </tr>
        </thead>

        <tbody>
          {rows.map((row, i) => (
            <tr key={row.id} className="group hover:bg-slate-50">
              <td className="border-b border-r border-slate-100 px-2 py-1 text-slate-400 text-right">
                <div className="flex items-center justify-end gap-1">
                  <button
                    onClick={() => delRow.mutate(row.id)}
                    className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-600"
                  >
                    <Trash2 size={10} />
                  </button>
                  <span>{i + 1}</span>
                </div>
              </td>

              {columns.map((col) => (
                <td
                  key={col.id}
                  className={cn(
                    'border-b border-r border-slate-100 px-2 py-1 h-8 cursor-text',
                    editCell?.rowId === row.id && editCell?.colId === col.id && 'p-0',
                  )}
                >
                  {renderCell(row.id, col.id, col.dataType)}
                </td>
              ))}

              <td className="border-b border-slate-100" />
            </tr>
          ))}

          {/* Add row */}
          <tr>
            <td colSpan={columns.length + 2} className="px-2 py-1.5">
              <button
                onClick={() => addRow.mutate()}
                className="flex items-center gap-1 text-slate-400 hover:text-slate-600 text-xs"
              >
                <Plus size={12} /> Add row
              </button>
            </td>
          </tr>
        </tbody>
      </table>

      {columns.length === 0 && (
        <div className="text-center py-16 text-slate-400 text-xs">
          No columns yet — click "+ Column" to add one
        </div>
      )}
    </div>
  );
}
