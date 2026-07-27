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

// Cubic bezier points for a curved connector whose ends leave/enter
// perpendicular to the shape edge (along the given outward normals).
// Render with <Arrow bezier points={...} />.
export function curvedPoints(
  sx: number, sy: number, snx: number, sny: number,
  tx: number, ty: number, tnx: number, tny: number,
): number[] {
  const len = Math.hypot(tx - sx, ty - sy);
  const d = Math.min(80, Math.max(24, len / 3));
  return [sx, sy, sx + snx * d, sy + sny * d, tx + tnx * d, ty + tny * d, tx, ty];
}

// Orthogonal elbow whose ends leave/enter along the edge normals.
// When one end leaves horizontally and the other vertically, a single
// 90° corner (an L) connects them cleanly. When both ends share an axis,
// a Z with a middle segment is needed instead.
export function elbowPoints(
  sx: number, sy: number, snx: number, sny: number,
  tx: number, ty: number, tnx: number, tny: number,
): number[] {
  const sHoriz = Math.abs(snx) >= Math.abs(sny); // source leaves horizontally?
  const tHoriz = Math.abs(tnx) >= Math.abs(tny); // target leaves horizontally?

  // Perpendicular axes → single 90° corner (L-shape)
  if (sHoriz && !tHoriz) {
    // leave S horizontally, corner at (tx, sy), enter T vertically
    return [sx, sy, tx, sy, tx, ty];
  }
  if (!sHoriz && tHoriz) {
    // leave S vertically, corner at (sx, ty), enter T horizontally
    return [sx, sy, sx, ty, tx, ty];
  }

  // Same axis → Z with a middle segment
  if (sHoriz && tHoriz) {
    const mx = (sx + tx) / 2;
    return [sx, sy, mx, sy, mx, ty, tx, ty];
  }
  const my = (sy + ty) / 2;
  return [sx, sy, sx, my, tx, my, tx, ty];
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
