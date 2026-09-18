import { useCanvasObjects } from '@/hooks/useCanvasObjects';
import type { Page } from '@/models/page.model';
export function IcdCanvas({ page }: { page: Page }) {
  const contextId = String(page.metadata.contextPageId ?? '');
  const connectorId = String(page.metadata.connectorId ?? '');
  const { data, isLoading } = useCanvasObjects(contextId || null);
  if (isLoading) return <div className="p-8 text-slate-400">Loading ICD…</div>;
  const connector = data?.objects.find((o) => o.id === connectorId);
  const anchor = data?.anchors.find((a) => a.connectorId === connectorId);
  const left = data?.objects.find((o) => o.id === anchor?.sourceObjectId);
  const right = data?.objects.find((o) => o.id === anchor?.targetObjectId);
  return (
    <div className="h-full flex flex-col bg-slate-50">
      <div className="px-5 py-3 border-b bg-white">
        <span className="rounded bg-slate-100 px-2 py-1 text-[11px] font-medium text-slate-600">
          LOCKED DERIVED CANVAS
        </span>
        <p className="mt-2 text-xs text-slate-500">
          This Sys1–connector–Sys2 view follows its Context Page interface and cannot be edited
          here.
        </p>
      </div>
      <div className="flex-1 flex items-center justify-center p-10">
        <div className="flex w-full max-w-4xl items-center">
          <System name={left?.name ?? 'Unconnected'} />
          <div className="flex-1 flex items-center">
            <div className="h-px flex-1 bg-indigo-500" />
            <div className="mx-3 rounded-full border-2 border-indigo-500 bg-white px-4 py-2 text-sm font-medium text-indigo-700">
              {connector?.name || 'Interface'}
            </div>
            <div className="h-px flex-1 bg-indigo-500" />
          </div>
          <System name={right?.name ?? 'Unconnected'} />
        </div>
      </div>
    </div>
  );
}
function System({ name }: { name: string }) {
  return (
    <div className="flex h-36 w-52 items-center justify-center rounded-xl border-2 border-slate-500 bg-white p-4 text-center font-semibold text-slate-800 shadow-sm">
      {name}
    </div>
  );
}
