/**
 * Object Snap Utilities - オブジェクトスナップ計算
 */

import type { Shape, Point, SnapPoint } from '../types';

/**
 * スナップ検出距離（ピクセル）
 */
const SNAP_DISTANCE = 10;

/**
 * 2点間の距離を計算
 */
function distance(p1: Point, p2: Point): number {
  return Math.sqrt((p1.x - p2.x) ** 2 + (p1.y - p2.y) ** 2);
}

/**
 * 図形からスナップポイントを抽出
 */
export function getSnapPointsFromShape(shape: Shape): SnapPoint[] {
  const points: SnapPoint[] = [];

  switch (shape.type) {
    case 'line':
    case 'arrow':
    case 'dimension': {
      const [x1, y1, x2, y2] = shape.points;
      // 端点
      points.push({
        x: shape.x + x1,
        y: shape.y + y1,
        type: 'endpoint',
        shapeId: shape.id,
      });
      points.push({
        x: shape.x + x2,
        y: shape.y + y2,
        type: 'endpoint',
        shapeId: shape.id,
      });
      // 中点
      points.push({
        x: shape.x + (x1 + x2) / 2,
        y: shape.y + (y1 + y2) / 2,
        type: 'midpoint',
        shapeId: shape.id,
      });
      break;
    }

    case 'circle': {
      // 中心
      points.push({
        x: shape.x,
        y: shape.y,
        type: 'center',
        shapeId: shape.id,
      });
      // 上下左右の端点
      const r = shape.radius;
      points.push({ x: shape.x, y: shape.y - r, type: 'endpoint', shapeId: shape.id });
      points.push({ x: shape.x, y: shape.y + r, type: 'endpoint', shapeId: shape.id });
      points.push({ x: shape.x - r, y: shape.y, type: 'endpoint', shapeId: shape.id });
      points.push({ x: shape.x + r, y: shape.y, type: 'endpoint', shapeId: shape.id });
      break;
    }

    case 'arc': {
      // 中心
      points.push({
        x: shape.x,
        y: shape.y,
        type: 'center',
        shapeId: shape.id,
      });
      // 開始点と終了点
      const startRad = (shape.startAngle * Math.PI) / 180;
      const endRad = (shape.endAngle * Math.PI) / 180;
      points.push({
        x: shape.x + shape.radius * Math.cos(startRad),
        y: shape.y + shape.radius * Math.sin(startRad),
        type: 'endpoint',
        shapeId: shape.id,
      });
      points.push({
        x: shape.x + shape.radius * Math.cos(endRad),
        y: shape.y + shape.radius * Math.sin(endRad),
        type: 'endpoint',
        shapeId: shape.id,
      });
      break;
    }

    case 'rect': {
      const { x, y, width, height } = shape;
      // 四隅
      points.push({ x, y, type: 'endpoint', shapeId: shape.id });
      points.push({ x: x + width, y, type: 'endpoint', shapeId: shape.id });
      points.push({ x, y: y + height, type: 'endpoint', shapeId: shape.id });
      points.push({ x: x + width, y: y + height, type: 'endpoint', shapeId: shape.id });
      // 辺の中点
      points.push({ x: x + width / 2, y, type: 'midpoint', shapeId: shape.id });
      points.push({ x: x + width / 2, y: y + height, type: 'midpoint', shapeId: shape.id });
      points.push({ x, y: y + height / 2, type: 'midpoint', shapeId: shape.id });
      points.push({ x: x + width, y: y + height / 2, type: 'midpoint', shapeId: shape.id });
      // 中心
      points.push({ x: x + width / 2, y: y + height / 2, type: 'center', shapeId: shape.id });
      break;
    }

    case 'polygon':
    case 'freehand': {
      // 各頂点を端点として追加
      for (let i = 0; i < shape.points.length; i += 2) {
        points.push({
          x: shape.x + shape.points[i],
          y: shape.y + shape.points[i + 1],
          type: 'endpoint',
          shapeId: shape.id,
        });
      }
      // 各辺の中点を追加
      for (let i = 0; i < shape.points.length - 2; i += 2) {
        const x1 = shape.points[i];
        const y1 = shape.points[i + 1];
        const x2 = shape.points[i + 2];
        const y2 = shape.points[i + 3];
        points.push({
          x: shape.x + (x1 + x2) / 2,
          y: shape.y + (y1 + y2) / 2,
          type: 'midpoint',
          shapeId: shape.id,
        });
      }
      break;
    }

    case 'text': {
      // テキストの基準点のみ
      points.push({
        x: shape.x,
        y: shape.y,
        type: 'endpoint',
        shapeId: shape.id,
      });
      break;
    }

    case 'group': {
      // グループの四隅と中心
      const { x, y, width, height } = shape;
      points.push({ x, y, type: 'endpoint', shapeId: shape.id });
      points.push({ x: x + width, y, type: 'endpoint', shapeId: shape.id });
      points.push({ x, y: y + height, type: 'endpoint', shapeId: shape.id });
      points.push({ x: x + width, y: y + height, type: 'endpoint', shapeId: shape.id });
      points.push({ x: x + width / 2, y: y + height / 2, type: 'center', shapeId: shape.id });
      break;
    }

    case 'image': {
      // 画像の四隅と中心
      const { x, y, width, height } = shape;
      points.push({ x, y, type: 'endpoint', shapeId: shape.id });
      points.push({ x: x + width, y, type: 'endpoint', shapeId: shape.id });
      points.push({ x, y: y + height, type: 'endpoint', shapeId: shape.id });
      points.push({ x: x + width, y: y + height, type: 'endpoint', shapeId: shape.id });
      // 辺の中点
      points.push({ x: x + width / 2, y, type: 'midpoint', shapeId: shape.id });
      points.push({ x: x + width / 2, y: y + height, type: 'midpoint', shapeId: shape.id });
      points.push({ x, y: y + height / 2, type: 'midpoint', shapeId: shape.id });
      points.push({ x: x + width, y: y + height / 2, type: 'midpoint', shapeId: shape.id });
      // 中心
      points.push({ x: x + width / 2, y: y + height / 2, type: 'center', shapeId: shape.id });
      break;
    }
  }

  return points;
}

/**
 * 全図形からスナップポイントを収集
 */
export function getAllSnapPoints(shapes: Shape[], excludeIds?: string[]): SnapPoint[] {
  const excludeSet = new Set(excludeIds ?? []);
  const allPoints: SnapPoint[] = [];

  for (const shape of shapes) {
    if (excludeSet.has(shape.id)) continue;
    allPoints.push(...getSnapPointsFromShape(shape));
  }

  return allPoints;
}

/**
 * 指定した点に最も近いスナップポイントを検索
 */
export function findNearestSnapPoint(
  point: Point,
  snapPoints: SnapPoint[],
  maxDistance: number = SNAP_DISTANCE
): SnapPoint | null {
  let nearest: SnapPoint | null = null;
  let minDist = maxDistance;

  for (const sp of snapPoints) {
    const d = distance(point, sp);
    if (d < minDist) {
      minDist = d;
      nearest = sp;
    }
  }

  return nearest;
}

/**
 * グリッドスナップとオブジェクトスナップの両方を考慮して点をスナップ
 */
export function snapPoint(
  point: Point,
  shapes: Shape[],
  options: {
    snapToGrid: boolean;
    gridSize: number;
    objectSnapEnabled: boolean;
    excludeIds?: string[];
    zoom?: number; // ズームレベル（デフォルト: 1）
  }
): { point: Point; snapInfo: SnapPoint | null } {
  const { snapToGrid, gridSize, objectSnapEnabled, excludeIds, zoom = 1 } = options;

  // ズームレベルに応じたスナップ距離（画面上で一定のピクセル数になるよう調整）
  const effectiveSnapDistance = SNAP_DISTANCE / zoom;

  // オブジェクトスナップを優先
  if (objectSnapEnabled) {
    const allSnapPoints = getAllSnapPoints(shapes, excludeIds);
    const nearest = findNearestSnapPoint(point, allSnapPoints, effectiveSnapDistance);
    if (nearest) {
      return {
        point: { x: nearest.x, y: nearest.y },
        snapInfo: nearest,
      };
    }
  }

  // グリッドスナップ
  if (snapToGrid) {
    return {
      point: {
        x: Math.round(point.x / gridSize) * gridSize,
        y: Math.round(point.y / gridSize) * gridSize,
      },
      snapInfo: null,
    };
  }

  // スナップなし
  return { point, snapInfo: null };
}
