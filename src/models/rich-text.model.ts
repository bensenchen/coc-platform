export type EntityReference = {
  type: 'reference';
  entityType: 'page' | 'object';
  entityId: string;
  urlKey: string;
  label: string;
};

export type RichTextSegment = { type: 'text'; text: string } | EntityReference;

export type RichTextValue = { type: 'rich_text'; version: 1; content: RichTextSegment[] };

export function isRichTextValue(value: unknown): value is RichTextValue {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Partial<RichTextValue>;
  return (
    candidate.type === 'rich_text' && candidate.version === 1 && Array.isArray(candidate.content)
  );
}

export function richTextPlainText(value: unknown): string {
  if (!isRichTextValue(value)) return value == null ? '' : String(value);
  return value.content.map((part) => (part.type === 'text' ? part.text : part.label)).join('');
}
