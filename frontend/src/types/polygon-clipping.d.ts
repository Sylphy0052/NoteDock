/**
 * Type definitions for polygon-clipping
 */

declare module 'polygon-clipping' {
  // A point is [x, y]
  type Point = [number, number];

  // A ring is an array of points forming a closed polygon
  type Ring = Point[];

  // A polygon is an array of rings (first ring is outer boundary, rest are holes)
  type Polygon = Ring[];

  // A multi-polygon is an array of polygons
  type MultiPolygon = Polygon[];

  // Geom can be a polygon or multi-polygon
  type Geom = Polygon | MultiPolygon;

  interface PolygonClipping {
    union(...geoms: Geom[]): MultiPolygon;
    intersection(subject: Geom, ...clips: Geom[]): MultiPolygon;
    difference(subject: Geom, ...clips: Geom[]): MultiPolygon;
    xor(...geoms: Geom[]): MultiPolygon;
  }

  const polygonClipping: PolygonClipping;
  export default polygonClipping;
}
