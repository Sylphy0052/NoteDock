/**
 * VertexEditOverlay - 頂点編集モードのオーバーレイ
 */

import { useCallback, useRef, useState } from 'react';
import { Circle, Group, Line } from 'react-konva';
import type Konva from 'konva';
import { useDrawing } from './context/DrawingContext';
import type { Point, Shape, LineShape, PolygonShape, FreehandShape, ArrowShape } from './types';

interface VertexEditOverlayProps {
  shape: Shape;
  zoom: number;
}

/**
 * 図形から頂点リストを取得
 */
function getVertices(shape: Shape): Point[] {
  switch (shape.type) {
    case 'line':
    case 'arrow':
    case 'dimension': {
      const s = shape as LineShape | ArrowShape;
      return [
        { x: shape.x + s.points[0], y: shape.y + s.points[1] },
        { x: shape.x + s.points[2], y: shape.y + s.points[3] },
      ];
    }
    case 'polygon':
    case 'freehand': {
      const s = shape as PolygonShape | FreehandShape;
      const vertices: Point[] = [];
      for (let i = 0; i < s.points.length; i += 2) {
        vertices.push({
          x: shape.x + s.points[i],
          y: shape.y + s.points[i + 1],
        });
      }
      return vertices;
    }
    default:
      return [];
  }
}

/**
 * 2点間の中点を計算
 */
function getMidpoint(p1: Point, p2: Point): Point {
  return {
    x: (p1.x + p2.x) / 2,
    y: (p1.y + p2.y) / 2,
  };
}

export function VertexEditOverlay({ shape, zoom }: VertexEditOverlayProps) {
  const {
    state,
    updateVertex,
    addVertex,
    deleteVertex,
    selectVertex,
    saveHistory,
  } = useDrawing();

  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef<Point | null>(null);

  const vertices = getVertices(shape);
  const handleRadius = 6 / zoom;
  const midpointRadius = 4 / zoom;
  const strokeWidth = 1 / zoom;

  // 頂点をドラッグ開始
  const handleVertexDragStart = useCallback((index: number) => {
    setIsDragging(true);
    selectVertex(index);
    dragStartRef.current = vertices[index];
  }, [selectVertex, vertices]);

  // 頂点をドラッグ中
  const handleVertexDrag = useCallback((index: number, e: Konva.KonvaEventObject<DragEvent>) => {
    const node = e.target;
    const pos = { x: node.x(), y: node.y() };
    updateVertex(shape.id, index, pos);
  }, [shape.id, updateVertex]);

  // 頂点のドラッグ終了
  const handleVertexDragEnd = useCallback(() => {
    setIsDragging(false);
    dragStartRef.current = null;
    saveHistory();
  }, [saveHistory]);

  // 中点をクリック（新規頂点追加）
  const handleMidpointClick = useCallback((afterIndex: number, midpoint: Point) => {
    addVertex(shape.id, afterIndex, midpoint);
  }, [shape.id, addVertex]);

  // 頂点を右クリック（削除）
  const handleVertexContextMenu = useCallback((e: Konva.KonvaEventObject<PointerEvent>, index: number) => {
    e.evt.preventDefault();
    // polygon/freehandのみ削除可能（線は2頂点必要）、最低3頂点は維持
    if (['polygon', 'freehand'].includes(shape.type) && vertices.length > 3) {
      deleteVertex(shape.id, index);
    }
  }, [shape.id, shape.type, deleteVertex, vertices.length]);

  return (
    <Group>
      {/* 頂点間の線（編集中のハイライト） */}
      {vertices.length >= 2 && (
        <Line
          points={vertices.flatMap((v) => [v.x, v.y])}
          stroke="#4f46e5"
          strokeWidth={strokeWidth * 2}
          dash={[5 / zoom, 5 / zoom]}
          closed={shape.type === 'polygon'}
          listening={false}
        />
      )}

      {/* 中点（頂点追加用） - polygon/freehandのみ */}
      {['polygon', 'freehand'].includes(shape.type) && vertices.map((vertex, index) => {
        const nextIndex = (index + 1) % vertices.length;
        // freehandは閉じていないので最後の中点は不要
        if (shape.type === 'freehand' && index === vertices.length - 1) return null;
        // polygonでclosed=falseの場合も最後の中点は不要
        if (shape.type === 'polygon' && !(shape as PolygonShape).closed && index === vertices.length - 1) return null;

        const midpoint = getMidpoint(vertex, vertices[nextIndex]);
        return (
          <Circle
            key={`mid-${index}`}
            x={midpoint.x}
            y={midpoint.y}
            radius={midpointRadius}
            fill="#94a3b8"
            stroke="#64748b"
            strokeWidth={strokeWidth}
            onClick={() => handleMidpointClick(index, midpoint)}
            onTap={() => handleMidpointClick(index, midpoint)}
            hitStrokeWidth={midpointRadius * 2}
            style={{ cursor: 'crosshair' }}
          />
        );
      })}

      {/* 頂点ハンドル */}
      {vertices.map((vertex, index) => {
        const isSelected = state.editingVertexIndex === index;
        return (
          <Circle
            key={`vertex-${index}`}
            x={vertex.x}
            y={vertex.y}
            radius={handleRadius}
            fill={isSelected ? '#4f46e5' : '#ffffff'}
            stroke={isSelected ? '#312e81' : '#4f46e5'}
            strokeWidth={strokeWidth * 2}
            draggable
            onDragStart={() => handleVertexDragStart(index)}
            onDragMove={(e) => handleVertexDrag(index, e)}
            onDragEnd={handleVertexDragEnd}
            onContextMenu={(e) => handleVertexContextMenu(e, index)}
            onClick={() => selectVertex(index)}
            onTap={() => selectVertex(index)}
            hitStrokeWidth={handleRadius * 2}
            style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
          />
        );
      })}

      {/* 選択中の頂点情報表示 */}
      {state.editingVertexIndex !== null && vertices[state.editingVertexIndex] && (
        <Group>
          {/* 座標ラベル */}
          {/* （シンプルにするためコメントアウト - 必要に応じて追加） */}
        </Group>
      )}
    </Group>
  );
}
