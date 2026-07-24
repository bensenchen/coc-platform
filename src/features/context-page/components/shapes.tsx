import { Group, Rect, Ellipse, Line, Text, Shape } from 'react-konva';
import type { ShapeKind } from '@/models/canvas-object.model';

const FILL = '#f8fafc';
const STROKE = '#64748b';
const STROKE_WIDTH = 1.5;
const SELECTED_STROKE = '#3b82f6';
const SELECTED_STROKE_WIDTH = 2;
const PHYSICAL_FILL = '#e2e8f0';
const LABEL_PADDING = 4;

interface ShapeProps {
  x: number;
  y: number;
  width: number;
  height: number;
  kind: ShapeKind;
  name: string | null;
  isPhysical: boolean;
  isSelected: boolean;
  draggable?: boolean;
  onDragEnd?: (x: number, y: number) => void;
  onClick?: (e?: any) => void;
  onMouseDown?: (e?: any) => void;
  fontSize?: number;
}

function shapeStroke(isSelected: boolean) {
  return isSelected ? SELECTED_STROKE : STROKE;
}
function shapeStrokeWidth(isSelected: boolean) {
  return isSelected ? SELECTED_STROKE_WIDTH : STROKE_WIDTH;
}
function shapeFill(isPhysical: boolean) {
  return isPhysical ? PHYSICAL_FILL : FILL;
}

function Label({ x, y, width, height, text, fontSize = 11 }: { x: number; y: number; width: number; height: number; text: string; fontSize?: number }) {
  return (
    <Text
      x={x + LABEL_PADDING}
      y={y + LABEL_PADDING}
      width={width - LABEL_PADDING * 2}
      height={height - LABEL_PADDING * 2}
      text={text}
      fontSize={fontSize}
      fontFamily="Inter, system-ui, sans-serif"
      fill="#1e293b"
      align="center"
      verticalAlign="middle"
      wrap="word"
      listening={false}
    />
  );
}

export function ShapeNode({
  x, y, width, height, kind, name, isPhysical, isSelected,
  draggable = true, onDragEnd, onClick, onMouseDown, fontSize = 11,
}: ShapeProps) {
  const fill = shapeFill(isPhysical);
  const stroke = shapeStroke(isSelected);
  const strokeWidth = shapeStrokeWidth(isSelected);

  const commonGroup = {
    x, y, draggable,
    onDragEnd: onDragEnd
      ? (e: any) => onDragEnd(e.target.x(), e.target.y())
      : undefined,
    onClick,
    onMouseDown,
  };

  switch (kind) {
    case 'rect':
      return (
        <Group {...commonGroup}>
          <Rect width={width} height={height} fill={fill} stroke={stroke} strokeWidth={strokeWidth} />
          {name && <Label x={0} y={0} width={width} height={height} text={name} fontSize={fontSize} />}
        </Group>
      );

    case 'process':
      return (
        <Group {...commonGroup}>
          <Rect width={width} height={height} fill={fill} stroke={stroke} strokeWidth={strokeWidth} cornerRadius={10} />
          {name && <Label x={0} y={0} width={width} height={height} text={name} fontSize={fontSize} />}
        </Group>
      );

    case 'ellipse':
      return (
        <Group {...commonGroup}>
          <Ellipse
            x={width / 2} y={height / 2}
            radiusX={width / 2} radiusY={height / 2}
            fill={fill} stroke={stroke} strokeWidth={strokeWidth}
          />
          {name && <Label x={0} y={0} width={width} height={height} text={name} fontSize={fontSize} />}
        </Group>
      );

    case 'diamond': {
      const pts = [width / 2, 0, width, height / 2, width / 2, height, 0, height / 2];
      return (
        <Group {...commonGroup}>
          <Line closed points={pts} fill={fill} stroke={stroke} strokeWidth={strokeWidth} />
          {name && <Label x={width * 0.2} y={height * 0.2} width={width * 0.6} height={height * 0.6} text={name} fontSize={fontSize} />}
        </Group>
      );
    }

    case 'triangle': {
      const pts = [width / 2, 0, width, height, 0, height];
      return (
        <Group {...commonGroup}>
          <Line closed points={pts} fill={fill} stroke={stroke} strokeWidth={strokeWidth} />
          {name && <Label x={width * 0.1} y={height * 0.4} width={width * 0.8} height={height * 0.4} text={name} fontSize={fontSize} />}
        </Group>
      );
    }

    case 'cylinder': {
      const ry = Math.min(height * 0.15, 16);
      const cxx = width / 2;
      const by = height - ry;
      return (
        <Group {...commonGroup}>
          <Shape
            fill={fill}
            stroke={stroke}
            strokeWidth={strokeWidth}
            sceneFunc={(ctx: any) => {
              // Body + front (visible) bottom arc as a single filled silhouette.
              // The back half of the bottom rim is intentionally omitted.
              ctx.fillStyle = fill;
              ctx.strokeStyle = stroke;
              ctx.lineWidth = strokeWidth;
              ctx.beginPath();
              ctx.moveTo(0, ry);
              ctx.lineTo(0, by);
              for (let i = 0; i <= 28; i++) {
                const a = Math.PI - Math.PI * (i / 28); // left → bottom → right
                ctx.lineTo(cxx + cxx * Math.cos(a), by + ry * Math.sin(a));
              }
              ctx.lineTo(width, ry);
              ctx.closePath();
              ctx.fill();
              // Stroke sides + front bottom arc only (skip the interior closing line)
              ctx.beginPath();
              ctx.moveTo(0, ry);
              ctx.lineTo(0, by);
              for (let i = 0; i <= 28; i++) {
                const a = Math.PI - Math.PI * (i / 28);
                ctx.lineTo(cxx + cxx * Math.cos(a), by + ry * Math.sin(a));
              }
              ctx.lineTo(width, ry);
              ctx.stroke();
              // Top rim ellipse (the visible cap)
              ctx.beginPath();
              for (let i = 0; i <= 48; i++) {
                const a = 2 * Math.PI * (i / 48);
                const px = cxx + cxx * Math.cos(a);
                const py = ry + ry * Math.sin(a);
                if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
              }
              ctx.closePath();
              ctx.fill();
              ctx.stroke();
            }}
          />
          {name && <Label x={0} y={ry} width={width} height={height - ry} text={name} fontSize={fontSize} />}
        </Group>
      );
    }

    default:
      return null;
  }
}
