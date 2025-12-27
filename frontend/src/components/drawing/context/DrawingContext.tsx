/**
 * Drawing Context - 描画機能の状態管理コンテキスト
 */

import React, {
  createContext,
  useContext,
  useReducer,
  useCallback,
  useMemo,
  type ReactNode,
} from 'react';
import { drawingReducer } from './DrawingReducer';
import type {
  DrawingState,
  DrawingAction,
  Shape,
  ToolType,
  Point,
  DrawingStyle,
  AlignmentType,
  DistributionType,
  ImageShape,
  MeasureUnit,
  GradientFill,
  Guideline,
  GuidelineType,
} from '../types';
import { initialDrawingState } from '../types';

// ============================================
// Context 型定義
// ============================================

interface DrawingContextValue {
  state: DrawingState;
  dispatch: React.Dispatch<DrawingAction>;

  // 便利メソッド
  addShape: (shape: Shape) => void;
  updateShape: (id: string, changes: Partial<Shape>) => void;
  deleteSelected: () => void;
  deleteShapes: (ids: string[]) => void;
  selectShapes: (ids: string[]) => void;
  clearSelection: () => void;
  selectAll: () => void;
  copy: () => void;
  cut: () => void;
  paste: () => void;
  duplicate: () => void;
  bringToFront: () => void;
  sendToBack: () => void;
  bringForward: () => void;
  sendBackward: () => void;
  groupShapes: () => void;
  ungroupShape: () => void;
  alignShapes: (alignment: AlignmentType) => void;
  distributeShapes: (direction: DistributionType) => void;
  insertImage: (src: string, width: number, height: number, x?: number, y?: number) => void;
  flipHorizontal: () => void;
  flipVertical: () => void;
  scaleShapes: (scale: number) => void;
  zoomToFit: (canvasWidth: number, canvasHeight: number) => void;
  zoomToSelection: (canvasWidth: number, canvasHeight: number) => void;

  setTool: (tool: ToolType) => void;
  startDrawing: (shape: Partial<Shape>) => void;
  updateDrawing: (shape: Partial<Shape>) => void;
  finishDrawing: () => void;
  cancelDrawing: () => void;

  setZoom: (zoom: number) => void;
  setPan: (pan: Point) => void;
  toggleGrid: () => void;
  toggleSnap: () => void;
  toggleObjectSnap: () => void;
  toggleRuler: () => void;

  setStroke: (color: string) => void;
  setStrokeWidth: (width: number) => void;
  setFill: (color: string | null) => void;
  setGradientFill: (gradient: GradientFill | null) => void;
  setStyle: (style: Partial<DrawingStyle>) => void;

  undo: () => void;
  redo: () => void;
  saveHistory: () => void;

  loadShapes: (shapes: Shape[]) => void;
  clearAll: () => void;

  // 計測操作
  addMeasurePoint: (point: Point) => void;
  clearMeasurePoints: () => void;
  setMeasureUnit: (unit: MeasureUnit) => void;

  // 頂点編集操作
  enterVertexEditMode: (shapeId: string) => void;
  exitVertexEditMode: () => void;
  selectVertex: (index: number | null) => void;
  updateVertex: (shapeId: string, vertexIndex: number, position: Point) => void;
  addVertex: (shapeId: string, afterIndex: number, position: Point) => void;
  deleteVertex: (shapeId: string, vertexIndex: number) => void;

  // ブーリアン演算
  booleanUnion: () => void;
  booleanSubtract: () => void;
  booleanIntersect: () => void;
  booleanExclude: () => void;

  // ガイドライン操作
  addGuideline: (type: GuidelineType, position: number) => void;
  removeGuideline: (id: string) => void;
  updateGuideline: (id: string, changes: Partial<Guideline>) => void;
  toggleGuides: () => void;
  toggleSnapToGuides: () => void;
  clearGuidelines: () => void;

  // 状態の便利アクセサ
  canUndo: boolean;
  canRedo: boolean;
  canPaste: boolean;
  canGroup: boolean;
  canUngroup: boolean;
  canAlign: boolean;
  canDistribute: boolean;
  canVertexEdit: boolean;
  canBooleanOperate: boolean;
  selectedShapes: Shape[];
}

// ============================================
// Context 作成
// ============================================

const DrawingContext = createContext<DrawingContextValue | null>(null);

// ============================================
// Provider コンポーネント
// ============================================

interface DrawingProviderProps {
  children: ReactNode;
  initialShapes?: Shape[];
}

export function DrawingProvider({
  children,
  initialShapes,
}: DrawingProviderProps) {
  const [state, dispatch] = useReducer(drawingReducer, {
    ...initialDrawingState,
    shapes: initialShapes ?? [],
    history: [initialShapes ?? []],
  });

  // 図形操作
  const addShape = useCallback((shape: Shape) => {
    dispatch({ type: 'ADD_SHAPE', payload: shape });
  }, []);

  const updateShape = useCallback((id: string, changes: Partial<Shape>) => {
    dispatch({ type: 'UPDATE_SHAPE', payload: { id, changes } });
  }, []);

  const deleteSelected = useCallback(() => {
    if (state.selectedIds.length > 0) {
      dispatch({ type: 'DELETE_SHAPES', payload: state.selectedIds });
      dispatch({ type: 'SAVE_HISTORY' });
    }
  }, [state.selectedIds]);

  const deleteShapes = useCallback((ids: string[]) => {
    if (ids.length > 0) {
      dispatch({ type: 'DELETE_SHAPES', payload: ids });
      dispatch({ type: 'SAVE_HISTORY' });
    }
  }, []);

  const selectShapes = useCallback((ids: string[]) => {
    dispatch({ type: 'SELECT_SHAPES', payload: ids });
  }, []);

  const clearSelection = useCallback(() => {
    dispatch({ type: 'CLEAR_SELECTION' });
  }, []);

  const selectAll = useCallback(() => {
    dispatch({ type: 'SELECT_ALL' });
  }, []);

  // クリップボード操作
  const copy = useCallback(() => {
    dispatch({ type: 'COPY' });
  }, []);

  const cut = useCallback(() => {
    dispatch({ type: 'CUT' });
    dispatch({ type: 'SAVE_HISTORY' });
  }, []);

  const paste = useCallback(() => {
    dispatch({ type: 'PASTE' });
    dispatch({ type: 'SAVE_HISTORY' });
  }, []);

  const duplicate = useCallback(() => {
    dispatch({ type: 'DUPLICATE' });
    dispatch({ type: 'SAVE_HISTORY' });
  }, []);

  // Z-order操作
  const bringToFront = useCallback(() => {
    dispatch({ type: 'BRING_TO_FRONT' });
    dispatch({ type: 'SAVE_HISTORY' });
  }, []);

  const sendToBack = useCallback(() => {
    dispatch({ type: 'SEND_TO_BACK' });
    dispatch({ type: 'SAVE_HISTORY' });
  }, []);

  const bringForward = useCallback(() => {
    dispatch({ type: 'BRING_FORWARD' });
    dispatch({ type: 'SAVE_HISTORY' });
  }, []);

  const sendBackward = useCallback(() => {
    dispatch({ type: 'SEND_BACKWARD' });
    dispatch({ type: 'SAVE_HISTORY' });
  }, []);

  // グループ化操作
  const groupShapes = useCallback(() => {
    dispatch({ type: 'GROUP_SHAPES' });
    dispatch({ type: 'SAVE_HISTORY' });
  }, []);

  const ungroupShape = useCallback(() => {
    dispatch({ type: 'UNGROUP_SHAPE' });
    dispatch({ type: 'SAVE_HISTORY' });
  }, []);

  // 整列・配置操作
  const alignShapes = useCallback((alignment: AlignmentType) => {
    dispatch({ type: 'ALIGN_SHAPES', payload: alignment });
    dispatch({ type: 'SAVE_HISTORY' });
  }, []);

  const distributeShapes = useCallback((direction: DistributionType) => {
    dispatch({ type: 'DISTRIBUTE_SHAPES', payload: direction });
    dispatch({ type: 'SAVE_HISTORY' });
  }, []);

  // 変形操作
  const flipHorizontal = useCallback(() => {
    dispatch({ type: 'FLIP_HORIZONTAL' });
    dispatch({ type: 'SAVE_HISTORY' });
  }, []);

  const flipVertical = useCallback(() => {
    dispatch({ type: 'FLIP_VERTICAL' });
    dispatch({ type: 'SAVE_HISTORY' });
  }, []);

  const scaleShapes = useCallback((scale: number) => {
    dispatch({ type: 'SCALE_SHAPES', payload: scale });
    dispatch({ type: 'SAVE_HISTORY' });
  }, []);

  const zoomToFit = useCallback((canvasWidth: number, canvasHeight: number) => {
    dispatch({ type: 'ZOOM_TO_FIT', payload: { canvasWidth, canvasHeight } });
  }, []);

  const zoomToSelection = useCallback((canvasWidth: number, canvasHeight: number) => {
    dispatch({ type: 'ZOOM_TO_SELECTION', payload: { canvasWidth, canvasHeight } });
  }, []);

  // 画像挿入
  const insertImage = useCallback((src: string, width: number, height: number, x?: number, y?: number) => {
    const imageShape: ImageShape = {
      id: `image-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type: 'image',
      src,
      x: x ?? 100,
      y: y ?? 100,
      width,
      height,
      originalWidth: width,
      originalHeight: height,
      aspectRatio: width / height,
      rotation: 0,
      stroke: '#000000',
      strokeWidth: 0,
      lineStyle: 'solid',
      opacity: 1,
      locked: false,
      visible: true,
    };
    dispatch({ type: 'ADD_SHAPE', payload: imageShape });
    dispatch({ type: 'SAVE_HISTORY' });
    dispatch({ type: 'SELECT_SHAPES', payload: [imageShape.id] });
  }, []);

  // ツール操作
  const setTool = useCallback((tool: ToolType) => {
    dispatch({ type: 'SET_TOOL', payload: tool });
  }, []);

  const startDrawing = useCallback((shape: Partial<Shape>) => {
    dispatch({ type: 'START_DRAWING', payload: shape });
  }, []);

  const updateDrawing = useCallback((shape: Partial<Shape>) => {
    dispatch({ type: 'UPDATE_DRAWING', payload: shape });
  }, []);

  const finishDrawing = useCallback(() => {
    dispatch({ type: 'FINISH_DRAWING' });
    dispatch({ type: 'SAVE_HISTORY' });
  }, []);

  const cancelDrawing = useCallback(() => {
    dispatch({ type: 'CANCEL_DRAWING' });
  }, []);

  // キャンバス操作
  const setZoom = useCallback((zoom: number) => {
    dispatch({ type: 'SET_ZOOM', payload: zoom });
  }, []);

  const setPan = useCallback((pan: Point) => {
    dispatch({ type: 'SET_PAN', payload: pan });
  }, []);

  const toggleGrid = useCallback(() => {
    dispatch({ type: 'TOGGLE_GRID' });
  }, []);

  const toggleSnap = useCallback(() => {
    dispatch({ type: 'TOGGLE_SNAP' });
  }, []);

  const toggleObjectSnap = useCallback(() => {
    dispatch({ type: 'TOGGLE_OBJECT_SNAP' });
  }, []);

  const toggleRuler = useCallback(() => {
    dispatch({ type: 'TOGGLE_RULER' });
  }, []);

  // スタイル操作
  const setStroke = useCallback((color: string) => {
    dispatch({ type: 'SET_STROKE', payload: color });
  }, []);

  const setStrokeWidth = useCallback((width: number) => {
    dispatch({ type: 'SET_STROKE_WIDTH', payload: width });
  }, []);

  const setFill = useCallback((color: string | null) => {
    dispatch({ type: 'SET_FILL', payload: color });
  }, []);

  const setGradientFill = useCallback((gradient: GradientFill | null) => {
    dispatch({ type: 'SET_GRADIENT_FILL', payload: gradient });
  }, []);

  const setStyle = useCallback((style: Partial<DrawingStyle>) => {
    dispatch({ type: 'SET_STYLE', payload: style });
  }, []);

  // 履歴操作
  const undo = useCallback(() => {
    dispatch({ type: 'UNDO' });
  }, []);

  const redo = useCallback(() => {
    dispatch({ type: 'REDO' });
  }, []);

  const saveHistory = useCallback(() => {
    dispatch({ type: 'SAVE_HISTORY' });
  }, []);

  // データ操作
  const loadShapes = useCallback((shapes: Shape[]) => {
    dispatch({ type: 'LOAD_SHAPES', payload: shapes });
  }, []);

  const clearAll = useCallback(() => {
    dispatch({ type: 'CLEAR_ALL' });
    dispatch({ type: 'SAVE_HISTORY' });
  }, []);

  // 計測操作
  const addMeasurePoint = useCallback((point: Point) => {
    dispatch({ type: 'ADD_MEASURE_POINT', payload: point });
  }, []);

  const clearMeasurePoints = useCallback(() => {
    dispatch({ type: 'CLEAR_MEASURE_POINTS' });
  }, []);

  const setMeasureUnit = useCallback((unit: MeasureUnit) => {
    dispatch({ type: 'SET_MEASURE_UNIT', payload: unit });
  }, []);

  // 頂点編集操作
  const enterVertexEditMode = useCallback((shapeId: string) => {
    dispatch({ type: 'ENTER_VERTEX_EDIT_MODE', payload: shapeId });
  }, []);

  const exitVertexEditMode = useCallback(() => {
    dispatch({ type: 'EXIT_VERTEX_EDIT_MODE' });
  }, []);

  const selectVertex = useCallback((index: number | null) => {
    dispatch({ type: 'SELECT_VERTEX', payload: index });
  }, []);

  const updateVertex = useCallback((shapeId: string, vertexIndex: number, position: Point) => {
    dispatch({ type: 'UPDATE_VERTEX', payload: { shapeId, vertexIndex, position } });
  }, []);

  const addVertex = useCallback((shapeId: string, afterIndex: number, position: Point) => {
    dispatch({ type: 'ADD_VERTEX', payload: { shapeId, afterIndex, position } });
    dispatch({ type: 'SAVE_HISTORY' });
  }, []);

  const deleteVertex = useCallback((shapeId: string, vertexIndex: number) => {
    dispatch({ type: 'DELETE_VERTEX', payload: { shapeId, vertexIndex } });
    dispatch({ type: 'SAVE_HISTORY' });
  }, []);

  // ブーリアン演算
  const booleanUnion = useCallback(() => {
    dispatch({ type: 'BOOLEAN_UNION' });
    dispatch({ type: 'SAVE_HISTORY' });
  }, []);

  const booleanSubtract = useCallback(() => {
    dispatch({ type: 'BOOLEAN_SUBTRACT' });
    dispatch({ type: 'SAVE_HISTORY' });
  }, []);

  const booleanIntersect = useCallback(() => {
    dispatch({ type: 'BOOLEAN_INTERSECT' });
    dispatch({ type: 'SAVE_HISTORY' });
  }, []);

  const booleanExclude = useCallback(() => {
    dispatch({ type: 'BOOLEAN_EXCLUDE' });
    dispatch({ type: 'SAVE_HISTORY' });
  }, []);

  // ガイドライン操作
  const addGuideline = useCallback((type: GuidelineType, position: number) => {
    const guideline: Guideline = {
      id: crypto.randomUUID(),
      type,
      position,
      color: type === 'horizontal' ? '#10b981' : '#3b82f6', // 緑と青
    };
    dispatch({ type: 'ADD_GUIDELINE', payload: guideline });
  }, []);

  const removeGuideline = useCallback((id: string) => {
    dispatch({ type: 'REMOVE_GUIDELINE', payload: id });
  }, []);

  const updateGuideline = useCallback((id: string, changes: Partial<Guideline>) => {
    dispatch({ type: 'UPDATE_GUIDELINE', payload: { id, changes } });
  }, []);

  const toggleGuides = useCallback(() => {
    dispatch({ type: 'TOGGLE_GUIDES' });
  }, []);

  const toggleSnapToGuides = useCallback(() => {
    dispatch({ type: 'TOGGLE_SNAP_TO_GUIDES' });
  }, []);

  const clearGuidelines = useCallback(() => {
    dispatch({ type: 'CLEAR_GUIDELINES' });
  }, []);

  // 計算値
  const canUndo = state.historyIndex > 0;
  const canRedo = state.historyIndex < state.history.length - 1;
  const canPaste = state.clipboard.length > 0;
  const canGroup = state.selectedIds.length >= 2;
  const canUngroup = state.selectedIds.length === 1 &&
    state.shapes.find((s) => s.id === state.selectedIds[0])?.type === 'group';
  const canAlign = state.selectedIds.length >= 2;
  const canDistribute = state.selectedIds.length >= 3;
  const canVertexEdit = state.selectedIds.length === 1 &&
    ['polygon', 'freehand', 'line', 'arrow'].includes(
      state.shapes.find((s) => s.id === state.selectedIds[0])?.type ?? ''
    );
  const canBooleanOperate = state.selectedIds.length >= 2 &&
    state.selectedIds.filter((id) => {
      const shape = state.shapes.find((s) => s.id === id);
      return shape && ['rect', 'circle', 'polygon'].includes(shape.type);
    }).length >= 2;
  const selectedShapes = useMemo(
    () => state.shapes.filter((s) => state.selectedIds.includes(s.id)),
    [state.shapes, state.selectedIds]
  );

  const value = useMemo<DrawingContextValue>(
    () => ({
      state,
      dispatch,
      addShape,
      updateShape,
      deleteSelected,
      deleteShapes,
      selectShapes,
      clearSelection,
      selectAll,
      copy,
      cut,
      paste,
      duplicate,
      bringToFront,
      sendToBack,
      bringForward,
      sendBackward,
      groupShapes,
      ungroupShape,
      alignShapes,
      distributeShapes,
      insertImage,
      flipHorizontal,
      flipVertical,
      scaleShapes,
      zoomToFit,
      zoomToSelection,
      setTool,
      startDrawing,
      updateDrawing,
      finishDrawing,
      cancelDrawing,
      setZoom,
      setPan,
      toggleGrid,
      toggleSnap,
      toggleObjectSnap,
      toggleRuler,
      setStroke,
      setStrokeWidth,
      setFill,
      setGradientFill,
      setStyle,
      undo,
      redo,
      saveHistory,
      loadShapes,
      clearAll,
      addMeasurePoint,
      clearMeasurePoints,
      setMeasureUnit,
      enterVertexEditMode,
      exitVertexEditMode,
      selectVertex,
      updateVertex,
      addVertex,
      deleteVertex,
      booleanUnion,
      booleanSubtract,
      booleanIntersect,
      booleanExclude,
      addGuideline,
      removeGuideline,
      updateGuideline,
      toggleGuides,
      toggleSnapToGuides,
      clearGuidelines,
      canUndo,
      canRedo,
      canPaste,
      canGroup,
      canUngroup,
      canAlign,
      canDistribute,
      canVertexEdit,
      canBooleanOperate,
      selectedShapes,
    }),
    [
      state,
      addShape,
      updateShape,
      deleteSelected,
      deleteShapes,
      selectShapes,
      clearSelection,
      selectAll,
      copy,
      cut,
      paste,
      duplicate,
      bringToFront,
      sendToBack,
      bringForward,
      sendBackward,
      groupShapes,
      ungroupShape,
      alignShapes,
      distributeShapes,
      insertImage,
      flipHorizontal,
      flipVertical,
      scaleShapes,
      zoomToFit,
      zoomToSelection,
      setTool,
      startDrawing,
      updateDrawing,
      finishDrawing,
      cancelDrawing,
      setZoom,
      setPan,
      toggleGrid,
      toggleSnap,
      toggleObjectSnap,
      toggleRuler,
      setStroke,
      setStrokeWidth,
      setFill,
      setGradientFill,
      setStyle,
      undo,
      redo,
      saveHistory,
      loadShapes,
      clearAll,
      addMeasurePoint,
      clearMeasurePoints,
      setMeasureUnit,
      enterVertexEditMode,
      exitVertexEditMode,
      selectVertex,
      updateVertex,
      addVertex,
      deleteVertex,
      booleanUnion,
      booleanSubtract,
      booleanIntersect,
      booleanExclude,
      addGuideline,
      removeGuideline,
      updateGuideline,
      toggleGuides,
      toggleSnapToGuides,
      clearGuidelines,
      canUndo,
      canRedo,
      canPaste,
      canGroup,
      canUngroup,
      canAlign,
      canDistribute,
      canVertexEdit,
      canBooleanOperate,
      selectedShapes,
    ]
  );

  return (
    <DrawingContext.Provider value={value}>{children}</DrawingContext.Provider>
  );
}

// ============================================
// Hook
// ============================================

export function useDrawing(): DrawingContextValue {
  const context = useContext(DrawingContext);
  if (!context) {
    throw new Error('useDrawing must be used within a DrawingProvider');
  }
  return context;
}
