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
// Each end gets a short straight stub in the normal direction so the
// connector meets the shape perpendicular to its edge, then the two
// stubs are joined with an axis-aligned Z.
export function elbowPoints(
  sx: number, sy: number, snx: number, sny: number,
  tx: number, ty: number, tnx: number, tny: number,
): number[] {
  const stub = 20;
  const spx = sx + snx * stub;
  const spy = sy + sny * stub;
  const tpx = tx + tnx * stub;
  const tpy = ty + tny * stub;
  const horiz = Math.abs(snx) >= Math.abs(sny); // source leaves horizontally?
  if (horiz) {
    const mx = (spx + tpx) / 2;
    return [sx, sy, spx, spy, mx, spy, mx, tpy, tpx, tpy, tx, ty];
  }
  const my = (spy + tpy) / 2;
  return [sx, sy, spx, spy, spx, my, tpx, my, tpx, tpy, tx, ty];
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
