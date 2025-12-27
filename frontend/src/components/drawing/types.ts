/**
 * CAD Drawing - Type Definitions
 */

// ============================================
// 基本型
// ============================================

export interface Point {
  x: number;
  y: number;
}

export type ShapeType = 'line' | 'circle' | 'arc' | 'rect' | 'polygon' | 'text' | 'arrow' | 'freehand' | 'group' | 'dimension' | 'image';
export type ToolType = 'select' | 'line' | 'circle' | 'arc' | 'rect' | 'polygon' | 'text' | 'arrow' | 'freehand' | 'dimension' | 'measure';

// 計測単位
export type MeasureUnit = 'px' | 'mm' | 'cm';

// 矢印マーカータイプ
export type ArrowMarkerType = 'none' | 'triangle' | 'open' | 'diamond';

// 線スタイルタイプ
export type LineStyleType = 'solid' | 'dashed' | 'dotted' | 'dashdot';

// 整列タイプ
export type AlignmentType = 'left' | 'center' | 'right' | 'top' | 'middle' | 'bottom';

// 分散タイプ
export type DistributionType = 'horizontal' | 'vertical';

// グラデーションタイプ
export type GradientType = 'linear' | 'radial';

// グラデーションの色ストップ
export interface GradientColorStop {
  offset: number; // 0-1
  color: string;
}

// グラデーション定義
export interface GradientFill {
  type: GradientType;
  colorStops: GradientColorStop[];
  // リニアグラデーション用
  angle?: number; // 0-360 degrees
  // ラジアルグラデーション用
  centerX?: number; // 0-1 (relative to shape)
  centerY?: number; // 0-1 (relative to shape)
  radius?: number; // 0-1 (relative to shape size)
}

// ============================================
// 図形データ型
// ============================================

/**
 * 基本図形の共通プロパティ
 */
export interface BaseShape {
  id: string;
  type: ShapeType;
  x: number;
  y: number;
  rotation: number;
  stroke: string;
  strokeWidth: number;
  lineStyle: LineStyleType;
  fill?: string;
  gradientFill?: GradientFill;
  opacity: number;
  locked: boolean;
  visible: boolean;
}

/**
 * 線
 */
export interface LineShape extends BaseShape {
  type: 'line';
  points: [number, number, number, number]; // [x1, y1, x2, y2] 相対座標
}

/**
 * 円
 */
export interface CircleShape extends BaseShape {
  type: 'circle';
  radius: number;
}

/**
 * 円弧（弧のみ、半径線なし）
 */
export interface ArcShape extends BaseShape {
  type: 'arc';
  radius: number;
  startAngle: number; // 開始角度（度）
  endAngle: number; // 終了角度（度）
}

/**
 * 矩形
 */
export interface RectShape extends BaseShape {
  type: 'rect';
  width: number;
  height: number;
  cornerRadius?: number;
}

/**
 * 多角形
 */
export interface PolygonShape extends BaseShape {
  type: 'polygon';
  points: number[]; // [x1, y1, x2, y2, x3, y3, ...] 相対座標
  closed: boolean;
}

/**
 * テキスト
 */
export interface TextShape extends BaseShape {
  type: 'text';
  text: string;
  fontSize: number;
  fontFamily: string;
  fontWeight: 'normal' | 'bold';
  fontStyle: 'normal' | 'italic';
  textAlign: 'left' | 'center' | 'right';
}

/**
 * 矢印
 */
export interface ArrowShape extends BaseShape {
  type: 'arrow';
  points: [number, number, number, number]; // [x1, y1, x2, y2] 相対座標
  arrowStart: ArrowMarkerType;
  arrowEnd: ArrowMarkerType;
}

/**
 * フリーハンド
 */
export interface FreehandShape extends BaseShape {
  type: 'freehand';
  points: number[]; // [x1, y1, x2, y2, ...]
}

/**
 * グループ
 */
export interface GroupShape extends BaseShape {
  type: 'group';
  children: Shape[]; // 子図形の配列
  width: number;
  height: number;
}

/**
 * 寸法線
 */
export interface DimensionShape extends BaseShape {
  type: 'dimension';
  points: [number, number, number, number]; // [x1, y1, x2, y2] 相対座標
  offset: number; // 寸法線のオフセット距離
  text?: string; // 手動上書き用
  unit: 'px' | 'mm' | 'cm';
  showExtensionLines: boolean; // 延長線の表示
}

/**
 * 画像
 */
export interface ImageShape extends BaseShape {
  type: 'image';
  src: string; // Base64 or URL
  width: number;
  height: number;
  originalWidth: number;
  originalHeight: number;
  aspectRatio: number;
}

export type Shape = LineShape | CircleShape | ArcShape | RectShape | PolygonShape | TextShape | ArrowShape | FreehandShape | GroupShape | DimensionShape | ImageShape;

// ============================================
// スタイル型
// ============================================

export interface DrawingStyle {
  stroke: string;
  strokeWidth: number;
  fill: string | null;
  gradientFill: GradientFill | null;
  lineStyle: LineStyleType;
  fontSize: number;
  fontFamily: string;
}

export const DEFAULT_STYLE: DrawingStyle = {
  stroke: '#000000',
  strokeWidth: 2,
  fill: null,
  gradientFill: null,
  lineStyle: 'solid',
  fontSize: 16,
  fontFamily: 'sans-serif',
};

// プリセットグラデーション
export const PRESET_GRADIENTS: { name: string; gradient: GradientFill }[] = [
  {
    name: '青→紫',
    gradient: {
      type: 'linear',
      angle: 90,
      colorStops: [
        { offset: 0, color: '#3b82f6' },
        { offset: 1, color: '#8b5cf6' },
      ],
    },
  },
  {
    name: '日の出',
    gradient: {
      type: 'linear',
      angle: 0,
      colorStops: [
        { offset: 0, color: '#f97316' },
        { offset: 0.5, color: '#fbbf24' },
        { offset: 1, color: '#fef08a' },
      ],
    },
  },
  {
    name: '森',
    gradient: {
      type: 'linear',
      angle: 180,
      colorStops: [
        { offset: 0, color: '#22c55e' },
        { offset: 1, color: '#14b8a6' },
      ],
    },
  },
  {
    name: '夕焼け',
    gradient: {
      type: 'linear',
      angle: 45,
      colorStops: [
        { offset: 0, color: '#f43f5e' },
        { offset: 0.5, color: '#fb7185' },
        { offset: 1, color: '#fda4af' },
      ],
    },
  },
  {
    name: 'グレー',
    gradient: {
      type: 'linear',
      angle: 90,
      colorStops: [
        { offset: 0, color: '#374151' },
        { offset: 1, color: '#9ca3af' },
      ],
    },
  },
  {
    name: '放射状（青）',
    gradient: {
      type: 'radial',
      centerX: 0.5,
      centerY: 0.5,
      radius: 0.8,
      colorStops: [
        { offset: 0, color: '#60a5fa' },
        { offset: 1, color: '#1e40af' },
      ],
    },
  },
];

// 線スタイルのダッシュパターン
export const LINE_DASH_PATTERNS: Record<LineStyleType, number[]> = {
  solid: [],
  dashed: [10, 5],
  dotted: [2, 4],
  dashdot: [10, 5, 2, 5],
};

// ============================================
// 描画状態型
// ============================================

export interface DrawingState {
  // 図形データ
  shapes: Shape[];
  selectedIds: string[];

  // ツール状態
  currentTool: ToolType;
  isDrawing: boolean;
  drawingShape: Partial<Shape> | null;

  // 頂点編集モード
  vertexEditMode: boolean;
  editingShapeId: string | null;
  editingVertexIndex: number | null;

  // キャンバス状態
  zoom: number;
  pan: Point;
  gridEnabled: boolean;
  gridSize: number;
  snapToGrid: boolean;

  // スタイル設定
  currentStyle: DrawingStyle;

  // 履歴（Undo/Redo）
  history: Shape[][];
  historyIndex: number;

  // クリップボード
  clipboard: Shape[];

  // オブジェクトスナップ
  objectSnapEnabled: boolean;

  // ルーラー表示
  rulerEnabled: boolean;

  // 計測モード
  measurePoints: Point[];
  measureUnit: MeasureUnit;

  // ガイドライン
  guidelines: Guideline[];
  guidesEnabled: boolean;
  snapToGuides: boolean;
}

// オブジェクトスナップのタイプ
export type ObjectSnapType = 'endpoint' | 'midpoint' | 'center' | 'intersection';

// スナップポイント
export interface SnapPoint {
  x: number;
  y: number;
  type: ObjectSnapType;
  shapeId: string;
}

// ガイドラインタイプ
export type GuidelineType = 'horizontal' | 'vertical';

// ガイドライン
export interface Guideline {
  id: string;
  type: GuidelineType;
  position: number; // x for vertical, y for horizontal
  color?: string;
  locked?: boolean;
}

export const initialDrawingState: DrawingState = {
  shapes: [],
  selectedIds: [],
  currentTool: 'select',
  isDrawing: false,
  drawingShape: null,
  vertexEditMode: false,
  editingShapeId: null,
  editingVertexIndex: null,
  zoom: 1,
  pan: { x: 0, y: 0 },
  gridEnabled: true,
  gridSize: 20,
  snapToGrid: false,
  currentStyle: DEFAULT_STYLE,
  history: [[]],
  historyIndex: 0,
  clipboard: [],
  objectSnapEnabled: false,
  rulerEnabled: true,
  measurePoints: [],
  measureUnit: 'px',
  guidelines: [],
  guidesEnabled: true,
  snapToGuides: true,
};

// ============================================
// アクション型
// ============================================

export type DrawingAction =
  // 図形操作
  | { type: 'ADD_SHAPE'; payload: Shape }
  | { type: 'UPDATE_SHAPE'; payload: { id: string; changes: Partial<Shape> } }
  | { type: 'DELETE_SHAPES'; payload: string[] }
  | { type: 'SELECT_SHAPES'; payload: string[] }
  | { type: 'ADD_TO_SELECTION'; payload: string }
  | { type: 'CLEAR_SELECTION' }
  | { type: 'SELECT_ALL' }

  // クリップボード操作
  | { type: 'COPY' }
  | { type: 'CUT' }
  | { type: 'PASTE' }
  | { type: 'DUPLICATE' }

  // Z-order操作
  | { type: 'BRING_TO_FRONT' }
  | { type: 'SEND_TO_BACK' }
  | { type: 'BRING_FORWARD' }
  | { type: 'SEND_BACKWARD' }

  // グループ化操作
  | { type: 'GROUP_SHAPES' }
  | { type: 'UNGROUP_SHAPE' }

  // 整列・配置操作
  | { type: 'ALIGN_SHAPES'; payload: AlignmentType }
  | { type: 'DISTRIBUTE_SHAPES'; payload: DistributionType }

  // ツール操作
  | { type: 'SET_TOOL'; payload: ToolType }
  | { type: 'START_DRAWING'; payload: Partial<Shape> }
  | { type: 'UPDATE_DRAWING'; payload: Partial<Shape> }
  | { type: 'FINISH_DRAWING' }
  | { type: 'CANCEL_DRAWING' }

  // キャンバス操作
  | { type: 'SET_ZOOM'; payload: number }
  | { type: 'SET_PAN'; payload: Point }
  | { type: 'TOGGLE_GRID' }
  | { type: 'SET_GRID_SIZE'; payload: number }
  | { type: 'TOGGLE_SNAP' }
  | { type: 'TOGGLE_OBJECT_SNAP' }
  | { type: 'TOGGLE_RULER' }

  // スタイル操作
  | { type: 'SET_STROKE'; payload: string }
  | { type: 'SET_STROKE_WIDTH'; payload: number }
  | { type: 'SET_FILL'; payload: string | null }
  | { type: 'SET_GRADIENT_FILL'; payload: GradientFill | null }
  | { type: 'SET_STYLE'; payload: Partial<DrawingStyle> }

  // 履歴操作
  | { type: 'UNDO' }
  | { type: 'REDO' }
  | { type: 'SAVE_HISTORY' }

  // データ操作
  | { type: 'LOAD_SHAPES'; payload: Shape[] }
  | { type: 'CLEAR_ALL' }

  // レイヤー操作
  | { type: 'TOGGLE_VISIBILITY'; payload: string }
  | { type: 'TOGGLE_LOCK'; payload: string }

  // 変形操作
  | { type: 'FLIP_HORIZONTAL' }
  | { type: 'FLIP_VERTICAL' }
  | { type: 'SCALE_SHAPES'; payload: number }

  // ズーム操作
  | { type: 'ZOOM_TO_FIT'; payload: { canvasWidth: number; canvasHeight: number } }
  | { type: 'ZOOM_TO_SELECTION'; payload: { canvasWidth: number; canvasHeight: number } }

  // 計測操作
  | { type: 'ADD_MEASURE_POINT'; payload: Point }
  | { type: 'CLEAR_MEASURE_POINTS' }
  | { type: 'SET_MEASURE_UNIT'; payload: MeasureUnit }

  // 頂点編集操作
  | { type: 'ENTER_VERTEX_EDIT_MODE'; payload: string }
  | { type: 'EXIT_VERTEX_EDIT_MODE' }
  | { type: 'SELECT_VERTEX'; payload: number | null }
  | { type: 'UPDATE_VERTEX'; payload: { shapeId: string; vertexIndex: number; position: Point } }
  | { type: 'ADD_VERTEX'; payload: { shapeId: string; afterIndex: number; position: Point } }
  | { type: 'DELETE_VERTEX'; payload: { shapeId: string; vertexIndex: number } }

  // ブーリアン演算
  | { type: 'BOOLEAN_UNION' }
  | { type: 'BOOLEAN_SUBTRACT' }
  | { type: 'BOOLEAN_INTERSECT' }
  | { type: 'BOOLEAN_EXCLUDE' }

  // ガイドライン操作
  | { type: 'ADD_GUIDELINE'; payload: Guideline }
  | { type: 'REMOVE_GUIDELINE'; payload: string }
  | { type: 'UPDATE_GUIDELINE'; payload: { id: string; changes: Partial<Guideline> } }
  | { type: 'TOGGLE_GUIDES' }
  | { type: 'TOGGLE_SNAP_TO_GUIDES' }
  | { type: 'CLEAR_GUIDELINES' };

// ブーリアン演算タイプ
export type BooleanOperationType = 'union' | 'subtract' | 'intersect' | 'exclude';

// ============================================
// ツールインターフェース
// ============================================

export interface DrawingToolHandlers {
  onMouseDown: (pos: Point, state: DrawingState) => DrawingAction[];
  onMouseMove: (pos: Point, state: DrawingState) => DrawingAction[];
  onMouseUp: (pos: Point, state: DrawingState) => DrawingAction[];
  onKeyDown?: (key: string, state: DrawingState) => DrawingAction[];
}

// ============================================
// エクスポート型
// ============================================

export type ExportFormat = 'png' | 'svg' | 'jpeg';

export interface ExportOptions {
  format: ExportFormat;
  quality?: number; // JPEG用 (0-1)
  pixelRatio?: number; // 解像度倍率
  backgroundColor?: string; // 背景色 (null = 透過)
}

// ============================================
// プリセットカラー
// ============================================

export const PRESET_COLORS = [
  '#000000', // 黒
  '#FFFFFF', // 白
  '#FF0000', // 赤
  '#00FF00', // 緑
  '#0000FF', // 青
  '#FFFF00', // 黄
  '#FF00FF', // マゼンタ
  '#00FFFF', // シアン
  '#FFA500', // オレンジ
  '#800080', // 紫
  '#FFC0CB', // ピンク
  '#A52A2A', // 茶
  '#808080', // グレー
  '#C0C0C0', // ライトグレー
];

export const STROKE_WIDTHS = [1, 2, 3, 4, 5, 8, 10, 15, 20];

// ============================================
// キーボードショートカット
// ============================================

export const SHORTCUTS: Record<string, { tool?: ToolType; action?: string }> = {
  // Phase 1
  v: { tool: 'select' },
  l: { tool: 'line' },
  c: { tool: 'circle' },
  a: { tool: 'arc' },
  r: { tool: 'rect' },
  p: { tool: 'polygon' },
  g: { action: 'toggleGrid' },
  Delete: { action: 'delete' },
  Backspace: { action: 'delete' },
  Escape: { action: 'cancel' },
  // Phase 2
  t: { tool: 'text' },
  w: { tool: 'arrow' },
  f: { tool: 'freehand' },
  d: { tool: 'dimension' },
  // Phase 3 - 変形
  h: { action: 'flipHorizontal' },
  j: { action: 'flipVertical' },
  m: { tool: 'measure' },
};
