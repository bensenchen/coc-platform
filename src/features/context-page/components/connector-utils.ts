import type { ConnectorKind } from '@/models/canvas-object.model';

export type LineStyle = 'solid' | 'dashed';
export type CapKind = 'none' | 'arrow';

export interface ConnStyle {
  pathKind: ConnectorKind;
  lineStyle: LineStyle;
  startCap: CapKind;
  endCap: CapKind;
}

// Older connectors stored a single preset in metadata.connectorKind —
// map it onto the new independent fields when the new ones are absent.
export function resolveConnStyle(md: Record<string, any> | null | undefined): ConnStyle {
  const m = md ?? {};
  const legacy = (m.connectorKind as string | undefined) ?? 'arrow';
  return {
    pathKind: (m.pathKind as ConnectorKind) ?? 'straight',
    lineStyle: (m.lineStyle as LineStyle) ?? (legacy.startsWith('dashed') ? 'dashed' : 'solid'),
    startCap: (m.startCap as CapKind) ?? (legacy === 'double-arrow' ? 'arrow' : 'none'),
    endCap: (m.endCap as CapKind) ?? (legacy === 'line' || legacy === 'dashed-line' ? 'none' : 'arrow'),
  };
}

export function pathPoints(
  kind: ConnectorKind,
  sx: number,
  sy: number,
  tx: number,
  ty: number,
  freehand?: number[],
): number[] {
  switch (kind) {
    case 'elbow': {
      const mx = (sx + tx) / 2;
      return [sx, sy, mx, sy, mx, ty, tx, ty];
    }
    case 'curved': {
      const dx = tx - sx;
      const dy = ty - sy;
      const len = Math.hypot(dx, dy) || 1;
      const off = Math.min(40, len * 0.2);
      return [sx, sy, (sx + tx) / 2 - (dy / len) * off, (sy + ty) / 2 + (dx / len) * off, tx, ty];
    }
    case 'freehand':
      return freehand && freehand.length >= 4 ? freehand : [sx, sy, tx, ty];
    default:
      return [sx, sy, tx, ty];
  }
}
