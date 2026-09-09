/** Central query-key factory. Realtime and mutations must use these keys. */
export const queryKeys = {
  projects: (workspaceId: string) => ['projects', workspaceId] as const,
  pages: (projectId: string) => ['pages', projectId] as const,
  canvas: (pageId: string) => ['canvas', pageId] as const,
  sheet: (pageId: string) => ['sheet', pageId] as const,
  sheetViews: () => ['sheet-view'] as const,
  interfaces: (projectId: string) => ['interfaces', projectId] as const,
  revisions: (pageId: string) => ['revisions', pageId] as const,
};
