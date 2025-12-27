/**
 * Drawing Components - エクスポート
 */

// コンテキスト
export { DrawingProvider, useDrawing } from './context/DrawingContext';
export { drawingReducer, createShape } from './context/DrawingReducer';

// メインコンポーネント
export { DrawingCanvas } from './DrawingCanvas';
export { DrawingToolbar } from './DrawingToolbar';
export { DrawingStylePanel } from './DrawingStylePanel';
export { DrawingStatusBar } from './DrawingStatusBar';

// 図形レンダラー
export { ShapeRenderer } from './shapes/ShapeRenderer';

// フック
export { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';

// ユーティリティ
export * from './utils/geometry';
export * from './utils/export';

// 型
export type {
  Shape,
  LineShape,
  CircleShape,
  ArcShape,
  RectShape,
  PolygonShape,
  ShapeType,
  ToolType,
  Point,
  DrawingState,
  DrawingAction,
  DrawingStyle,
  ExportFormat,
  ExportOptions,
} from './types';

export {
  initialDrawingState,
  DEFAULT_STYLE,
  PRESET_COLORS,
  STROKE_WIDTHS,
  SHORTCUTS,
} from './types';
