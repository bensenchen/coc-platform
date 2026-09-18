import { useState } from 'react';
import { useInterfaces, useUpdateInterface } from '@/hooks/useInterfaces';
import type { InterfaceRecord } from '@/services/interface.service';

const fields = [
  'displayId',
  'sys1',
  'sys2',
  'type',
  'description',
  'specification',
  'contextPageId',
] as const;
const labels: Record<(typeof fields)[number], string> = {
  displayId: 'ID',
  sys1: 'Sys1',
  sys2: 'Sys2',
  type: 'Type',
  description: 'Description',
  specification: 'Specification',
  contextPageId: 'Context',
};
const editable = new Set(['displayId', 'type', 'description', 'specification']);
export function InterfaceTable({
  projectId,
  onOpenIcd,
}: {
  projectId: string;
  onOpenIcd: (id: string) => void;
}) {
  const { data = [], isLoading } = useInterfaces(projectId);
  const update = useUpdateInterface(projectId);
  const [edit, setEdit] = useState<{
    id: string;
    field: 'displayId' | 'type' | 'description' | 'specification';
    value: string;
  } | null>(null);
  if (isLoading) return <div className="p-8 text-sm text-slate-400">Loading interfaces…</div>;
  const commit = (row: InterfaceRecord) => {
    if (edit && edit.value.trim())
      update.mutate({ record: row, patch: { [edit.field]: edit.value.trim() } });
    setEdit(null);
  };
  return (
    <div className="h-full overflow-auto p-5">
      <div className="mb-3">
        <h2 className="font-semibold text-slate-800">Interface List</h2>
        <p className="text-xs text-slate-500">
          Canonical view of connectors assigned as interfaces. System and context values are derived
          from the canvas.
        </p>
      </div>
      <table className="min-w-full border-collapse bg-white text-sm">
        <thead>
          <tr>
            {fields.map((f) => (
              <th key={f} className="border bg-slate-50 px-3 py-2 text-left text-xs text-slate-600">
                {labels[f]}
              </th>
            ))}
            <th className="border bg-slate-50 px-3 py-2" />
          </tr>
        </thead>
        <tbody>
          {data.map((row) => (
            <tr key={row.id}>
              {fields.map((field) => (
                <td
                  key={field}
                  className="border px-3 py-2 text-slate-700"
                  onDoubleClick={() =>
                    editable.has(field) &&
                    setEdit({ id: row.id, field: field as any, value: String(row[field]) })
                  }
                >
                  {edit?.id === row.id && edit.field === field ? (
                    <input
                      autoFocus
                      className="w-full border rounded px-1"
                      value={edit.value}
                      onChange={(e) => setEdit({ ...edit, value: e.target.value })}
                      onBlur={() => commit(row)}
                      onKeyDown={(e) => e.key === 'Enter' && commit(row)}
                    />
                  ) : field === 'contextPageId' ? (
                    row.contextPageId.slice(0, 8)
                  ) : (
                    String(row[field] || '—')
                  )}
                </td>
              ))}
              <td className="border px-3 py-2">
                {row.icdPageId && (
                  <button
                    className="text-xs font-medium text-indigo-600 hover:underline"
                    onClick={() => onOpenIcd(row.icdPageId!)}
                  >
                    Open ICD
                  </button>
                )}
              </td>
            </tr>
          ))}
          {!data.length && (
            <tr>
              <td colSpan={8} className="border px-4 py-12 text-center text-slate-400">
                Assign “Interface” to a connector on a Context Page to populate this list.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
