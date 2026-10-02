import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  resolveReferenceUrl,
  searchProjectReferences,
  type ReferenceSearchResult,
} from '@/services/entity-reference.service';
import {
  isRichTextValue,
  type RichTextSegment,
  type RichTextValue,
} from '@/models/rich-text.model';
import { cn } from '@/lib/cn';

interface Props {
  value: unknown;
  projectId: string;
  onCommit: (value: RichTextValue) => void;
  onCancel?: () => void;
  autoFocus?: boolean;
  className?: string;
  readOnly?: boolean;
}

function initialSegments(value: unknown): RichTextSegment[] {
  return isRichTextValue(value)
    ? value.content
    : [{ type: 'text', text: value == null ? '' : String(value) }];
}

function segmentsFromDraft(draft: string, known: RichTextSegment[]): RichTextSegment[] {
  const references = known.filter((part) => part.type === 'reference');
  const content: RichTextSegment[] = [];
  const pattern = /@\[([^\]]+)\]/g;
  let offset = 0;
  for (const match of draft.matchAll(pattern)) {
    if (match.index > offset)
      content.push({ type: 'text', text: draft.slice(offset, match.index) });
    const reference = references.find(
      (part) => part.type === 'reference' && part.label === match[1],
    );
    content.push(reference ?? { type: 'text', text: match[0] });
    offset = match.index + match[0].length;
  }
  if (offset < draft.length) content.push({ type: 'text', text: draft.slice(offset) });
  return content;
}

/** Rich-text cell editor. Entity mentions retain IDs; labels are only a cached fallback. */
export function RichTextInput({
  value,
  projectId,
  onCommit,
  onCancel,
  autoFocus,
  className,
  readOnly,
}: Props) {
  const [segments, setSegments] = useState<RichTextSegment[]>(() => initialSegments(value));
  const [draft, setDraft] = useState(() =>
    initialSegments(value)
      .map((part) => (part.type === 'text' ? part.text : `@[${part.label}]`))
      .join(''),
  );
  const [results, setResults] = useState<ReferenceSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const slash = useMemo(() => draft.match(/(?:^|\s)\/([^\s/]*)$/), [draft]);
  const searchTerm = slash?.[1] ?? null;

  useEffect(() => {
    if (searchTerm === null || readOnly) {
      setResults([]);
      return;
    }
    let active = true;
    const timer = window.setTimeout(async () => {
      setLoading(true);
      try {
        const found = await searchProjectReferences(projectId, searchTerm);
        if (active) setResults(found);
      } finally {
        if (active) setLoading(false);
      }
    }, 150);
    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [projectId, readOnly, searchTerm]);

  function choose(result: ReferenceSearchResult) {
    const match = draft.match(/(?:^|\s)\/([^\s/]*)$/);
    const prefix = match
      ? draft.slice(0, match.index! + (match[0].startsWith(' ') ? 1 : 0))
      : draft;
    const ref: RichTextSegment = {
      type: 'reference',
      entityType: result.entityType,
      entityId: result.entityId,
      urlKey: result.urlKey,
      label: result.title,
    };
    setSegments([...segmentsFromDraft(prefix, segments), ref]);
    setDraft(`${prefix}@[${result.title}]`);
    setResults([]);
  }

  if (readOnly) return <RichText value={value} />;
  return (
    <div className="relative w-full" onClick={(event) => event.stopPropagation()}>
      <input
        autoFocus={autoFocus}
        value={draft}
        aria-label="Rich text"
        aria-autocomplete="list"
        onChange={(event) => {
          setDraft(event.target.value);
          setSegments((current) => segmentsFromDraft(event.target.value, current));
        }}
        onBlur={() => {
          if (!results.length) onCommit({ type: 'rich_text', version: 1, content: segments });
        }}
        onKeyDown={(event) => {
          if (event.key === 'Enter' && !results.length)
            onCommit({ type: 'rich_text', version: 1, content: segments });
          if (event.key === 'Escape') onCancel?.();
        }}
        className={cn(
          'w-full rounded border border-indigo-400 px-1 text-sm text-slate-900 outline-none',
          className,
        )}
      />
      {(slash || loading) && (
        <div
          role="listbox"
          className="absolute z-50 mt-1 max-h-56 w-80 overflow-auto rounded-md border border-slate-200 bg-white p-1 shadow-lg"
        >
          {loading && <p className="px-2 py-1 text-xs text-slate-500">Searching…</p>}
          {!loading && results.length === 0 && (
            <p className="px-2 py-1 text-xs text-slate-500">No pages or objects found</p>
          )}
          {results.map((result) => (
            <button
              type="button"
              role="option"
              key={`${result.entityType}:${result.entityId}`}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => choose(result)}
              className="block w-full rounded px-2 py-1.5 text-left hover:bg-indigo-50"
            >
              <span className="block truncate text-sm text-slate-800">{result.title}</span>
              <span className="block truncate text-[11px] text-slate-500">
                {result.entityType} · {result.context}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function RichText({ value }: { value: unknown }) {
  const content = initialSegments(value);
  return (
    <span>
      {content.map((part, index) =>
        part.type === 'text' ? (
          <span key={index}>{part.text}</span>
        ) : (
          <ResolvedReference
            key={`${part.entityType}:${part.entityId}:${index}`}
            reference={part}
          />
        ),
      )}
    </span>
  );
}

function ResolvedReference({
  reference,
}: {
  reference: Extract<RichTextSegment, { type: 'reference' }>;
}) {
  const [title, setTitle] = useState<string>();
  useEffect(() => {
    let active = true;
    resolveReferenceUrl(reference.urlKey)
      .then((item) => active && setTitle(item?.title ?? 'Unavailable reference'))
      .catch(() => active && setTitle('Unavailable reference'));
    return () => {
      active = false;
    };
  }, [reference.urlKey]);
  if (title === 'Unavailable reference') {
    return (
      <span className="text-slate-400 line-through" title="Deleted or inaccessible">
        {title}
      </span>
    );
  }
  return (
    <Link
      to={`/r/${reference.urlKey}`}
      onClick={(event) => event.stopPropagation()}
      className="font-medium text-indigo-600 underline decoration-indigo-300 hover:text-indigo-800"
    >
      {title ?? reference.label}
    </Link>
  );
}
