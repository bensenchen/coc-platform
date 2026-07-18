import type { CanvasObject, AnchorPosition, ShapeKind } from '@/models/canvas-object.model';

type Box = Pick<CanvasObject, 'positionX' | 'positionY' | 'width' | 'height'>;

const DIAG = Math.SQRT1_2; // cos(45°)

// Which anchor positions each shape kind exposes
export function anchorsFor(kind: ShapeKind | undefined): AnchorPosition[] {
  switch (kind) {
    case 'ellipse':
      return ['top', 'top_right', 'right', 'bottom_right', 'bottom', 'bottom_left', 'left', 'top_left'];
    case 'diamond':
      return ['top', 'right', 'bottom', 'left'];
    case 'triangle':
      return ['top', 'bottom_right', 'bottom_left'];
    // rect, process, cylinder: middle of the four sides
    default:
      return ['top', 'right', 'bottom', 'left'];
  }
}

export function anchorPoint(obj: Box, anchor: string, kind?: ShapeKind): [number, number] {
  const x = obj.positionX;
  const y = obj.positionY;
  const w = obj.width ?? 120;
  const h = obj.height ?? 60;
  const cx = x + w / 2;
  const cy = y + h / 2;

  if (kind === 'ellipse') {
    const rx = w / 2;
    const ry = h / 2;
    switch (anchor) {
      case 'top':          return [cx, y];
      case 'bottom':       return [cx, y + h];
      case 'left':         return [x, cy];
      case 'right':        return [x + w, cy];
      case 'top_right':    return [cx + rx * DIAG, cy - ry * DIAG];
      case 'bottom_right': return [cx + rx * DIAG, cy + ry * DIAG];
      case 'bottom_left':  return [cx - rx * DIAG, cy + ry * DIAG];
      case 'top_left':     return [cx - rx * DIAG, cy - ry * DIAG];
    }
  }

  if (kind === 'triangle') {
    switch (anchor) {
      case 'top':          return [cx, y];
      case 'bottom_left':  return [x, y + h];
      case 'bottom_right': return [x + w, y + h];
    }
  }

  // Diamond vertices coincide with the bbox side midpoints, so the
  // default arm below covers rect/process/cylinder AND diamond.
  switch (anchor) {
    case 'top':          return [cx, y];
    case 'right':        return [x + w, cy];
    case 'bottom':       return [cx, y + h];
    case 'left':         return [x, cy];
    case 'top_left':     return [x, y];
    case 'top_right':    return [x + w, y];
    case 'bottom_left':  return [x, y + h];
    case 'bottom_right': return [x + w, y + h];
    case 'center':
    default:             return [cx, cy];
  }
}

// Returns the point on obj's border in the direction of (toX, toY)
export function borderPoint(obj: Box, toX: number, toY: number): [number, number] {
  const w = obj.width ?? 120;
  const h = obj.height ?? 60;
  const cx = obj.positionX + w / 2;
  const cy = obj.positionY + h / 2;
  const dx = toX - cx;
  const dy = toY - cy;
  if (dx === 0 && dy === 0) return [cx, cy];
  const t = Math.min((w / 2) / Math.abs(dx), (h / 2) / Math.abs(dy));
  return [cx + dx * t, cy + dy * t];
}

// The valid anchor of obj (given its shape kind) closest to point (px, py)
export function nearestAnchor(obj: Box, px: number, py: number, kind?: ShapeKind): AnchorPosition {
  const candidates = anchorsFor(kind);
  let best: AnchorPosition = candidates[0] ?? 'top';
  let bestDist = Infinity;
  for (const a of candidates) {
    const [ax, ay] = anchorPoint(obj, a, kind);
    const d = (ax - px) ** 2 + (ay - py) ** 2;
    if (d < bestDist) {
      bestDist = d;
      best = a;
    }
  }
  return best;
}

// Unit vector pointing outward from the shape at the given anchor —
// used to make curved connectors leave/enter perpendicular to the edge.
export function outwardNormal(obj: Box, anchor: string, kind?: ShapeKind): [number, number] {
  const [px, py] = anchorPoint(obj, anchor, kind);
  const cx = obj.positionX + (obj.width ?? 120) / 2;
  const cy = obj.positionY + (obj.height ?? 60) / 2;
  const dx = px - cx;
  const dy = py - cy;
  const len = Math.hypot(dx, dy) || 1;
  return [dx / len, dy / len];
}
