import type { CanvasObject, AnchorPosition } from '@/models/canvas-object.model';

const EDGE_ANCHORS: AnchorPosition[] = [
  'top', 'top_right', 'right', 'bottom_right', 'bottom', 'bottom_left', 'left', 'top_left',
];

export function anchorPoint(
  obj: Pick<CanvasObject, 'positionX' | 'positionY' | 'width' | 'height'>,
  anchor: string,
): [number, number] {
  const x = obj.positionX;
  const y = obj.positionY;
  const w = obj.width ?? 120;
  const h = obj.height ?? 60;
  switch (anchor) {
    case 'top':          return [x + w / 2, y];
    case 'right':        return [x + w, y + h / 2];
    case 'bottom':       return [x + w / 2, y + h];
    case 'left':         return [x, y + h / 2];
    case 'top_left':     return [x, y];
    case 'top_right':    return [x + w, y];
    case 'bottom_left':  return [x, y + h];
    case 'bottom_right': return [x + w, y + h];
    case 'center':
    default:             return [x + w / 2, y + h / 2];
  }
}

// Returns the point on obj's border in the direction of (toX, toY)
export function borderPoint(
  obj: Pick<CanvasObject, 'positionX' | 'positionY' | 'width' | 'height'>,
  toX: number,
  toY: number,
): [number, number] {
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

// The edge anchor of obj closest to point (px, py)
export function nearestAnchor(
  obj: Pick<CanvasObject, 'positionX' | 'positionY' | 'width' | 'height'>,
  px: number,
  py: number,
): AnchorPosition {
  let best: AnchorPosition = 'top';
  let bestDist = Infinity;
  for (const a of EDGE_ANCHORS) {
    const [ax, ay] = anchorPoint(obj, a);
    const d = (ax - px) ** 2 + (ay - py) ** 2;
    if (d < bestDist) {
      bestDist = d;
      best = a;
    }
  }
  return best;
}
