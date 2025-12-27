/**
 * SmartGuides - スマートガイド（自動整列補助線）
 * 図形のドラッグ時に他の図形との整列を視覚的に表示
 */

import { useMemo } from 'react';
import { Group, Line } from 'react-konva';
import type { Shape, Point } from './types';

// スナップの閾値（ピクセル）
const SNAP_THRESHOLD = 5;

// ガイドラインの色
const GUIDE_COLOR = '#FF6B6B';
const GUIDE_DASH = [4, 4];

/**
 * 図形のバウンディングボックスを取得
 */
function getShapeBounds(shape: Shape): {
  left: number;
  right: number;
  top: number;
  bottom: number;
  centerX: number;
  centerY: number;
} {
  let left: number, right: number, top: number, bottom: number;

  switch (shape.type) {
    case 'line':
    case 'arrow':
    case 'dimension': {
      const [x1, y1, x2, y2] = shape.points;
      left = shape.x + Math.min(x1, x2);
      right = shape.x + Math.max(x1, x2);
      top = shape.y + Math.min(y1, y2);
      bottom = shape.y + Math.max(y1, y2);
      break;
    }
    case 'circle':
      left = shape.x - shape.radius;
      right = shape.x + shape.radius;
      top = shape.y - shape.radius;
      bottom = shape.y + shape.radius;
      break;
    case 'arc':
      left = shape.x - shape.radius;
      right = shape.x + shape.radius;
      top = shape.y - shape.radius;
      bottom = shape.y + shape.radius;
      break;
    case 'rect':
    case 'image':
      left = shape.x;
      right = shape.x + shape.width;
      top = shape.y;
      bottom = shape.y + shape.height;
      break;
    case 'polygon':
    case 'freehand': {
      if (shape.points.length < 2) {
        left = right = shape.x;
        top = bottom = shape.y;
      } else {
        let minX = Infinity, maxX = -Infinity;
        let minY = Infinity, maxY = -Infinity;
        for (let i = 0; i < shape.points.length; i += 2) {
          minX = Math.min(minX, shape.points[i]);
          maxX = Math.max(maxX, shape.points[i]);
          minY = Math.min(minY, shape.points[i + 1]);
          maxY = Math.max(maxY, shape.points[i + 1]);
        }
        left = shape.x + minX;
        right = shape.x + maxX;
        top = shape.y + minY;
        bottom = shape.y + maxY;
      }
      break;
    }
    case 'text':
      left = shape.x;
      right = shape.x + shape.text.length * shape.fontSize * 0.6;
      top = shape.y;
      bottom = shape.y + shape.fontSize;
      break;
    case 'group':
      left = shape.x;
      right = shape.x + shape.width;
      top = shape.y;
      bottom = shape.y + shape.height;
      break;
  }

  return {
    left,
    right,
    top,
    bottom,
    centerX: (left + right) / 2,
    centerY: (top + bottom) / 2,
  };
}

export interface SmartGuide {
  type: 'vertical' | 'horizontal';
  position: number;
  start: number;
  end: number;
  alignType: 'left' | 'center' | 'right' | 'top' | 'middle' | 'bottom';
}

/**
 * スマートガイドを計算
 */
export function calculateSmartGuides(
  draggingShape: Shape,
  otherShapes: Shape[],
  canvasWidth: number,
  canvasHeight: number
): SmartGuide[] {
  const guides: SmartGuide[] = [];
  const draggingBounds = getShapeBounds(draggingShape);

  // 他の図形との整列をチェック
  for (const shape of otherShapes) {
    if (shape.id === draggingShape.id) continue;
    if (!shape.visible) continue;

    const bounds = getShapeBounds(shape);

    // 垂直ガイド（X軸方向の整列）
    // 左端揃え
    if (Math.abs(draggingBounds.left - bounds.left) < SNAP_THRESHOLD) {
      guides.push({
        type: 'vertical',
        position: bounds.left,
        start: Math.min(draggingBounds.top, bounds.top) - 20,
        end: Math.max(draggingBounds.bottom, bounds.bottom) + 20,
        alignType: 'left',
      });
    }
    // 右端揃え
    if (Math.abs(draggingBounds.right - bounds.right) < SNAP_THRESHOLD) {
      guides.push({
        type: 'vertical',
        position: bounds.right,
        start: Math.min(draggingBounds.top, bounds.top) - 20,
        end: Math.max(draggingBounds.bottom, bounds.bottom) + 20,
        alignType: 'right',
      });
    }
    // 中央揃え（垂直）
    if (Math.abs(draggingBounds.centerX - bounds.centerX) < SNAP_THRESHOLD) {
      guides.push({
        type: 'vertical',
        position: bounds.centerX,
        start: Math.min(draggingBounds.top, bounds.top) - 20,
        end: Math.max(draggingBounds.bottom, bounds.bottom) + 20,
        alignType: 'center',
      });
    }
    // ドラッグ左端と他の右端
    if (Math.abs(draggingBounds.left - bounds.right) < SNAP_THRESHOLD) {
      guides.push({
        type: 'vertical',
        position: bounds.right,
        start: Math.min(draggingBounds.top, bounds.top) - 20,
        end: Math.max(draggingBounds.bottom, bounds.bottom) + 20,
        alignType: 'left',
      });
    }
    // ドラッグ右端と他の左端
    if (Math.abs(draggingBounds.right - bounds.left) < SNAP_THRESHOLD) {
      guides.push({
        type: 'vertical',
        position: bounds.left,
        start: Math.min(draggingBounds.top, bounds.top) - 20,
        end: Math.max(draggingBounds.bottom, bounds.bottom) + 20,
        alignType: 'right',
      });
    }

    // 水平ガイド（Y軸方向の整列）
    // 上端揃え
    if (Math.abs(draggingBounds.top - bounds.top) < SNAP_THRESHOLD) {
      guides.push({
        type: 'horizontal',
        position: bounds.top,
        start: Math.min(draggingBounds.left, bounds.left) - 20,
        end: Math.max(draggingBounds.right, bounds.right) + 20,
        alignType: 'top',
      });
    }
    // 下端揃え
    if (Math.abs(draggingBounds.bottom - bounds.bottom) < SNAP_THRESHOLD) {
      guides.push({
        type: 'horizontal',
        position: bounds.bottom,
        start: Math.min(draggingBounds.left, bounds.left) - 20,
        end: Math.max(draggingBounds.right, bounds.right) + 20,
        alignType: 'bottom',
      });
    }
    // 中央揃え（水平）
    if (Math.abs(draggingBounds.centerY - bounds.centerY) < SNAP_THRESHOLD) {
      guides.push({
        type: 'horizontal',
        position: bounds.centerY,
        start: Math.min(draggingBounds.left, bounds.left) - 20,
        end: Math.max(draggingBounds.right, bounds.right) + 20,
        alignType: 'middle',
      });
    }
    // ドラッグ上端と他の下端
    if (Math.abs(draggingBounds.top - bounds.bottom) < SNAP_THRESHOLD) {
      guides.push({
        type: 'horizontal',
        position: bounds.bottom,
        start: Math.min(draggingBounds.left, bounds.left) - 20,
        end: Math.max(draggingBounds.right, bounds.right) + 20,
        alignType: 'top',
      });
    }
    // ドラッグ下端と他の上端
    if (Math.abs(draggingBounds.bottom - bounds.top) < SNAP_THRESHOLD) {
      guides.push({
        type: 'horizontal',
        position: bounds.top,
        start: Math.min(draggingBounds.left, bounds.left) - 20,
        end: Math.max(draggingBounds.right, bounds.right) + 20,
        alignType: 'bottom',
      });
    }
  }

  // キャンバス中央との整列
  const canvasCenterX = canvasWidth / 2;
  const canvasCenterY = canvasHeight / 2;

  if (Math.abs(draggingBounds.centerX - canvasCenterX) < SNAP_THRESHOLD) {
    guides.push({
      type: 'vertical',
      position: canvasCenterX,
      start: 0,
      end: canvasHeight,
      alignType: 'center',
    });
  }

  if (Math.abs(draggingBounds.centerY - canvasCenterY) < SNAP_THRESHOLD) {
    guides.push({
      type: 'horizontal',
      position: canvasCenterY,
      start: 0,
      end: canvasWidth,
      alignType: 'middle',
    });
  }

  return guides;
}

/**
 * スナップ位置を計算
 */
export function calculateSnapPosition(
  draggingShape: Shape,
  otherShapes: Shape[],
  canvasWidth: number,
  canvasHeight: number
): Point | null {
  const bounds = getShapeBounds(draggingShape);
  let snapX: number | null = null;
  let snapY: number | null = null;
  let snapDeltaX = 0;
  let snapDeltaY = 0;

  // 他の図形との整列をチェック
  for (const shape of otherShapes) {
    if (shape.id === draggingShape.id) continue;
    if (!shape.visible) continue;

    const targetBounds = getShapeBounds(shape);

    // X軸のスナップ
    if (snapX === null) {
      if (Math.abs(bounds.left - targetBounds.left) < SNAP_THRESHOLD) {
        snapX = targetBounds.left;
        snapDeltaX = bounds.left - draggingShape.x;
      } else if (Math.abs(bounds.right - targetBounds.right) < SNAP_THRESHOLD) {
        snapX = targetBounds.right;
        snapDeltaX = bounds.right - draggingShape.x;
      } else if (Math.abs(bounds.centerX - targetBounds.centerX) < SNAP_THRESHOLD) {
        snapX = targetBounds.centerX;
        snapDeltaX = bounds.centerX - draggingShape.x;
      } else if (Math.abs(bounds.left - targetBounds.right) < SNAP_THRESHOLD) {
        snapX = targetBounds.right;
        snapDeltaX = bounds.left - draggingShape.x;
      } else if (Math.abs(bounds.right - targetBounds.left) < SNAP_THRESHOLD) {
        snapX = targetBounds.left;
        snapDeltaX = bounds.right - draggingShape.x;
      }
    }

    // Y軸のスナップ
    if (snapY === null) {
      if (Math.abs(bounds.top - targetBounds.top) < SNAP_THRESHOLD) {
        snapY = targetBounds.top;
        snapDeltaY = bounds.top - draggingShape.y;
      } else if (Math.abs(bounds.bottom - targetBounds.bottom) < SNAP_THRESHOLD) {
        snapY = targetBounds.bottom;
        snapDeltaY = bounds.bottom - draggingShape.y;
      } else if (Math.abs(bounds.centerY - targetBounds.centerY) < SNAP_THRESHOLD) {
        snapY = targetBounds.centerY;
        snapDeltaY = bounds.centerY - draggingShape.y;
      } else if (Math.abs(bounds.top - targetBounds.bottom) < SNAP_THRESHOLD) {
        snapY = targetBounds.bottom;
        snapDeltaY = bounds.top - draggingShape.y;
      } else if (Math.abs(bounds.bottom - targetBounds.top) < SNAP_THRESHOLD) {
        snapY = targetBounds.top;
        snapDeltaY = bounds.bottom - draggingShape.y;
      }
    }
  }

  // キャンバス中央との整列
  const canvasCenterX = canvasWidth / 2;
  const canvasCenterY = canvasHeight / 2;

  if (snapX === null && Math.abs(bounds.centerX - canvasCenterX) < SNAP_THRESHOLD) {
    snapX = canvasCenterX;
    snapDeltaX = bounds.centerX - draggingShape.x;
  }

  if (snapY === null && Math.abs(bounds.centerY - canvasCenterY) < SNAP_THRESHOLD) {
    snapY = canvasCenterY;
    snapDeltaY = bounds.centerY - draggingShape.y;
  }

  if (snapX !== null || snapY !== null) {
    return {
      x: snapX !== null ? snapX - snapDeltaX : draggingShape.x,
      y: snapY !== null ? snapY - snapDeltaY : draggingShape.y,
    };
  }

  return null;
}

interface SmartGuidesProps {
  guides: SmartGuide[];
}

export function SmartGuidesOverlay({ guides }: SmartGuidesProps) {
  const uniqueGuides = useMemo(() => {
    // 重複するガイドを除去
    const seen = new Set<string>();
    return guides.filter((guide) => {
      const key = `${guide.type}-${guide.position.toFixed(1)}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [guides]);

  if (uniqueGuides.length === 0) {
    return null;
  }

  return (
    <Group>
      {uniqueGuides.map((guide, index) => (
        <Line
          key={`guide-${index}`}
          points={
            guide.type === 'vertical'
              ? [guide.position, guide.start, guide.position, guide.end]
              : [guide.start, guide.position, guide.end, guide.position]
          }
          stroke={GUIDE_COLOR}
          strokeWidth={1}
          dash={GUIDE_DASH}
          listening={false}
        />
      ))}
    </Group>
  );
}
