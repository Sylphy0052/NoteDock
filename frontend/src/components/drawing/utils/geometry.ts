/**
 * Geometry Utilities - 幾何学計算
 */

import type { Point } from '../types';

/**
 * 2点間の距離を計算
 */
export function distance(p1: Point, p2: Point): number {
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * 2点間の角度を計算（度）
 */
export function angle(p1: Point, p2: Point): number {
  const rad = Math.atan2(p2.y - p1.y, p2.x - p1.x);
  return (rad * 180) / Math.PI;
}

/**
 * ラジアンを度に変換
 */
export function radToDeg(rad: number): number {
  return (rad * 180) / Math.PI;
}

/**
 * 度をラジアンに変換
 */
export function degToRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

/**
 * 角度を0-360の範囲に正規化
 */
export function normalizeAngle(deg: number): number {
  let result = deg % 360;
  if (result < 0) result += 360;
  return result;
}

/**
 * 角度を指定した単位にスナップ
 */
export function snapAngle(deg: number, snapUnit: number = 45): number {
  return Math.round(deg / snapUnit) * snapUnit;
}

/**
 * 座標をグリッドにスナップ
 */
export function snapToGrid(point: Point, gridSize: number): Point {
  return {
    x: Math.round(point.x / gridSize) * gridSize,
    y: Math.round(point.y / gridSize) * gridSize,
  };
}

/**
 * 線を水平・垂直・45度にスナップ
 */
export function snapLineAngle(
  start: Point,
  end: Point,
  snapUnit: number = 45
): Point {
  const dist = distance(start, end);
  const ang = angle(start, end);
  const snappedAngle = snapAngle(ang, snapUnit);
  const rad = degToRad(snappedAngle);
  return {
    x: start.x + dist * Math.cos(rad),
    y: start.y + dist * Math.sin(rad),
  };
}

/**
 * 正方形になるように座標を調整
 */
export function constrainToSquare(start: Point, end: Point): Point {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const size = Math.max(Math.abs(dx), Math.abs(dy));
  return {
    x: start.x + size * Math.sign(dx),
    y: start.y + size * Math.sign(dy),
  };
}

/**
 * 点が矩形内にあるかチェック
 */
export function isPointInRect(
  point: Point,
  rect: { x: number; y: number; width: number; height: number }
): boolean {
  return (
    point.x >= rect.x &&
    point.x <= rect.x + rect.width &&
    point.y >= rect.y &&
    point.y <= rect.y + rect.height
  );
}

/**
 * 2つの矩形が交差するかチェック
 */
export function rectsIntersect(
  rect1: { x: number; y: number; width: number; height: number },
  rect2: { x: number; y: number; width: number; height: number }
): boolean {
  return !(
    rect1.x + rect1.width < rect2.x ||
    rect2.x + rect2.width < rect1.x ||
    rect1.y + rect1.height < rect2.y ||
    rect2.y + rect2.height < rect1.y
  );
}

/**
 * 点が円内にあるかチェック
 */
export function isPointInCircle(
  point: Point,
  center: Point,
  radius: number
): boolean {
  return distance(point, center) <= radius;
}

/**
 * バウンディングボックスを計算
 */
export function getBoundingBox(points: Point[]): {
  x: number;
  y: number;
  width: number;
  height: number;
} {
  if (points.length === 0) {
    return { x: 0, y: 0, width: 0, height: 0 };
  }

  let minX = points[0].x;
  let minY = points[0].y;
  let maxX = points[0].x;
  let maxY = points[0].y;

  for (const point of points) {
    minX = Math.min(minX, point.x);
    minY = Math.min(minY, point.y);
    maxX = Math.max(maxX, point.x);
    maxY = Math.max(maxY, point.y);
  }

  return {
    x: minX,
    y: minY,
    width: maxX - minX,
    height: maxY - minY,
  };
}

/**
 * 点列から中心を計算
 */
export function getCenter(points: Point[]): Point {
  if (points.length === 0) {
    return { x: 0, y: 0 };
  }

  const sum = points.reduce(
    (acc, p) => ({ x: acc.x + p.x, y: acc.y + p.y }),
    { x: 0, y: 0 }
  );

  return {
    x: sum.x / points.length,
    y: sum.y / points.length,
  };
}

/**
 * 点を原点周りに回転
 */
export function rotatePoint(point: Point, center: Point, angleDeg: number): Point {
  const rad = degToRad(angleDeg);
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  const dx = point.x - center.x;
  const dy = point.y - center.y;
  return {
    x: center.x + dx * cos - dy * sin,
    y: center.y + dx * sin + dy * cos,
  };
}

/**
 * 数値を指定範囲にクランプ
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/**
 * 円弧上のポイントを計算（弧のみを描画するため）
 * @param centerX 中心X座標
 * @param centerY 中心Y座標
 * @param radius 半径
 * @param startAngle 開始角度（度）
 * @param endAngle 終了角度（度）
 * @param segments セグメント数（滑らかさ）
 * @returns ポイントの配列 [x1, y1, x2, y2, ...]
 */
export function getArcPoints(
  centerX: number,
  centerY: number,
  radius: number,
  startAngle: number,
  endAngle: number,
  segments: number = 64
): number[] {
  const points: number[] = [];

  // 角度を正規化
  let start = normalizeAngle(startAngle);
  let end = normalizeAngle(endAngle);

  // 角度差を計算（反時計回り方向に描画）
  let angleDiff = end - start;
  if (angleDiff <= 0) {
    angleDiff += 360;
  }

  // 小さすぎる弧は描画しない
  if (angleDiff < 1) {
    return points;
  }

  // セグメント数を角度に応じて調整
  const actualSegments = Math.max(8, Math.ceil(segments * (angleDiff / 360)));
  const angleStep = angleDiff / actualSegments;

  for (let i = 0; i <= actualSegments; i++) {
    const currentAngle = start + angleStep * i;
    const rad = degToRad(currentAngle);
    points.push(
      centerX + radius * Math.cos(rad),
      centerY + radius * Math.sin(rad)
    );
  }

  return points;
}
