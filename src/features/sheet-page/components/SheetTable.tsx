import { useState } from 'react';
import { useSheetView, useProjectDataPages } from '@/hooks/useSheetView';
import {
  useLinkDataPage,
  useUpdateColumnOrder,
  useAddMgmtColumn,
  useDeleteMgmtColumn,
  useAddMgmtRow,
  useDeleteMgmtRow,
  useUpsertSheetCell,
} from '@/hooks/useSheetViewMutations';
import type { Page } from '@/models/page.model';
import type { SheetColumn, SheetRow } from '@/models/sheet.model';

interface Props {
  sheetPage: Page;
  projectId: string;
}

type MergedCol = SheetColumn & { isMgmt: boolean };
type MergedRow = SheetRow & { isMgmt: boolean };

const TYPE_BADGE: Record<string, string> = {
  text: 'bg-slate-100 text-slate-600',
  number: 'bg-blue-100 text-blue-700',
  boolean: 'bg-purple-100 text-purple-700',
  date: 'bg-green-100 text-green-700',
  link: 'bg-orange-100 text-orange-700',
};

export function SheetTable({ sheetPage, projectId }: Props) {
  const linkedDataPageId = (sheetPage.metadata.linkedDataPageId as string | undefined) ?? null;
  const columnOrder = (sheetPage.metadata.columnOrder as string[] | undefined) ?? null;

  const { data, isLoading } = useSheetView(sheetPage.id, linkedDataPageId);
  const { data: dataPages = [] } = useProjectDataPages(projectId);

  const linkDataPage = useLinkDataPage(sheetPage);
  const updateColOrder = useUpdateColumnOrder(sheetPage);
  const addMgmtCol = useAddMgmtColumn(sheetPage.id, linkedDataPageId);
  const deleteMgmtCol = useDeleteMgmtColumn(sheetPage.id, linkedDataPageId);
  const addMgmtRow = useAddMgmtRow(sheetPage.id, linkedDataPageId);
  const deleteMgmtRow = useDeleteMgmtRow(sheetPage.id, linkedDataPageId);
  const upsertCell = useUpsertSheetCell(sheetPage.id, linkedDataPageId);

  const [editingCell, setEditingCell] = useState<{ rowId: string; colId: string } | null>(null);
  const [cellDraft, setCellDraft] = useState('');
  const [newColName, setNewColName] = useState('');
  const [addingCol, setAddingCol] = useState(false);

  if (isLoading) {
    return <div className="flex items-center justify-center h-full text-slate-400">Loading…</div>;
  }

  // --- Link picker (shown when no data page is linked) ---
  if (!linkedDataPageId) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4">
        <p className="text-slate-600 font-medium text-sm">Link this Sheet to a Data Page</p>
        <p className="text-slate-400 text-xs max-w-xs text-center">
          The Sheet view mirrors a Data Page's rows and columns. You can add management-only columns without affecting the source data.
        </p>
        {dataPages.length === 0 ? (
          <p className="text-xs text-slate-400">No Data Pages found in this project. Create one first.</p>
        ) : (
          <select
            className="border border-slate-300 rounded px-3 py-2 text-sm min-w-[220px]"
            defaultValue=""
            onChange={(e) => { if (e.target.value) linkDataPage.mutate(e.target.value); }}
          >
            <option value="" disabled>Select a Data Page…</option>
            {dataPages.map((p) => (
              <option key={p.id} value={p.id}>{p.title}</option>
            ))}
          </select>
        )}
      </div>
    );
  }

  const dataPageColumns = data?.dataPageColumns ?? [];
  const mgmtColumns = data?.mgmtColumns ?? [];
  const dataPageRows = data?.dataPageRows ?? [];
  const mgmtRows = data?.mgmtRows ?? [];
  const cells = data?.cells ?? {};

  const allCols: MergedCol[] = [
    ...dataPageColumns.map((c) => ({ ...c, isMgmt: false })),
    ...mgmtColumns.map((c) => ({ ...c, isMgmt: true })),
  ];

  const orderedCols: MergedCol[] = columnOrder
    ? (columnOrder.map((id) => allCols.find((c) => c.id === id)).filter(Boolean) as MergedCol[])
    : allCols;

  const allRows: MergedRow[] = [
    ...dataPageRows.map((r) => ({ ...r, isMgmt: false })),
    ...mgmtRows.map((r) => ({ ...r, isMgmt: true })),
  ];

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

  function moveCol(col: MergedCol, dir: -1 | 1) {
    const ids = orderedCols.map((c) => c.id);
    const idx = ids.indexOf(col.id);
    const next = idx + dir;
    if (next < 0 || next >= ids.length) return;
    [ids[idx], ids[next]] = [ids[next], ids[idx]];
    updateColOrder.mutate(ids);
  }

  function handleAddCol() {
    if (!newColName.trim()) return;
    addMgmtCol.mutate(newColName.trim());
    setNewColName('');
    setAddingCol(false);
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Toolbar */}
      <div className="flex items-center gap-2 px-4 py-2 border-b border-slate-200 bg-white">
        <span className="text-sm font-medium text-slate-700">Sheet / MGMT</span>
        <span className="text-[11px] text-slate-400 bg-slate-100 rounded px-2 py-0.5">
          linked to data
        </span>
        <div className="flex-1" />
        <button
          onClick={() => addMgmtRow.mutate(undefined)}
          className="px-3 py-1.5 text-xs font-medium rounded border border-amber-300 text-amber-700 hover:bg-amber-50"
        >
          + MGMT Row
        </button>
        <button
          onClick={() => setAddingCol(true)}
          className="px-3 py-1.5 text-xs font-medium rounded border border-slate-300 text-slate-700 hover:bg-slate-50"
        >
          + MGMT Column
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
            placeholder="Management column name…"
            className="flex-1 text-sm border border-slate-300 rounded px-2 py-1 outline-none focus:ring-1 focus:ring-amber-400"
          />
          <button onClick={handleAddCol} className="px-3 py-1 text-xs font-medium rounded bg-amber-600 text-white hover:bg-amber-700">Add</button>
          <button onClick={() => setAddingCol(false)} className="px-3 py-1 text-xs font-medium rounded border border-slate-300 text-slate-600 hover:bg-slate-100">Cancel</button>
        </div>
      )}

      <div className="flex-1 overflow-auto">
        <table className="min-w-full text-sm border-collapse">
          <thead className="sticky top-0 z-10 bg-slate-50">
            <tr>
              <th className="w-8 px-2 py-2 border-b border-r border-slate-200 text-slate-400 font-normal text-xs">#</th>
              {orderedCols.map((col, idx) => (
                <th
                  key={col.id}
                  className={`min-w-[140px] px-3 py-2 border-b border-r border-slate-200 text-left font-medium ${
                    col.isMgmt ? 'bg-amber-50' : ''
                  }`}
                >
                  <div className="flex items-center gap-1 group">
                    <button
                      onClick={() => moveCol(col, -1)}
                      disabled={idx === 0}
                      className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-slate-700 disabled:opacity-20 text-xs leading-none"
                      title="Move left"
                    >←</button>
                    <span className={`flex-1 text-sm ${col.isMgmt ? 'text-amber-800' : 'text-slate-700'}`}>
                      {col.name}
                    </span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded font-normal ${TYPE_BADGE[col.dataType] ?? TYPE_BADGE.text}`}>
                      {col.dataType}
                    </span>
                    {col.isMgmt && (
                      <span className="text-[10px] px-1 py-0.5 rounded bg-amber-100 text-amber-700 font-normal">mgmt</span>
                    )}
                    <button
                      onClick={() => moveCol(col, 1)}
                      disabled={idx === orderedCols.length - 1}
                      className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-slate-700 disabled:opacity-20 text-xs leading-none"
                      title="Move right"
                    >→</button>
                    {col.isMgmt && (
                      <button
                        onClick={() => deleteMgmtCol.mutate(col.id)}
                        className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-red-500 text-xs ml-0.5"
                        title="Delete column"
                      >✕</button>
                    )}
                  </div>
                </th>
              ))}
              <th className="w-8 border-b border-slate-200" />
            </tr>
          </thead>
          <tbody>
            {allRows.length === 0 && (
              <tr>
                <td colSpan={orderedCols.length + 2} className="py-12 text-center text-slate-400 text-sm">
                  No rows in the linked Data Page yet.
                </td>
              </tr>
            )}
            {allRows.map((row, idx) => (
              <tr
                key={row.id}
                className={`hover:bg-slate-50 group/row ${row.isMgmt ? 'bg-amber-50/40' : ''}`}
              >
                <td className="px-2 py-1.5 border-b border-r border-slate-100 text-slate-400 text-xs text-center">
                  {idx + 1}
                </td>
                {orderedCols.map((col) => {
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
                          className="w-full outline-none border border-indigo-400 rounded px-1 text-sm"
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
                  {row.isMgmt && (
                    <button
                      onClick={() => deleteMgmtRow.mutate(row.id)}
                      className="opacity-0 group-hover/row:opacity-100 text-slate-300 hover:text-red-400 text-xs"
                      title="Delete row"
                    >✕</button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
