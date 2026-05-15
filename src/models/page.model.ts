export type PageKind = 'context' | 'data' | 'data_view' | 'interface_list' | 'icd' | 'sheet';

export interface Page<K extends PageKind = PageKind> {
  id: string;
  projectId: string;
  kind: K;
  title: string;
  position: number;
  metadata: Record<string, unknown>;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export type ContextPage = Page<'context'>;
export type DataPage = Page<'data'>;
export type DataViewPage = Page<'data_view'>;
export type IcdPage = Page<'icd'>;
export type SheetPage = Page<'sheet'>;
