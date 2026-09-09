import { useQuery } from '@tanstack/react-query';
import { listObjects, listConnectorAnchors } from '@/services/canvas-object.service';
import { findPhysicalDataLink } from '@/services/physical-data-link.service';
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

export function usePhysicalDataLink(canvasObjectId: string | null) {
  return useQuery({
    queryKey: ['physical-data-link', canvasObjectId],
    enabled: !!canvasObjectId,
    queryFn: () => findPhysicalDataLink(canvasObjectId!),
  });
}
