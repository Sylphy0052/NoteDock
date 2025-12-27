/**
 * Shape Renderer - 図形レンダリングコンポーネント
 */

import { Line, Circle, Rect, Text, Arrow, Group, Image } from 'react-konva';
import useImage from 'use-image';
import type {
  Shape,
  LineShape,
  CircleShape,
  ArcShape,
  RectShape,
  PolygonShape,
  TextShape,
  ArrowShape,
  FreehandShape,
  GroupShape,
  DimensionShape,
  ImageShape,
  GradientFill,
} from '../types';
import { LINE_DASH_PATTERNS } from '../types';
import { getArcPoints } from '../utils/geometry';

/**
 * グラデーション塗りをKonvaのプロパティに変換
 */
function getGradientProps(
  gradient: GradientFill | undefined,
  width: number,
  height: number
): Record<string, unknown> {
  if (!gradient) return {};

  // カラーストップを[offset, color, offset, color, ...]形式に変換
  const colorStops = gradient.colorStops.flatMap((stop) => [stop.offset, stop.color]);

  if (gradient.type === 'linear') {
    // 角度からstart/end座標を計算
    const angle = ((gradient.angle ?? 0) * Math.PI) / 180;
    const centerX = width / 2;
    const centerY = height / 2;
    const length = Math.max(width, height);

    return {
      fillLinearGradientStartPoint: {
        x: centerX - Math.cos(angle) * length / 2,
        y: centerY - Math.sin(angle) * length / 2,
      },
      fillLinearGradientEndPoint: {
        x: centerX + Math.cos(angle) * length / 2,
        y: centerY + Math.sin(angle) * length / 2,
      },
      fillLinearGradientColorStops: colorStops,
    };
  } else {
    // ラジアルグラデーション
    const cx = (gradient.centerX ?? 0.5) * width;
    const cy = (gradient.centerY ?? 0.5) * height;
    const radius = (gradient.radius ?? 0.8) * Math.max(width, height);

    return {
      fillRadialGradientStartPoint: { x: cx, y: cy },
      fillRadialGradientEndPoint: { x: cx, y: cy },
      fillRadialGradientStartRadius: 0,
      fillRadialGradientEndRadius: radius,
      fillRadialGradientColorStops: colorStops,
    };
  }
}

interface ShapeRendererProps {
  shape: Shape;
  isSelected?: boolean;
  isDraggable?: boolean;
  onSelect?: (id: string) => void;
  onDragEnd?: (id: string, x: number, y: number) => void;
  onDragMove?: (id: string, x: number, y: number) => void;
  onDoubleClick?: (id: string) => void;
}

/**
 * 線のレンダリング
 */
function LineRenderer({
  shape,
  isSelected,
  isDraggable = true,
  onSelect,
  onDragEnd,
  onDragMove,
}: ShapeRendererProps & { shape: LineShape }) {
  const dashPattern = LINE_DASH_PATTERNS[shape.lineStyle] || [];
  return (
    <Line
      id={shape.id}
      x={shape.x}
      y={shape.y}
      points={shape.points}
      stroke={shape.stroke}
      strokeWidth={shape.strokeWidth}
      dash={dashPattern.length > 0 ? dashPattern : undefined}
      opacity={shape.opacity}
      rotation={shape.rotation}
      draggable={isDraggable && !shape.locked}
      visible={shape.visible}
      onClick={() => onSelect?.(shape.id)}
      onTap={() => onSelect?.(shape.id)}
      onDragMove={(e) => {
        onDragMove?.(shape.id, e.target.x(), e.target.y());
      }}
      onDragEnd={(e) => {
        onDragEnd?.(shape.id, e.target.x(), e.target.y());
      }}
      hitStrokeWidth={Math.max(10, shape.strokeWidth)}
      shadowColor={isSelected ? '#4f46e5' : undefined}
      shadowBlur={isSelected ? 4 : 0}
      shadowEnabled={isSelected}
    />
  );
}

/**
 * 円のレンダリング
 */
function CircleRenderer({
  shape,
  isSelected,
  isDraggable = true,
  onSelect,
  onDragEnd,
  onDragMove,
}: ShapeRendererProps & { shape: CircleShape }) {
  const dashPattern = LINE_DASH_PATTERNS[shape.lineStyle] || [];
  const gradientProps = shape.gradientFill
    ? getGradientProps(shape.gradientFill, shape.radius * 2, shape.radius * 2)
    : {};

  return (
    <Circle
      id={shape.id}
      x={shape.x}
      y={shape.y}
      radius={shape.radius}
      stroke={shape.stroke}
      strokeWidth={shape.strokeWidth}
      dash={dashPattern.length > 0 ? dashPattern : undefined}
      fill={shape.gradientFill ? undefined : shape.fill}
      {...gradientProps}
      opacity={shape.opacity}
      rotation={shape.rotation}
      draggable={isDraggable && !shape.locked}
      visible={shape.visible}
      onClick={() => onSelect?.(shape.id)}
      onTap={() => onSelect?.(shape.id)}
      onDragMove={(e) => {
        onDragMove?.(shape.id, e.target.x(), e.target.y());
      }}
      onDragEnd={(e) => {
        onDragEnd?.(shape.id, e.target.x(), e.target.y());
      }}
      shadowColor={isSelected ? '#4f46e5' : undefined}
      shadowBlur={isSelected ? 4 : 0}
      shadowEnabled={isSelected}
    />
  );
}

/**
 * 円弧のレンダリング（弧のみ、半径線なし）
 */
function ArcRenderer({
  shape,
  isSelected,
  isDraggable = true,
  onSelect,
  onDragEnd,
  onDragMove,
}: ShapeRendererProps & { shape: ArcShape }) {
  // 弧上のポイントを計算（相対座標で計算）
  const arcPoints = getArcPoints(0, 0, shape.radius, shape.startAngle, shape.endAngle);
  const dashPattern = LINE_DASH_PATTERNS[shape.lineStyle] || [];

  return (
    <Line
      id={shape.id}
      x={shape.x}
      y={shape.y}
      points={arcPoints}
      stroke={shape.stroke}
      strokeWidth={shape.strokeWidth}
      dash={dashPattern.length > 0 ? dashPattern : undefined}
      opacity={shape.opacity}
      rotation={shape.rotation}
      draggable={isDraggable && !shape.locked}
      visible={shape.visible}
      onClick={() => onSelect?.(shape.id)}
      onTap={() => onSelect?.(shape.id)}
      onDragMove={(e) => {
        onDragMove?.(shape.id, e.target.x(), e.target.y());
      }}
      onDragEnd={(e) => {
        onDragEnd?.(shape.id, e.target.x(), e.target.y());
      }}
      hitStrokeWidth={Math.max(10, shape.strokeWidth)}
      shadowColor={isSelected ? '#4f46e5' : undefined}
      shadowBlur={isSelected ? 4 : 0}
      shadowEnabled={isSelected}
    />
  );
}

/**
 * 矩形のレンダリング
 */
function RectRenderer({
  shape,
  isSelected,
  isDraggable = true,
  onSelect,
  onDragEnd,
  onDragMove,
}: ShapeRendererProps & { shape: RectShape }) {
  const dashPattern = LINE_DASH_PATTERNS[shape.lineStyle] || [];
  const gradientProps = shape.gradientFill
    ? getGradientProps(shape.gradientFill, shape.width, shape.height)
    : {};

  return (
    <Rect
      id={shape.id}
      x={shape.x}
      y={shape.y}
      width={shape.width}
      height={shape.height}
      stroke={shape.stroke}
      strokeWidth={shape.strokeWidth}
      dash={dashPattern.length > 0 ? dashPattern : undefined}
      fill={shape.gradientFill ? undefined : shape.fill}
      {...gradientProps}
      cornerRadius={shape.cornerRadius}
      opacity={shape.opacity}
      rotation={shape.rotation}
      draggable={isDraggable && !shape.locked}
      visible={shape.visible}
      onClick={() => onSelect?.(shape.id)}
      onTap={() => onSelect?.(shape.id)}
      onDragMove={(e) => {
        onDragMove?.(shape.id, e.target.x(), e.target.y());
      }}
      onDragEnd={(e) => {
        onDragEnd?.(shape.id, e.target.x(), e.target.y());
      }}
      shadowColor={isSelected ? '#4f46e5' : undefined}
      shadowBlur={isSelected ? 4 : 0}
      shadowEnabled={isSelected}
    />
  );
}

/**
 * 多角形のレンダリング
 */
function PolygonRenderer({
  shape,
  isSelected,
  isDraggable = true,
  onSelect,
  onDragEnd,
  onDragMove,
}: ShapeRendererProps & { shape: PolygonShape }) {
  const dashPattern = LINE_DASH_PATTERNS[shape.lineStyle] || [];

  // ポリゴンのバウンディングボックスを計算
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  for (let i = 0; i < shape.points.length; i += 2) {
    minX = Math.min(minX, shape.points[i]);
    maxX = Math.max(maxX, shape.points[i]);
    minY = Math.min(minY, shape.points[i + 1]);
    maxY = Math.max(maxY, shape.points[i + 1]);
  }
  const polygonWidth = maxX - minX;
  const polygonHeight = maxY - minY;

  const gradientProps = shape.gradientFill
    ? getGradientProps(shape.gradientFill, polygonWidth, polygonHeight)
    : {};

  return (
    <Line
      id={shape.id}
      x={shape.x}
      y={shape.y}
      points={shape.points}
      stroke={shape.stroke}
      strokeWidth={shape.strokeWidth}
      dash={dashPattern.length > 0 ? dashPattern : undefined}
      fill={shape.gradientFill ? undefined : shape.fill}
      {...gradientProps}
      closed={shape.closed}
      opacity={shape.opacity}
      rotation={shape.rotation}
      draggable={isDraggable && !shape.locked}
      visible={shape.visible}
      onClick={() => onSelect?.(shape.id)}
      onTap={() => onSelect?.(shape.id)}
      onDragMove={(e) => {
        onDragMove?.(shape.id, e.target.x(), e.target.y());
      }}
      onDragEnd={(e) => {
        onDragEnd?.(shape.id, e.target.x(), e.target.y());
      }}
      hitStrokeWidth={Math.max(10, shape.strokeWidth)}
      shadowColor={isSelected ? '#4f46e5' : undefined}
      shadowBlur={isSelected ? 4 : 0}
      shadowEnabled={isSelected}
    />
  );
}

/**
 * テキストのレンダリング
 */
function TextRenderer({
  shape,
  isSelected,
  isDraggable = true,
  onSelect,
  onDragEnd,
  onDragMove,
  onDoubleClick,
}: ShapeRendererProps & { shape: TextShape }) {
  return (
    <Text
      id={shape.id}
      x={shape.x}
      y={shape.y}
      text={shape.text}
      fontSize={shape.fontSize}
      fontFamily={shape.fontFamily}
      fontStyle={`${shape.fontWeight === 'bold' ? 'bold ' : ''}${shape.fontStyle === 'italic' ? 'italic' : ''}`}
      align={shape.textAlign}
      fill={shape.stroke}
      opacity={shape.opacity}
      rotation={shape.rotation}
      draggable={isDraggable && !shape.locked}
      visible={shape.visible}
      onClick={() => onSelect?.(shape.id)}
      onTap={() => onSelect?.(shape.id)}
      onDblClick={() => onDoubleClick?.(shape.id)}
      onDblTap={() => onDoubleClick?.(shape.id)}
      onDragMove={(e) => {
        onDragMove?.(shape.id, e.target.x(), e.target.y());
      }}
      onDragEnd={(e) => {
        onDragEnd?.(shape.id, e.target.x(), e.target.y());
      }}
      shadowColor={isSelected ? '#4f46e5' : undefined}
      shadowBlur={isSelected ? 4 : 0}
      shadowEnabled={isSelected}
    />
  );
}

/**
 * 矢印のレンダリング
 */
function ArrowRenderer({
  shape,
  isSelected,
  isDraggable = true,
  onSelect,
  onDragEnd,
  onDragMove,
}: ShapeRendererProps & { shape: ArrowShape }) {
  const [x1, y1, x2, y2] = shape.points;
  const dashPattern = LINE_DASH_PATTERNS[shape.lineStyle] || [];

  return (
    <Arrow
      id={shape.id}
      x={shape.x}
      y={shape.y}
      points={[x1, y1, x2, y2]}
      stroke={shape.stroke}
      strokeWidth={shape.strokeWidth}
      dash={dashPattern.length > 0 ? dashPattern : undefined}
      fill={shape.stroke}
      pointerLength={10}
      pointerWidth={10}
      pointerAtBeginning={shape.arrowStart !== 'none'}
      pointerAtEnding={shape.arrowEnd !== 'none'}
      opacity={shape.opacity}
      rotation={shape.rotation}
      draggable={isDraggable && !shape.locked}
      visible={shape.visible}
      onClick={() => onSelect?.(shape.id)}
      onTap={() => onSelect?.(shape.id)}
      onDragMove={(e) => {
        onDragMove?.(shape.id, e.target.x(), e.target.y());
      }}
      onDragEnd={(e) => {
        onDragEnd?.(shape.id, e.target.x(), e.target.y());
      }}
      hitStrokeWidth={Math.max(10, shape.strokeWidth)}
      shadowColor={isSelected ? '#4f46e5' : undefined}
      shadowBlur={isSelected ? 4 : 0}
      shadowEnabled={isSelected}
    />
  );
}

/**
 * フリーハンドのレンダリング
 */
function FreehandRenderer({
  shape,
  isSelected,
  isDraggable = true,
  onSelect,
  onDragEnd,
  onDragMove,
}: ShapeRendererProps & { shape: FreehandShape }) {
  const dashPattern = LINE_DASH_PATTERNS[shape.lineStyle] || [];
  return (
    <Line
      id={shape.id}
      x={shape.x}
      y={shape.y}
      points={shape.points}
      stroke={shape.stroke}
      strokeWidth={shape.strokeWidth}
      dash={dashPattern.length > 0 ? dashPattern : undefined}
      tension={0.5}
      lineCap="round"
      lineJoin="round"
      opacity={shape.opacity}
      rotation={shape.rotation}
      draggable={isDraggable && !shape.locked}
      visible={shape.visible}
      onClick={() => onSelect?.(shape.id)}
      onTap={() => onSelect?.(shape.id)}
      onDragMove={(e) => {
        onDragMove?.(shape.id, e.target.x(), e.target.y());
      }}
      onDragEnd={(e) => {
        onDragEnd?.(shape.id, e.target.x(), e.target.y());
      }}
      hitStrokeWidth={Math.max(10, shape.strokeWidth)}
      shadowColor={isSelected ? '#4f46e5' : undefined}
      shadowBlur={isSelected ? 4 : 0}
      shadowEnabled={isSelected}
    />
  );
}

/**
 * グループのレンダリング
 */
function GroupRenderer({
  shape,
  isSelected,
  isDraggable = true,
  onSelect,
  onDragEnd,
  onDragMove,
}: ShapeRendererProps & { shape: GroupShape }) {
  return (
    <Group
      id={shape.id}
      x={shape.x}
      y={shape.y}
      rotation={shape.rotation}
      opacity={shape.opacity}
      draggable={isDraggable && !shape.locked}
      visible={shape.visible}
      onClick={() => onSelect?.(shape.id)}
      onTap={() => onSelect?.(shape.id)}
      onDragMove={(e) => {
        onDragMove?.(shape.id, e.target.x(), e.target.y());
      }}
      onDragEnd={(e) => {
        onDragEnd?.(shape.id, e.target.x(), e.target.y());
      }}
    >
      {/* 子図形をレンダリング */}
      {shape.children.map((child) => (
        <ShapeRenderer
          key={child.id}
          shape={child}
          isSelected={false}
          // グループ内の子図形は直接選択・ドラッグ不可
        />
      ))}
      {/* 選択時のハイライト枠 */}
      {isSelected && (
        <Rect
          x={0}
          y={0}
          width={shape.width}
          height={shape.height}
          stroke="#4f46e5"
          strokeWidth={1}
          dash={[5, 5]}
          fill="transparent"
          listening={false}
        />
      )}
    </Group>
  );
}

/**
 * 寸法線のレンダリング
 */
function DimensionRenderer({
  shape,
  isSelected,
  isDraggable = true,
  onSelect,
  onDragEnd,
  onDragMove,
}: ShapeRendererProps & { shape: DimensionShape }) {
  const [x1, y1, x2, y2] = shape.points;
  const dashPattern = LINE_DASH_PATTERNS[shape.lineStyle] || [];

  // 寸法線の計算
  const dx = x2 - x1;
  const dy = y2 - y1;
  const length = Math.sqrt(dx * dx + dy * dy);
  const angle = Math.atan2(dy, dx);

  // 単位変換係数（1px = 約0.264mm at 96dpi）
  const unitMultiplier = shape.unit === 'mm' ? 0.264 : shape.unit === 'cm' ? 0.0264 : 1;
  const displayValue = shape.text ?? `${(length * unitMultiplier).toFixed(1)}${shape.unit}`;

  // 寸法線のオフセット方向（垂直方向）
  const perpX = -Math.sin(angle) * shape.offset;
  const perpY = Math.cos(angle) * shape.offset;

  // 寸法線の端点
  const dimX1 = x1 + perpX;
  const dimY1 = y1 + perpY;
  const dimX2 = x2 + perpX;
  const dimY2 = y2 + perpY;

  // テキストの位置（寸法線の中央）
  const textX = (dimX1 + dimX2) / 2;
  const textY = (dimY1 + dimY2) / 2;
  const textRotation = (angle * 180) / Math.PI;

  return (
    <Group
      id={shape.id}
      x={shape.x}
      y={shape.y}
      rotation={shape.rotation}
      opacity={shape.opacity}
      draggable={isDraggable && !shape.locked}
      visible={shape.visible}
      onClick={() => onSelect?.(shape.id)}
      onTap={() => onSelect?.(shape.id)}
      onDragMove={(e) => {
        onDragMove?.(shape.id, e.target.x(), e.target.y());
      }}
      onDragEnd={(e) => {
        onDragEnd?.(shape.id, e.target.x(), e.target.y());
      }}
    >
      {/* 延長線（オプション） */}
      {shape.showExtensionLines && (
        <>
          <Line
            points={[x1, y1, dimX1, dimY1]}
            stroke={shape.stroke}
            strokeWidth={1}
            dash={[2, 2]}
          />
          <Line
            points={[x2, y2, dimX2, dimY2]}
            stroke={shape.stroke}
            strokeWidth={1}
            dash={[2, 2]}
          />
        </>
      )}

      {/* 寸法線 */}
      <Line
        points={[dimX1, dimY1, dimX2, dimY2]}
        stroke={shape.stroke}
        strokeWidth={shape.strokeWidth}
        dash={dashPattern.length > 0 ? dashPattern : undefined}
      />

      {/* 端点マーカー */}
      <Line
        points={[dimX1 - 3, dimY1 - 5, dimX1, dimY1, dimX1 - 3, dimY1 + 5]}
        stroke={shape.stroke}
        strokeWidth={shape.strokeWidth}
        rotation={textRotation}
        offsetX={dimX1}
        offsetY={dimY1}
        x={dimX1}
        y={dimY1}
      />
      <Line
        points={[dimX2 + 3, dimY2 - 5, dimX2, dimY2, dimX2 + 3, dimY2 + 5]}
        stroke={shape.stroke}
        strokeWidth={shape.strokeWidth}
        rotation={textRotation}
        offsetX={dimX2}
        offsetY={dimY2}
        x={dimX2}
        y={dimY2}
      />

      {/* 寸法テキスト */}
      <Text
        x={textX}
        y={textY - 8}
        text={displayValue}
        fontSize={12}
        fontFamily="sans-serif"
        fill={shape.stroke}
        rotation={textRotation > 90 || textRotation < -90 ? textRotation + 180 : textRotation}
        offsetX={displayValue.length * 3}
        align="center"
      />

      {/* 選択ハイライト */}
      {isSelected && (
        <Line
          points={[dimX1, dimY1, dimX2, dimY2]}
          stroke="#4f46e5"
          strokeWidth={shape.strokeWidth + 2}
          dash={[5, 5]}
          listening={false}
        />
      )}
    </Group>
  );
}

/**
 * 画像のレンダリング
 */
function ImageRenderer({
  shape,
  isSelected,
  isDraggable = true,
  onSelect,
  onDragEnd,
  onDragMove,
}: ShapeRendererProps & { shape: ImageShape }) {
  const [image] = useImage(shape.src);

  return (
    <Group
      id={shape.id}
      x={shape.x}
      y={shape.y}
      rotation={shape.rotation}
      opacity={shape.opacity}
      draggable={isDraggable && !shape.locked}
      visible={shape.visible}
      onClick={() => onSelect?.(shape.id)}
      onTap={() => onSelect?.(shape.id)}
      onDragMove={(e) => {
        onDragMove?.(shape.id, e.target.x(), e.target.y());
      }}
      onDragEnd={(e) => {
        onDragEnd?.(shape.id, e.target.x(), e.target.y());
      }}
    >
      <Image
        image={image}
        width={shape.width}
        height={shape.height}
      />
      {/* 選択ハイライト */}
      {isSelected && (
        <Rect
          x={0}
          y={0}
          width={shape.width}
          height={shape.height}
          stroke="#4f46e5"
          strokeWidth={2}
          dash={[5, 5]}
          fill="transparent"
          listening={false}
        />
      )}
    </Group>
  );
}

/**
 * 図形タイプに応じたレンダラーを選択
 */
export function ShapeRenderer(props: ShapeRendererProps) {
  const { shape } = props;

  switch (shape.type) {
    case 'line':
      return <LineRenderer {...props} shape={shape} />;
    case 'circle':
      return <CircleRenderer {...props} shape={shape} />;
    case 'arc':
      return <ArcRenderer {...props} shape={shape} />;
    case 'rect':
      return <RectRenderer {...props} shape={shape} />;
    case 'polygon':
      return <PolygonRenderer {...props} shape={shape} />;
    case 'text':
      return <TextRenderer {...props} shape={shape} />;
    case 'arrow':
      return <ArrowRenderer {...props} shape={shape} />;
    case 'freehand':
      return <FreehandRenderer {...props} shape={shape} />;
    case 'group':
      return <GroupRenderer {...props} shape={shape} />;
    case 'dimension':
      return <DimensionRenderer {...props} shape={shape} />;
    case 'image':
      return <ImageRenderer {...props} shape={shape} />;
    default:
      return null;
  }
}
