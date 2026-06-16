import type { CanvasObject } from '@/models/canvas-object.model';

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
