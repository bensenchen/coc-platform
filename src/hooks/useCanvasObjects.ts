import { useQuery } from '@tanstack/react-query';
import { listObjects, listConnectorAnchors } from '@/services/canvas-object.service';
import type { CanvasObject, ConnectorAnchor } from '@/models/canvas-object.model';

export interface CanvasData {
  objects: CanvasObject[];
  anchors: ConnectorAnchor[];
}

export function useCanvasObjects(pageId: string | null) {
  return useQuery<CanvasData>({
    queryKey: ['canvas', pageId],
    enabled: !!pageId,
    queryFn: async () => {
      const [objects, anchors] = await Promise.all([
        listObjects(pageId!),
        listConnectorAnchors(pageId!),
      ]);
      return { objects, anchors };
    },
  });
}
