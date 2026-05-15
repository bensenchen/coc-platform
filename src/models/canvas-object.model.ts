export type CanvasObjectType = 'shape' | 'connector' | 'post_it' | 'mini_sheet' | 'attachment' | 'picture';
export type AnchorPosition = 'top' | 'right' | 'bottom' | 'left' | 'top_left' | 'top_right' | 'bottom_left' | 'bottom_right' | 'center';
export type ShapeKind = 'rect' | 'diamond' | 'ellipse' | 'triangle' | 'process' | 'cylinder';
export type ConnectorKind = 'straight' | 'elbow' | 'curved';

export interface CanvasObject {
  id: string;
  pageId: string;
  type: CanvasObjectType;
  name: string | null;
  positionX: number;
  positionY: number;
  width: number | null;
  height: number | null;
  rotation: number;
  zIndex: number;
  isPhysical: boolean;
  metadata: Record<string, unknown>;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export interface ConnectorAnchor {
  connectorId: string;
  sourceObjectId: string | null;
  sourceAnchor: AnchorPosition | null;
  targetObjectId: string | null;
  targetAnchor: AnchorPosition | null;
}
