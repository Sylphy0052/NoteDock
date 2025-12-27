/**
 * Boolean Operations for CAD Drawing
 * Uses polygon-clipping library for polygon boolean operations
 */

import polygonClipping from 'polygon-clipping';
import { v4 as uuidv4 } from 'uuid';
import type {
  Shape,
  PolygonShape,
  RectShape,
  CircleShape,
  BooleanOperationType,
} from '../types';

// Types from polygon-clipping
type Point = [number, number];
type Ring = Point[];
type Polygon = Ring[];
type MultiPolygon = Polygon[];

/**
 * Convert a shape to polygon format for boolean operations
 */
export function shapeToPolygon(shape: Shape): Polygon | null {
  switch (shape.type) {
    case 'rect': {
      const rect = shape as RectShape;
      // Rectangle: 4 corners
      const ring: Ring = [
        [rect.x, rect.y],
        [rect.x + rect.width, rect.y],
        [rect.x + rect.width, rect.y + rect.height],
        [rect.x, rect.y + rect.height],
        [rect.x, rect.y], // Close the polygon
      ];
      return [ring];
    }

    case 'circle': {
      const circle = shape as CircleShape;
      // Approximate circle with 32 points
      const segments = 32;
      const ring: Ring = [];
      for (let i = 0; i <= segments; i++) {
        const angle = (i / segments) * Math.PI * 2;
        ring.push([
          circle.x + Math.cos(angle) * circle.radius,
          circle.y + Math.sin(angle) * circle.radius,
        ]);
      }
      return [ring];
    }

    case 'polygon': {
      const poly = shape as PolygonShape;
      if (poly.points.length < 6) return null; // Need at least 3 points

      const ring: Ring = [];
      for (let i = 0; i < poly.points.length; i += 2) {
        ring.push([
          poly.x + poly.points[i],
          poly.y + poly.points[i + 1],
        ]);
      }
      // Close if needed
      if (ring.length > 0 && (ring[0][0] !== ring[ring.length - 1][0] || ring[0][1] !== ring[ring.length - 1][1])) {
        ring.push([ring[0][0], ring[0][1]]);
      }
      return [ring];
    }

    default:
      return null;
  }
}

/**
 * Convert polygon result back to a PolygonShape
 */
export function polygonToShape(
  multiPolygon: MultiPolygon,
  baseStyle: Partial<Shape>
): PolygonShape[] {
  const shapes: PolygonShape[] = [];

  for (const polygon of multiPolygon) {
    if (polygon.length === 0) continue;

    // Take the outer ring (first ring)
    const outerRing = polygon[0];
    if (outerRing.length < 3) continue;

    // Find bounding box to set x, y
    let minX = Infinity;
    let minY = Infinity;
    for (const point of outerRing) {
      minX = Math.min(minX, point[0]);
      minY = Math.min(minY, point[1]);
    }

    // Convert to relative coordinates
    const points: number[] = [];
    for (let i = 0; i < outerRing.length - 1; i++) { // Skip last point (duplicate of first)
      points.push(outerRing[i][0] - minX, outerRing[i][1] - minY);
    }

    const shape: PolygonShape = {
      id: uuidv4(),
      type: 'polygon',
      x: minX,
      y: minY,
      rotation: 0,
      stroke: (baseStyle.stroke as string) || '#000000',
      strokeWidth: (baseStyle.strokeWidth as number) || 2,
      lineStyle: (baseStyle.lineStyle as 'solid' | 'dashed' | 'dotted' | 'dashdot') || 'solid',
      fill: baseStyle.fill as string | undefined,
      opacity: (baseStyle.opacity as number) || 1,
      locked: false,
      visible: true,
      points,
      closed: true,
    };

    shapes.push(shape);
  }

  return shapes;
}

/**
 * Perform boolean operation on selected shapes
 */
export function performBooleanOperation(
  shapes: Shape[],
  operation: BooleanOperationType
): PolygonShape[] {
  if (shapes.length < 2) return [];

  // Convert shapes to polygons
  const polygons = shapes
    .map((s) => shapeToPolygon(s))
    .filter((p): p is Polygon => p !== null);

  if (polygons.length < 2) return [];

  // Get base style from first shape
  const baseStyle: Partial<Shape> = {
    stroke: shapes[0].stroke,
    strokeWidth: shapes[0].strokeWidth,
    lineStyle: shapes[0].lineStyle,
    fill: shapes[0].fill,
    opacity: shapes[0].opacity,
  };

  let result: MultiPolygon;

  try {
    switch (operation) {
      case 'union':
        result = polygonClipping.union(...polygons);
        break;

      case 'subtract':
        // First polygon minus the rest
        result = polygonClipping.difference(polygons[0], ...polygons.slice(1));
        break;

      case 'intersect':
        result = polygonClipping.intersection(polygons[0], ...polygons.slice(1));
        break;

      case 'exclude':
        result = polygonClipping.xor(...polygons);
        break;

      default:
        return [];
    }

    return polygonToShape(result, baseStyle);
  } catch (error) {
    console.error('Boolean operation failed:', error);
    return [];
  }
}

/**
 * Check if a shape can participate in boolean operations
 */
export function canBooleanOperate(shape: Shape): boolean {
  return ['rect', 'circle', 'polygon'].includes(shape.type);
}
