import { useState, useEffect, useRef } from 'react';
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
  useUpdateViewFormat,
} from '@/hooks/useSheetViewMutations';
import type { Page } from '@/models/page.model';

interface Props {
  sheetPage: Page;
  projectId: string;
}

// Per-cell formatting override, stored on this sheet page's metadata.
type CellFmt = {
  bg?: string;
  color?: string;
  bold?: boolean;
  italic?: boolean;
  align?: 'left' | 'center' | 'right';
};
type CellFmtMap = Record<string, Record<string, CellFmt>>;

interface Cursor { r: number; c: number }
interface ClipCell { value: unknown; fmt: CellFmt }
interface Clip { tsv: string; grid: ClipCell[][] }

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

// Parse pasted TSV (from this app or an external spreadsheet) into a grid.
function tsvToGrid(text: string): ClipCell[][] {
  const lines = text.replace(/\r/g, '').split('\n');
  if (lines.length > 1 && lines[lines.length - 1] === '') lines.pop();
  return lines.map((line) => line.split('\t').map((v) => ({ value: v, fmt: {} })));
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
  const updateFormat = useUpdateViewFormat(sheetPage);

  // Per-view formatting, stored in this page's metadata (local to this view).
  const colBg = (sheetPage.metadata.colBg as Record<string, string> | undefined) ?? {};
  const rowBg = (sheetPage.metadata.rowBg as Record<string, string> | undefined) ?? {};
  const cellFmt = (sheetPage.metadata.cellFmt as CellFmtMap | undefined) ?? {};

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

  // --- Range selection state (by row/column index into the ordered arrays) ---
  const [selAnchor, setSelAnchor] = useState<Cursor | null>(null);
  const [selFocus, setSelFocus] = useState<Cursor | null>(null);
  const [selecting, setSelecting] = useState(false);
  const clipRef = useRef<Clip | null>(null);

  const columns = applyOrder(data?.columns ?? [], columnOrder);
  const rows = applyOrder(data?.rows ?? [], rowOrder);
  const cells = data?.cells ?? {};

  const isOwnCol = (pageId: string) => pageId === sheetPage.id;
  const isOwnRow = (pageId: string) => pageId === sheetPage.id;
  const linkedTitle = linkable.find((p) => p.id === linkedId)?.title ?? null;

  const selRect = selAnchor && selFocus
    ? {
        r1: Math.min(selAnchor.r, selFocus.r),
        r2: Math.max(selAnchor.r, selFocus.r),
        c1: Math.min(selAnchor.c, selFocus.c),
        c2: Math.max(selAnchor.c, selFocus.c),
      }
    : null;

  const inSel = (r: number, c: number) =>
    !!selRect && r >= selRect.r1 && r <= selRect.r2 && c >= selRect.c1 && c <= selRect.c2;

  const colFullySelected = (c: number) =>
    !!selRect && rows.length > 0 && c >= selRect.c1 && c <= selRect.c2 && selRect.r1 <= 0 && selRect.r2 >= rows.length - 1;
  const rowFullySelected = (r: number) =>
    !!selRect && columns.length > 0 && r >= selRect.r1 && r <= selRect.r2 && selRect.c1 <= 0 && selRect.c2 >= columns.length - 1;

  function fmtOf(rowId: string, colId: string): CellFmt {
    return cellFmt[rowId]?.[colId] ?? {};
  }

  function selectedCoords(): { rowId: string; colId: string }[] {
    if (!selRect) return [];
    const out: { rowId: string; colId: string }[] = [];
    for (let r = selRect.r1; r <= selRect.r2; r++) {
      for (let c = selRect.c1; c <= selRect.c2; c++) {
        const row = rows[r];
        const col = columns[c];
        if (row && col) out.push({ rowId: row.id, colId: col.id });
      }
    }
    return out;
  }

  // Merge a mutation into every selected cell's format; prune empties.
  function updateSelectionFmt(mut: (f: CellFmt) => CellFmt) {
    const coords = selectedCoords();
    if (!coords.length) return;
    const next: CellFmtMap = {};
    for (const rId of Object.keys(cellFmt)) next[rId] = { ...cellFmt[rId] };
    for (const { rowId, colId } of coords) {
      const updated = mut({ ...(next[rowId]?.[colId] ?? {}) });
      if (!next[rowId]) next[rowId] = {};
      if (!updated || Object.keys(updated).length === 0) delete next[rowId][colId];
      else next[rowId][colId] = updated;
    }
    for (const rId of Object.keys(next)) {
      const inner = next[rId];
      if (!inner || Object.keys(inner).length === 0) delete next[rId];
    }
    updateFormat.mutate({ cellFmt: next });
  }

  function setSelBg(color: string | null) {
    updateSelectionFmt((f) => { if (color) f.bg = color; else delete f.bg; return f; });
  }
  function setSelColor(color: string | null) {
    updateSelectionFmt((f) => { if (color) f.color = color; else delete f.color; return f; });
  }
  function toggleBold() {
    const coords = selectedCoords();
    const all = coords.length > 0 && coords.every(({ rowId, colId }) => fmtOf(rowId, colId).bold);
    updateSelectionFmt((f) => { if (all) delete f.bold; else f.bold = true; return f; });
  }
  function toggleItalic() {
    const coords = selectedCoords();
    const all = coords.length > 0 && coords.every(({ rowId, colId }) => fmtOf(rowId, colId).italic);
    updateSelectionFmt((f) => { if (all) delete f.italic; else f.italic = true; return f; });
  }
  function setAlign(align: 'left' | 'center' | 'right') {
    const coords = selectedCoords();
    const all = coords.length > 0 && coords.every(({ rowId, colId }) => fmtOf(rowId, colId).align === align);
    updateSelectionFmt((f) => { if (all) delete f.align; else f.align = align; return f; });
  }
  function clearSelFmt() {
    updateSelectionFmt(() => ({}));
  }

  function clearSelection() {
    setSelAnchor(null);
    setSelFocus(null);
  }

  function cellMouseDown(r: number, c: number, e: React.MouseEvent) {
    const row = rows[r];
    const col = columns[c];
    if (editingCell && row && col && editingCell.rowId === row.id && editingCell.colId === col.id) return;
    e.preventDefault(); // don't start a native text selection
    if (e.shiftKey && selAnchor) {
      setSelFocus({ r, c });
    } else {
      setSelAnchor({ r, c });
      setSelFocus({ r, c });
    }
    setSelecting(true);
  }

  function cellMouseEnter(r: number, c: number) {
    if (selecting) setSelFocus({ r, c });
  }

  // Stage B — whole column / whole row selection
  function selectColumn(c: number, shift: boolean) {
    const last = Math.max(0, rows.length - 1);
    if (shift && selAnchor) {
      setSelAnchor({ r: 0, c: selAnchor.c });
      setSelFocus({ r: last, c });
    } else {
      setSelAnchor({ r: 0, c });
      setSelFocus({ r: last, c });
    }
  }
  function selectRow(r: number, shift: boolean) {
    const last = Math.max(0, columns.length - 1);
    if (shift && selAnchor) {
      setSelAnchor({ r: selAnchor.r, c: 0 });
      setSelFocus({ r, c: last });
    } else {
      setSelAnchor({ r, c: 0 });
      setSelFocus({ r, c: last });
    }
  }

  // Stage C — copy / paste
  function buildCopy(): Clip | null {
    if (!selRect) return null;
    const grid: ClipCell[][] = [];
    const tsvRows: string[] = [];
    for (let r = selRect.r1; r <= selRect.r2; r++) {
      const rowArr: ClipCell[] = [];
      const tsvCells: string[] = [];
      for (let c = selRect.c1; c <= selRect.c2; c++) {
        const row = rows[r];
        const col = columns[c];
        const value = row && col ? cells[row.id]?.[col.id] : undefined;
        const fmt = row && col ? { ...fmtOf(row.id, col.id) } : {};
        rowArr.push({ value: value ?? '', fmt });
        tsvCells.push(value == null ? '' : String(value));
      }
      grid.push(rowArr);
      tsvRows.push(tsvCells.join('\t'));
    }
    return { grid, tsv: tsvRows.join('\n') };
  }

  async function handleCopy() {
    const payload = buildCopy();
    if (!payload) return;
    clipRef.current = payload;
    try { await navigator.clipboard.writeText(payload.tsv); } catch { /* ignore */ }
  }

  function pasteGrid(grid: ClipCell[][]) {
    if (!selRect || grid.length === 0) return;
    const r0 = selRect.r1;
    const c0 = selRect.c1;
    const next: CellFmtMap = {};
    for (const rId of Object.keys(cellFmt)) next[rId] = { ...cellFmt[rId] };
    grid.forEach((rowArr, i) => {
      rowArr.forEach((cellData, j) => {
        const row = rows[r0 + i];
        const col = columns[c0 + j];
        if (!row || !col) return;
        upsertCell.mutate({ rowId: row.id, columnId: col.id, value: cellData.value });
        if (cellData.fmt && Object.keys(cellData.fmt).length > 0) {
          const bucket = next[row.id] ?? (next[row.id] = {});
          bucket[col.id] = { ...cellData.fmt };
        }
      });
    });
    updateFormat.mutate({ cellFmt: next });
    const rr = Math.min(r0 + grid.length - 1, rows.length - 1);
    const cc = Math.min(c0 + (grid[0]?.length ?? 1) - 1, columns.length - 1);
    setSelAnchor({ r: r0, c: c0 });
    setSelFocus({ r: rr, c: cc });
  }

  async function handlePaste() {
    if (!selRect) return;
    let grid: ClipCell[][] | null = null;
    try {
      const text = await navigator.clipboard.readText();
      if (clipRef.current && text === clipRef.current.tsv) grid = clipRef.current.grid;
      else if (text) grid = tsvToGrid(text);
    } catch {
      if (clipRef.current) grid = clipRef.current.grid;
    }
    if (grid) pasteGrid(grid);
  }

  // Column-level background (points 1–3)
  function setColBg(id: string, color: string | null) {
    const next = { ...colBg };
    if (color) next[id] = color; else delete next[id];
    updateFormat.mutate({ colBg: next });
  }
  function setRowBg(id: string, color: string | null) {
    const next = { ...rowBg };
    if (color) next[id] = color; else delete next[id];
    updateFormat.mutate({ rowBg: next });
  }

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

  // End a drag-select on mouse release anywhere.
  useEffect(() => {
    const up = () => setSelecting(false);
    window.addEventListener('mouseup', up);
    return () => window.removeEventListener('mouseup', up);
  }, []);

  // Keyboard: Enter/F2 edit, Escape clear, Cmd/Ctrl+B/I format, Cmd/Ctrl+C/V.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const tag = document.activeElement?.tagName;
      if (tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA') return;
      if (!selAnchor || !selFocus) return;
      const mod = e.metaKey || e.ctrlKey;
      if (e.key === 'Escape') {
        clearSelection();
      } else if (mod && (e.key === 'c' || e.key === 'C')) {
        handleCopy();
        e.preventDefault();
      } else if (mod && (e.key === 'v' || e.key === 'V')) {
        handlePaste();
        e.preventDefault();
      } else if (mod && (e.key === 'b' || e.key === 'B')) {
        toggleBold();
        e.preventDefault();
      } else if (mod && (e.key === 'i' || e.key === 'I')) {
        toggleItalic();
        e.preventDefault();
      } else if (e.key === 'Enter' || e.key === 'F2') {
        const row = rows[selFocus.r];
        const col = columns[selFocus.c];
        if (row && col) startEdit(row.id, col.id);
        e.preventDefault();
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  if (isLoading) {
    return <div className="flex items-center justify-center h-full text-slate-400">Loading…</div>;
  }

  // Format-toolbar state derived from the current selection
  const selCoords = selectedCoords();
  const focusFmt = selFocus ? fmtOf(rows[selFocus.r]?.id ?? '', columns[selFocus.c]?.id ?? '') : {};
  const allBold = selCoords.length > 0 && selCoords.every(({ rowId, colId }) => fmtOf(rowId, colId).bold);
  const allItalic = selCoords.length > 0 && selCoords.every(({ rowId, colId }) => fmtOf(rowId, colId).italic);
  const alignActive = (a: string) =>
    selCoords.length > 0 && selCoords.every(({ rowId, colId }) => fmtOf(rowId, colId).align === a);

  const fmtBtn = (active: boolean) =>
    `w-6 h-6 rounded text-xs font-semibold flex items-center justify-center ${
      active ? 'bg-indigo-100 text-indigo-700' : 'text-slate-600 hover:bg-slate-200'
    }`;

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

      {/* Format toolbar — shown while a range is selected */}
      {selRect && (
        <div className="flex items-center gap-2 px-4 py-1.5 border-b border-slate-200 bg-slate-50 text-xs select-none">
          <span className="text-slate-500">
            {selCoords.length} cell{selCoords.length > 1 ? 's' : ''}
          </span>
          <div className="w-px h-4 bg-slate-300" />

          <label className="flex items-center gap-1 cursor-pointer" title="Fill color">
            <span className="text-slate-500">Fill</span>
            <input
              type="color"
              value={focusFmt.bg ?? '#ffffff'}
              onChange={(e) => setSelBg(e.target.value)}
              className="w-5 h-5 cursor-pointer border-0 bg-transparent p-0"
            />
          </label>
          <button onClick={() => setSelBg(null)} className="text-slate-400 hover:text-slate-700" title="Clear fill">⊘</button>

          <div className="w-px h-4 bg-slate-300" />

          <label className="flex items-center gap-1 cursor-pointer" title="Text color">
            <span className="text-slate-500">A</span>
            <input
              type="color"
              value={focusFmt.color ?? '#1e293b'}
              onChange={(e) => setSelColor(e.target.value)}
              className="w-5 h-5 cursor-pointer border-0 bg-transparent p-0"
            />
          </label>
          <button onClick={() => setSelColor(null)} className="text-slate-400 hover:text-slate-700" title="Clear text color">⊘</button>

          <div className="w-px h-4 bg-slate-300" />

          <button onClick={toggleBold} className={fmtBtn(allBold)} title="Bold (Ctrl/Cmd+B)"><span className="font-bold">B</span></button>
          <button onClick={toggleItalic} className={fmtBtn(allItalic)} title="Italic (Ctrl/Cmd+I)"><span className="italic">I</span></button>

          <div className="w-px h-4 bg-slate-300" />

          <button onClick={() => setAlign('left')} className={fmtBtn(alignActive('left'))} title="Align left">⯇</button>
          <button onClick={() => setAlign('center')} className={fmtBtn(alignActive('center'))} title="Align center">≡</button>
          <button onClick={() => setAlign('right')} className={fmtBtn(alignActive('right'))} title="Align right">⯈</button>

          <div className="w-px h-4 bg-slate-300" />

          <button onClick={handleCopy} className="text-slate-600 hover:bg-slate-200 rounded px-1.5 py-0.5" title="Copy (Ctrl/Cmd+C)">Copy</button>
          <button onClick={handlePaste} className="text-slate-600 hover:bg-slate-200 rounded px-1.5 py-0.5" title="Paste (Ctrl/Cmd+V)">Paste</button>

          <div className="w-px h-4 bg-slate-300" />

          <button onClick={clearSelFmt} className="text-slate-500 hover:text-red-500" title="Clear formatting">Clear</button>
          <button onClick={clearSelection} className="ml-auto text-slate-400 hover:text-slate-700" title="Deselect">✕</button>
        </div>
      )}

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
                {columns.map((col, cIdx) => {
                  const own = isOwnCol(col.pageId);
                  const dragOver = overColId === col.id && dragColId && dragColId !== col.id;
                  const headerBg = dragOver ? '#eef2ff' : colBg[col.id] || (own ? '#fde68a' : undefined);
                  const headerSel = colFullySelected(cIdx);
                  return (
                    <th
                      key={col.id}
                      draggable
                      onClick={(e) => selectColumn(cIdx, e.shiftKey)}
                      onDragStart={() => setDragColId(col.id)}
                      onDragOver={(e) => { e.preventDefault(); setOverColId(col.id); }}
                      onDragLeave={() => setOverColId(null)}
                      onDrop={() => handleColDrop(col.id)}
                      onDragEnd={() => { setDragColId(null); setOverColId(null); }}
                      style={{
                        backgroundColor: headerBg,
                        boxShadow: headerSel ? 'inset 0 0 0 2px #6366f1' : undefined,
                      }}
                      className={`min-w-[140px] px-3 py-2 border-b border-r border-slate-200 text-left font-medium cursor-grab ${
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
                            className={`flex-1 text-sm cursor-pointer hover:text-indigo-600 ${own ? 'text-amber-900' : 'text-slate-700'}`}
                            onDoubleClick={(e) => { e.stopPropagation(); startColEdit(col.id, col.name); }}
                          >
                            {col.name}
                          </span>
                        )}
                        <input
                          type="color"
                          value={colBg[col.id] ?? '#ffffff'}
                          onChange={(e) => setColBg(col.id, e.target.value)}
                          onMouseDown={(e) => e.stopPropagation()}
                          onClick={(e) => e.stopPropagation()}
                          draggable={false}
                          title="Column background"
                          className="w-4 h-4 shrink-0 opacity-0 group-hover:opacity-100 cursor-pointer border-0 bg-transparent p-0"
                        />
                        {colBg[col.id] && (
                          <button
                            onClick={(e) => { e.stopPropagation(); setColBg(col.id, null); }}
                            className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-slate-700 text-[10px]"
                            title="Clear color"
                          >⊘</button>
                        )}
                        {own && (
                          <button
                            onClick={(e) => { e.stopPropagation(); deleteCol.mutate(col.id); }}
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
              {rows.map((row, rIdx) => {
                const ownRow = isOwnRow(row.pageId);
                const dragOverRow = overRowId === row.id && dragRowId && dragRowId !== row.id;
                const rowColor = rowBg[row.id] || (ownRow ? '#fde68a' : undefined);
                const rowSel = rowFullySelected(rIdx);
                return (
                  <tr
                    key={row.id}
                    onDragOver={(e) => { if (dragRowId) { e.preventDefault(); setOverRowId(row.id); } }}
                    onDrop={() => handleRowDrop(row.id)}
                    className={`group/row ${!ownRow ? 'hover:bg-slate-50' : ''} ${
                      dragOverRow ? 'bg-indigo-50' : ''
                    } ${dragRowId === row.id ? 'opacity-50' : ''}`}
                  >
                    <td
                      draggable
                      onClick={(e) => selectRow(rIdx, e.shiftKey)}
                      onDragStart={() => setDragRowId(row.id)}
                      onDragEnd={() => { setDragRowId(null); setOverRowId(null); }}
                      style={{
                        backgroundColor: rowColor,
                        boxShadow: rowSel ? 'inset 0 0 0 2px #6366f1' : undefined,
                      }}
                      className="px-2 py-1.5 border-b border-r border-slate-100 text-slate-400 text-xs text-center cursor-grab"
                      title="Click to select row · drag to reorder"
                    >
                      <div className="flex items-center justify-center gap-1 group/rn">
                        <span>{rIdx + 1}</span>
                        <input
                          type="color"
                          value={rowBg[row.id] ?? '#ffffff'}
                          onChange={(e) => setRowBg(row.id, e.target.value)}
                          onMouseDown={(e) => e.stopPropagation()}
                          onClick={(e) => e.stopPropagation()}
                          draggable={false}
                          title="Row background"
                          className="w-3 h-3 shrink-0 opacity-0 group-hover/rn:opacity-100 cursor-pointer border-0 bg-transparent p-0"
                        />
                        {rowBg[row.id] && (
                          <button
                            onClick={(e) => { e.stopPropagation(); setRowBg(row.id, null); }}
                            className="opacity-0 group-hover/rn:opacity-100 text-slate-400 hover:text-slate-700 text-[9px]"
                            title="Clear color"
                          >⊘</button>
                        )}
                      </div>
                    </td>
                    {columns.map((col, cIdx) => {
                      const isEditing = editingCell?.rowId === row.id && editingCell?.colId === col.id;
                      const val = cells[row.id]?.[col.id];
                      const f = fmtOf(row.id, col.id);
                      const selected = inSel(rIdx, cIdx);
                      const bg = f.bg || colBg[col.id] || rowBg[row.id] || (ownRow ? '#fde68a' : undefined);
                      return (
                        <td
                          key={col.id}
                          style={{
                            backgroundColor: bg,
                            color: f.color,
                            fontWeight: f.bold ? 600 : undefined,
                            fontStyle: f.italic ? 'italic' : undefined,
                            textAlign: f.align,
                            boxShadow: selected ? 'inset 0 0 0 2px #6366f1' : undefined,
                          }}
                          className="px-3 py-1.5 border-b border-r border-slate-100 cursor-cell select-none"
                          onMouseDown={(e) => cellMouseDown(rIdx, cIdx, e)}
                          onMouseEnter={() => cellMouseEnter(rIdx, cIdx)}
                          onDoubleClick={() => startEdit(row.id, col.id)}
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
                            <span className={val == null ? 'text-slate-300 text-xs italic' : ''}>
                              {val == null ? 'empty' : String(val)}
                            </span>
                          )}
                        </td>
                      );
                    })}
                    <td
                      style={rowColor ? { backgroundColor: rowColor } : undefined}
                      className="border-b border-slate-100 px-1 text-center"
                    >
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
