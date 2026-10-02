import { useEffect, useState } from 'react';
import { Navigate, useParams } from 'react-router-dom';
import { resolveReferenceUrl } from '@/services/entity-reference.service';

export function ReferenceRedirectPage() {
  const { urlKey = '' } = useParams();
  const [path, setPath] = useState<string | null>();
  useEffect(() => {
    let active = true;
    resolveReferenceUrl(urlKey)
      .then((item) => active && setPath(item?.path ?? null))
      .catch(() => active && setPath(null));
    return () => {
      active = false;
    };
  }, [urlKey]);
  if (path === undefined)
    return <main className="p-8 text-sm text-slate-500">Opening reference…</main>;
  if (path) return <Navigate to={path} replace />;
  return (
    <main className="mx-auto max-w-lg p-8">
      <h1 className="text-xl font-semibold">Reference unavailable</h1>
      <p className="mt-2 text-sm text-slate-600">
        This item was deleted, or you do not have permission to view it.
      </p>
    </main>
  );
}
