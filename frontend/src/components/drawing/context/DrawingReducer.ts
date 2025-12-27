/**
 * Drawing Reducer - 描画状態管理
 */

import { v4 as uuidv4 } from 'uuid';
import type { DrawingState, DrawingAction, Shape, GroupShape } from '../types';
import { performBooleanOperation, canBooleanOperate } from '../utils/booleanOperations';

/**
 * 履歴の最大保持数
 */
const MAX_HISTORY_LENGTH = 50;

/**
 * 図形のバウンディングボックスを計算
 */
function getShapeBounds(shape: Shape): { x: number; y: number; width: number; height: number } {
  switch (shape.type) {
    case 'line':
    case 'arrow':
    case 'dimension': {
      const [x1, y1, x2, y2] = shape.points;
      const minX = Math.min(x1, x2);
      const minY = Math.min(y1, y2);
      const maxX = Math.max(x1, x2);
      const maxY = Math.max(y1, y2);
      return {
        x: shape.x + minX,
        y: shape.y + minY,
        width: maxX - minX,
        height: maxY - minY,
      };
    }
    case 'circle':
      return {
        x: shape.x - shape.radius,
        y: shape.y - shape.radius,
        width: shape.radius * 2,
        height: shape.radius * 2,
      };
    case 'arc':
      return {
        x: shape.x - shape.radius,
        y: shape.y - shape.radius,
        width: shape.radius * 2,
        height: shape.radius * 2,
      };
    case 'rect':
    case 'image':
      return {
        x: shape.x,
        y: shape.y,
        width: shape.width,
        height: shape.height,
      };
    case 'polygon':
    case 'freehand': {
      if (shape.points.length < 2) {
        return { x: shape.x, y: shape.y, width: 0, height: 0 };
      }
      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
      for (let i = 0; i < shape.points.length; i += 2) {
        minX = Math.min(minX, shape.points[i]);
        maxX = Math.max(maxX, shape.points[i]);
        minY = Math.min(minY, shape.points[i + 1]);
        maxY = Math.max(maxY, shape.points[i + 1]);
      }
      return {
        x: shape.x + minX,
        y: shape.y + minY,
        width: maxX - minX,
        height: maxY - minY,
      };
    }
    case 'text':
      // テキストの場合は概算（フォントサイズに基づく）
      return {
        x: shape.x,
        y: shape.y,
        width: shape.text.length * shape.fontSize * 0.6,
        height: shape.fontSize,
      };
    case 'group':
      return {
        x: shape.x,
        y: shape.y,
        width: shape.width,
        height: shape.height,
      };
    default: {
      // 未知の図形タイプのフォールバック
      const unknownShape = shape as { x?: number; y?: number };
      return { x: unknownShape.x ?? 0, y: unknownShape.y ?? 0, width: 0, height: 0 };
    }
  }
}

/**
 * 図形を作成（IDを付与）
 */
export function createShape(partial: Partial<Shape>): Shape {
  return {
    id: uuidv4(),
    x: 0,
    y: 0,
    rotation: 0,
    stroke: '#000000',
    strokeWidth: 2,
    lineStyle: 'solid',
    opacity: 1,
    locked: false,
    visible: true,
    ...partial,
  } as Shape;
}

/**
 * 図形を中心点を基準にスケール（グループの子図形も再帰的にスケール）
 */
function scaleShapeAroundCenter(shape: Shape, centerX: number, centerY: number, scale: number): Shape {
  const bounds = getShapeBounds(shape);
  const shapeCenterX = bounds.x + bounds.width / 2;
  const shapeCenterY = bounds.y + bounds.height / 2;

  // 中心からの距離もスケール
  const newCenterX = centerX + (shapeCenterX - centerX) * scale;
  const newCenterY = centerY + (shapeCenterY - centerY) * scale;

  switch (shape.type) {
    case 'circle':
      return {
        ...shape,
        x: newCenterX,
        y: newCenterY,
        radius: shape.radius * scale,
      };
    case 'arc':
      return {
        ...shape,
        x: newCenterX,
        y: newCenterY,
        radius: shape.radius * scale,
      };
    case 'rect':
    case 'image': {
      const newWidth = shape.width * scale;
      const newHeight = shape.height * scale;
      return {
        ...shape,
        x: newCenterX - newWidth / 2,
        y: newCenterY - newHeight / 2,
        width: newWidth,
        height: newHeight,
      };
    }
    case 'line':
    case 'arrow':
    case 'dimension': {
      const [x1, y1, x2, y2] = shape.points;
      return {
        ...shape,
        x: newCenterX - ((x2 - x1) * scale) / 2,
        y: newCenterY - ((y2 - y1) * scale) / 2,
        points: [0, 0, (x2 - x1) * scale, (y2 - y1) * scale] as [number, number, number, number],
      };
    }
    case 'polygon':
    case 'freehand': {
      const scaledPoints = shape.points.map((p) => p * scale);
      // ポイントの中心を計算して再配置
      let pMinX = Infinity, pMaxX = -Infinity;
      let pMinY = Infinity, pMaxY = -Infinity;
      for (let i = 0; i < scaledPoints.length; i += 2) {
        pMinX = Math.min(pMinX, scaledPoints[i]);
        pMaxX = Math.max(pMaxX, scaledPoints[i]);
        pMinY = Math.min(pMinY, scaledPoints[i + 1]);
        pMaxY = Math.max(pMaxY, scaledPoints[i + 1]);
      }
      const pCenterX = (pMinX + pMaxX) / 2;
      const pCenterY = (pMinY + pMaxY) / 2;
      return {
        ...shape,
        x: newCenterX - pCenterX,
        y: newCenterY - pCenterY,
        points: scaledPoints,
      };
    }
    case 'text':
      return {
        ...shape,
        x: newCenterX - (bounds.width * scale) / 2,
        y: newCenterY - (bounds.height * scale) / 2,
        fontSize: shape.fontSize * scale,
      };
    case 'group': {
      const newWidth = shape.width * scale;
      const newHeight = shape.height * scale;
      const newX = newCenterX - newWidth / 2;
      const newY = newCenterY - newHeight / 2;

      // 子図形も再帰的にスケール（グループの中心を基準に）
      const scaledChildren = shape.children.map((child) => {
        // 子図形の位置をグループのローカル座標からワールド座標に変換
        const childWorldX = shape.x + child.x;
        const childWorldY = shape.y + child.y;

        // グループの古い中心
        const oldGroupCenterX = shape.x + shape.width / 2;
        const oldGroupCenterY = shape.y + shape.height / 2;

        // 子図形をグループの古い中心を基準にスケール
        const scaledChild = scaleShapeAroundCenter(
          { ...child, x: childWorldX, y: childWorldY },
          oldGroupCenterX,
          oldGroupCenterY,
          scale
        );

        // スケール後の位置を新しいグループのローカル座標に変換
        return {
          ...scaledChild,
          x: scaledChild.x - newX,
          y: scaledChild.y - newY,
        };
      });

      return {
        ...shape,
        x: newX,
        y: newY,
        width: newWidth,
        height: newHeight,
        children: scaledChildren,
      };
    }
    default:
      return shape;
  }
}

/**
 * Drawing Reducer
 */
export function drawingReducer(
  state: DrawingState,
  action: DrawingAction
): DrawingState {
  switch (action.type) {
    // ============================================
    // 図形操作
    // ============================================

    case 'ADD_SHAPE': {
      const newShapes = [...state.shapes, action.payload];
      return {
        ...state,
        shapes: newShapes,
      };
    }

    case 'UPDATE_SHAPE': {
      const { id, changes } = action.payload;
      return {
        ...state,
        shapes: state.shapes.map((shape) =>
          shape.id === id ? ({ ...shape, ...changes } as Shape) : shape
        ),
      };
    }

    case 'DELETE_SHAPES': {
      const idsToDelete = new Set(action.payload);
      return {
        ...state,
        shapes: state.shapes.filter((shape) => !idsToDelete.has(shape.id)),
        selectedIds: state.selectedIds.filter((id) => !idsToDelete.has(id)),
      };
    }

    case 'SELECT_SHAPES': {
      return {
        ...state,
        selectedIds: action.payload,
      };
    }

    case 'ADD_TO_SELECTION': {
      if (state.selectedIds.includes(action.payload)) {
        return state;
      }
      return {
        ...state,
        selectedIds: [...state.selectedIds, action.payload],
      };
    }

    case 'CLEAR_SELECTION': {
      return {
        ...state,
        selectedIds: [],
      };
    }

    case 'SELECT_ALL': {
      return {
        ...state,
        selectedIds: state.shapes.map((shape) => shape.id),
      };
    }

    // ============================================
    // クリップボード操作
    // ============================================

    case 'COPY': {
      if (state.selectedIds.length === 0) return state;
      const selectedShapes = state.shapes.filter((shape) =>
        state.selectedIds.includes(shape.id)
      );
      return {
        ...state,
        clipboard: selectedShapes.map((shape) => ({ ...shape })),
      };
    }

    case 'CUT': {
      if (state.selectedIds.length === 0) return state;
      const selectedShapes = state.shapes.filter((shape) =>
        state.selectedIds.includes(shape.id)
      );
      const idsToDelete = new Set(state.selectedIds);
      return {
        ...state,
        clipboard: selectedShapes.map((shape) => ({ ...shape })),
        shapes: state.shapes.filter((shape) => !idsToDelete.has(shape.id)),
        selectedIds: [],
      };
    }

    case 'PASTE': {
      if (state.clipboard.length === 0) return state;
      // 新しいIDを付与し、少しオフセットして配置
      const pastedShapes = state.clipboard.map((shape) => {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { id: _oldId, ...shapeWithoutId } = shape;
        return {
          ...createShape(shapeWithoutId),
          x: shape.x + 20,
          y: shape.y + 20,
        };
      });
      const newIds = pastedShapes.map((shape) => shape.id);
      return {
        ...state,
        shapes: [...state.shapes, ...pastedShapes],
        selectedIds: newIds,
        // クリップボードも更新（次回ペースト用にオフセット）
        clipboard: pastedShapes.map((shape) => ({ ...shape })),
      };
    }

    case 'DUPLICATE': {
      if (state.selectedIds.length === 0) return state;
      // 選択中の図形を複製して少しオフセット
      const selectedSet = new Set(state.selectedIds);
      const duplicatedShapes = state.shapes
        .filter((s) => selectedSet.has(s.id))
        .map((shape) => {
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          const { id: _oldId, ...shapeWithoutId } = shape;
          return {
            ...createShape(shapeWithoutId),
            x: shape.x + 20,
            y: shape.y + 20,
          };
        });
      const newIds = duplicatedShapes.map((shape) => shape.id);
      return {
        ...state,
        shapes: [...state.shapes, ...duplicatedShapes],
        selectedIds: newIds,
      };
    }

    // ============================================
    // Z-order操作
    // ============================================

    case 'BRING_TO_FRONT': {
      if (state.selectedIds.length === 0) return state;
      const selectedSet = new Set(state.selectedIds);
      const selected = state.shapes.filter((s) => selectedSet.has(s.id));
      const others = state.shapes.filter((s) => !selectedSet.has(s.id));
      return {
        ...state,
        shapes: [...others, ...selected],
      };
    }

    case 'SEND_TO_BACK': {
      if (state.selectedIds.length === 0) return state;
      const selectedSet = new Set(state.selectedIds);
      const selected = state.shapes.filter((s) => selectedSet.has(s.id));
      const others = state.shapes.filter((s) => !selectedSet.has(s.id));
      return {
        ...state,
        shapes: [...selected, ...others],
      };
    }

    case 'BRING_FORWARD': {
      if (state.selectedIds.length === 0) return state;
      const shapes = [...state.shapes];
      const selectedSet = new Set(state.selectedIds);
      // 後ろから前に向かって処理（インデックスがずれないように）
      for (let i = shapes.length - 2; i >= 0; i--) {
        if (selectedSet.has(shapes[i].id) && !selectedSet.has(shapes[i + 1].id)) {
          // 選択されている図形を1つ前に移動
          [shapes[i], shapes[i + 1]] = [shapes[i + 1], shapes[i]];
        }
      }
      return {
        ...state,
        shapes,
      };
    }

    case 'SEND_BACKWARD': {
      if (state.selectedIds.length === 0) return state;
      const shapes = [...state.shapes];
      const selectedSet = new Set(state.selectedIds);
      // 前から後ろに向かって処理（インデックスがずれないように）
      for (let i = 1; i < shapes.length; i++) {
        if (selectedSet.has(shapes[i].id) && !selectedSet.has(shapes[i - 1].id)) {
          // 選択されている図形を1つ後ろに移動
          [shapes[i], shapes[i - 1]] = [shapes[i - 1], shapes[i]];
        }
      }
      return {
        ...state,
        shapes,
      };
    }

    // ============================================
    // グループ化操作
    // ============================================

    case 'GROUP_SHAPES': {
      if (state.selectedIds.length < 2) return state;

      // 選択された図形を取得
      const selectedSet = new Set(state.selectedIds);
      const selectedShapes = state.shapes.filter((s) => selectedSet.has(s.id));

      // バウンディングボックスを計算
      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
      for (const shape of selectedShapes) {
        const bounds = getShapeBounds(shape);
        minX = Math.min(minX, bounds.x);
        minY = Math.min(minY, bounds.y);
        maxX = Math.max(maxX, bounds.x + bounds.width);
        maxY = Math.max(maxY, bounds.y + bounds.height);
      }

      // 子図形の座標をグループ相対に変換
      const children = selectedShapes.map((shape) => ({
        ...shape,
        x: shape.x - minX,
        y: shape.y - minY,
      }));

      // グループ図形を作成
      const groupShape: GroupShape = {
        id: uuidv4(),
        type: 'group',
        x: minX,
        y: minY,
        width: maxX - minX,
        height: maxY - minY,
        rotation: 0,
        stroke: '#000000',
        strokeWidth: 2,
        lineStyle: 'solid',
        opacity: 1,
        locked: false,
        visible: true,
        children,
      };

      // 選択された図形を削除し、グループを追加
      const remainingShapes = state.shapes.filter((s) => !selectedSet.has(s.id));

      return {
        ...state,
        shapes: [...remainingShapes, groupShape],
        selectedIds: [groupShape.id],
      };
    }

    case 'UNGROUP_SHAPE': {
      if (state.selectedIds.length !== 1) return state;

      const selectedId = state.selectedIds[0];
      const groupShape = state.shapes.find((s) => s.id === selectedId);

      if (!groupShape || groupShape.type !== 'group') return state;

      // 子図形の座標をキャンバス絶対座標に変換
      const children = (groupShape as GroupShape).children.map((child) => ({
        ...child,
        id: uuidv4(), // 新しいIDを付与
        x: child.x + groupShape.x,
        y: child.y + groupShape.y,
      }));

      // グループを削除し、子図形を追加
      const remainingShapes = state.shapes.filter((s) => s.id !== selectedId);
      const childIds = children.map((c) => c.id);

      return {
        ...state,
        shapes: [...remainingShapes, ...children],
        selectedIds: childIds,
      };
    }

    // ============================================
    // 整列・配置操作
    // ============================================

    case 'ALIGN_SHAPES': {
      if (state.selectedIds.length < 2) return state;

      const selectedSet = new Set(state.selectedIds);
      const selectedShapes = state.shapes.filter((s) => selectedSet.has(s.id));
      const alignment = action.payload;

      // 全選択図形のバウンディングボックスを計算
      let minX = Infinity, maxX = -Infinity;
      let minY = Infinity, maxY = -Infinity;

      const shapeBounds = selectedShapes.map((shape) => {
        const bounds = getShapeBounds(shape);
        minX = Math.min(minX, bounds.x);
        maxX = Math.max(maxX, bounds.x + bounds.width);
        minY = Math.min(minY, bounds.y);
        maxY = Math.max(maxY, bounds.y + bounds.height);
        return { shape, bounds };
      });

      const centerX = (minX + maxX) / 2;
      const centerY = (minY + maxY) / 2;

      // 各図形の新しい位置を計算
      const updatedShapes = state.shapes.map((shape) => {
        if (!selectedSet.has(shape.id)) return shape;

        const { bounds } = shapeBounds.find((sb) => sb.shape.id === shape.id)!;
        let newX = shape.x;
        let newY = shape.y;

        switch (alignment) {
          case 'left':
            newX = shape.x + (minX - bounds.x);
            break;
          case 'center':
            newX = shape.x + (centerX - (bounds.x + bounds.width / 2));
            break;
          case 'right':
            newX = shape.x + (maxX - (bounds.x + bounds.width));
            break;
          case 'top':
            newY = shape.y + (minY - bounds.y);
            break;
          case 'middle':
            newY = shape.y + (centerY - (bounds.y + bounds.height / 2));
            break;
          case 'bottom':
            newY = shape.y + (maxY - (bounds.y + bounds.height));
            break;
        }

        return { ...shape, x: newX, y: newY } as Shape;
      });

      return {
        ...state,
        shapes: updatedShapes,
      };
    }

    case 'DISTRIBUTE_SHAPES': {
      if (state.selectedIds.length < 3) return state;

      const selectedSet = new Set(state.selectedIds);
      const selectedShapes = state.shapes.filter((s) => selectedSet.has(s.id));
      const direction = action.payload;

      // 各図形のバウンディングボックスを計算
      const shapeBounds = selectedShapes.map((shape) => ({
        shape,
        bounds: getShapeBounds(shape),
      }));

      // 方向に応じてソート
      if (direction === 'horizontal') {
        shapeBounds.sort((a, b) => a.bounds.x - b.bounds.x);
      } else {
        shapeBounds.sort((a, b) => a.bounds.y - b.bounds.y);
      }

      // 最初と最後の図形の位置から等間隔を計算
      const first = shapeBounds[0];
      const last = shapeBounds[shapeBounds.length - 1];

      let totalGap: number;
      let positions: number[];

      if (direction === 'horizontal') {
        const startCenter = first.bounds.x + first.bounds.width / 2;
        const endCenter = last.bounds.x + last.bounds.width / 2;
        totalGap = endCenter - startCenter;
        const step = totalGap / (shapeBounds.length - 1);
        positions = shapeBounds.map((_, i) => startCenter + step * i);
      } else {
        const startCenter = first.bounds.y + first.bounds.height / 2;
        const endCenter = last.bounds.y + last.bounds.height / 2;
        totalGap = endCenter - startCenter;
        const step = totalGap / (shapeBounds.length - 1);
        positions = shapeBounds.map((_, i) => startCenter + step * i);
      }

      // 各図形の新しい位置を計算
      const shapePositionMap = new Map<string, number>();
      shapeBounds.forEach((sb, i) => {
        shapePositionMap.set(sb.shape.id, positions[i]);
      });

      const updatedShapes = state.shapes.map((shape) => {
        if (!selectedSet.has(shape.id)) return shape;

        const sb = shapeBounds.find((s) => s.shape.id === shape.id)!;
        const targetPosition = shapePositionMap.get(shape.id)!;

        if (direction === 'horizontal') {
          const currentCenter = sb.bounds.x + sb.bounds.width / 2;
          const newX = shape.x + (targetPosition - currentCenter);
          return { ...shape, x: newX } as Shape;
        } else {
          const currentCenter = sb.bounds.y + sb.bounds.height / 2;
          const newY = shape.y + (targetPosition - currentCenter);
          return { ...shape, y: newY } as Shape;
        }
      });

      return {
        ...state,
        shapes: updatedShapes,
      };
    }

    // ============================================
    // ツール操作
    // ============================================

    case 'SET_TOOL': {
      return {
        ...state,
        currentTool: action.payload,
        isDrawing: false,
        drawingShape: null,
      };
    }

    case 'START_DRAWING': {
      return {
        ...state,
        isDrawing: true,
        drawingShape: action.payload,
      };
    }

    case 'UPDATE_DRAWING': {
      if (!state.drawingShape) return state;
      return {
        ...state,
        drawingShape: {
          ...state.drawingShape,
          ...action.payload,
        } as Partial<Shape>,
      };
    }

    case 'FINISH_DRAWING': {
      if (!state.drawingShape) return state;
      const newShape = createShape({
        ...state.drawingShape,
        stroke: state.currentStyle.stroke,
        strokeWidth: state.currentStyle.strokeWidth,
        fill: state.currentStyle.fill ?? undefined,
        gradientFill: state.currentStyle.gradientFill ?? undefined,
        lineStyle: state.currentStyle.lineStyle,
      });
      return {
        ...state,
        shapes: [...state.shapes, newShape],
        isDrawing: false,
        drawingShape: null,
        selectedIds: [newShape.id],
      };
    }

    case 'CANCEL_DRAWING': {
      return {
        ...state,
        isDrawing: false,
        drawingShape: null,
      };
    }

    // ============================================
    // キャンバス操作
    // ============================================

    case 'SET_ZOOM': {
      const zoom = Math.max(0.1, Math.min(10, action.payload));
      return {
        ...state,
        zoom,
      };
    }

    case 'SET_PAN': {
      return {
        ...state,
        pan: action.payload,
      };
    }

    case 'TOGGLE_GRID': {
      return {
        ...state,
        gridEnabled: !state.gridEnabled,
      };
    }

    case 'SET_GRID_SIZE': {
      return {
        ...state,
        gridSize: Math.max(5, Math.min(100, action.payload)),
      };
    }

    case 'TOGGLE_SNAP': {
      return {
        ...state,
        snapToGrid: !state.snapToGrid,
      };
    }

    case 'TOGGLE_OBJECT_SNAP': {
      return {
        ...state,
        objectSnapEnabled: !state.objectSnapEnabled,
      };
    }

    case 'TOGGLE_RULER': {
      return {
        ...state,
        rulerEnabled: !state.rulerEnabled,
      };
    }

    // ============================================
    // スタイル操作
    // ============================================

    case 'SET_STROKE': {
      return {
        ...state,
        currentStyle: {
          ...state.currentStyle,
          stroke: action.payload,
        },
      };
    }

    case 'SET_STROKE_WIDTH': {
      return {
        ...state,
        currentStyle: {
          ...state.currentStyle,
          strokeWidth: action.payload,
        },
      };
    }

    case 'SET_FILL': {
      return {
        ...state,
        currentStyle: {
          ...state.currentStyle,
          fill: action.payload,
          // fillを設定したらgradientFillをクリア
          gradientFill: null,
        },
      };
    }

    case 'SET_GRADIENT_FILL': {
      return {
        ...state,
        currentStyle: {
          ...state.currentStyle,
          gradientFill: action.payload,
          // gradientFillを設定したらfillをクリア
          fill: null,
        },
      };
    }

    case 'SET_STYLE': {
      return {
        ...state,
        currentStyle: {
          ...state.currentStyle,
          ...action.payload,
        },
      };
    }

    // ============================================
    // 履歴操作
    // ============================================

    case 'SAVE_HISTORY': {
      // 現在位置より後の履歴を削除
      const newHistory = state.history.slice(0, state.historyIndex + 1);
      // 新しい状態を追加
      newHistory.push([...state.shapes]);
      // 履歴が長すぎる場合は古いものを削除
      if (newHistory.length > MAX_HISTORY_LENGTH) {
        newHistory.shift();
      }
      return {
        ...state,
        history: newHistory,
        historyIndex: newHistory.length - 1,
      };
    }

    case 'UNDO': {
      if (state.historyIndex <= 0) return state;
      const newIndex = state.historyIndex - 1;
      return {
        ...state,
        shapes: [...state.history[newIndex]],
        historyIndex: newIndex,
        selectedIds: [],
      };
    }

    case 'REDO': {
      if (state.historyIndex >= state.history.length - 1) return state;
      const newIndex = state.historyIndex + 1;
      return {
        ...state,
        shapes: [...state.history[newIndex]],
        historyIndex: newIndex,
        selectedIds: [],
      };
    }

    // ============================================
    // データ操作
    // ============================================

    case 'LOAD_SHAPES': {
      return {
        ...state,
        shapes: action.payload,
        selectedIds: [],
        history: [action.payload],
        historyIndex: 0,
      };
    }

    case 'CLEAR_ALL': {
      return {
        ...state,
        shapes: [],
        selectedIds: [],
        isDrawing: false,
        drawingShape: null,
      };
    }

    case 'TOGGLE_VISIBILITY': {
      const shapeId = action.payload;
      return {
        ...state,
        shapes: state.shapes.map((s) =>
          s.id === shapeId ? { ...s, visible: !s.visible } : s
        ),
      };
    }

    case 'TOGGLE_LOCK': {
      const shapeId = action.payload;
      return {
        ...state,
        shapes: state.shapes.map((s) =>
          s.id === shapeId ? { ...s, locked: !s.locked } : s
        ),
      };
    }

    // ============================================
    // 変形操作
    // ============================================

    case 'FLIP_HORIZONTAL': {
      if (state.selectedIds.length === 0) return state;

      const selectedSet = new Set(state.selectedIds);
      const selectedShapes = state.shapes.filter((s) => selectedSet.has(s.id) && !s.locked);

      if (selectedShapes.length === 0) return state;

      // 選択図形全体のバウンディングボックスを計算
      let minX = Infinity, maxX = -Infinity;
      for (const shape of selectedShapes) {
        const bounds = getShapeBounds(shape);
        minX = Math.min(minX, bounds.x);
        maxX = Math.max(maxX, bounds.x + bounds.width);
      }
      const centerX = (minX + maxX) / 2;

      // 各図形を水平反転
      const updatedShapes = state.shapes.map((shape) => {
        if (!selectedSet.has(shape.id) || shape.locked) return shape;

        const bounds = getShapeBounds(shape);
        const shapeCenterX = bounds.x + bounds.width / 2;
        const newCenterX = centerX - (shapeCenterX - centerX);
        const deltaX = newCenterX - shapeCenterX;

        // 図形タイプに応じた反転処理
        switch (shape.type) {
          case 'line':
          case 'arrow':
          case 'dimension': {
            const [x1, y1, x2, y2] = shape.points;
            return {
              ...shape,
              x: shape.x + deltaX,
              points: [-x2, y1, -x1, y2] as [number, number, number, number],
            };
          }
          case 'polygon':
          case 'freehand': {
            const flippedPoints: number[] = [];
            const pointsWidth = bounds.width;
            for (let i = 0; i < shape.points.length; i += 2) {
              // ローカル座標系での反転
              const localX = shape.points[i];
              const flippedLocalX = pointsWidth - localX;
              flippedPoints.push(flippedLocalX, shape.points[i + 1]);
            }
            return {
              ...shape,
              x: shape.x + deltaX - bounds.width,
              points: flippedPoints,
            };
          }
          case 'text': {
            // テキストは位置のみ反転
            return {
              ...shape,
              x: shape.x + deltaX * 2,
            };
          }
          case 'arc': {
            // 円弧は角度を反転
            return {
              ...shape,
              x: shape.x + deltaX * 2,
              startAngle: 180 - shape.endAngle,
              endAngle: 180 - shape.startAngle,
            };
          }
          default:
            // 円、矩形、画像などは位置のみ反転
            return {
              ...shape,
              x: shape.x + deltaX * 2,
            };
        }
      });

      return {
        ...state,
        shapes: updatedShapes,
      };
    }

    case 'FLIP_VERTICAL': {
      if (state.selectedIds.length === 0) return state;

      const selectedSet = new Set(state.selectedIds);
      const selectedShapes = state.shapes.filter((s) => selectedSet.has(s.id) && !s.locked);

      if (selectedShapes.length === 0) return state;

      // 選択図形全体のバウンディングボックスを計算
      let minY = Infinity, maxY = -Infinity;
      for (const shape of selectedShapes) {
        const bounds = getShapeBounds(shape);
        minY = Math.min(minY, bounds.y);
        maxY = Math.max(maxY, bounds.y + bounds.height);
      }
      const centerY = (minY + maxY) / 2;

      // 各図形を垂直反転
      const updatedShapes = state.shapes.map((shape) => {
        if (!selectedSet.has(shape.id) || shape.locked) return shape;

        const bounds = getShapeBounds(shape);
        const shapeCenterY = bounds.y + bounds.height / 2;
        const newCenterY = centerY - (shapeCenterY - centerY);
        const deltaY = newCenterY - shapeCenterY;

        // 図形タイプに応じた反転処理
        switch (shape.type) {
          case 'line':
          case 'arrow':
          case 'dimension': {
            const [x1, y1, x2, y2] = shape.points;
            return {
              ...shape,
              y: shape.y + deltaY,
              points: [x1, -y2, x2, -y1] as [number, number, number, number],
            };
          }
          case 'polygon':
          case 'freehand': {
            const flippedPoints: number[] = [];
            const pointsHeight = bounds.height;
            for (let i = 0; i < shape.points.length; i += 2) {
              // ローカル座標系での反転
              const localY = shape.points[i + 1];
              const flippedLocalY = pointsHeight - localY;
              flippedPoints.push(shape.points[i], flippedLocalY);
            }
            return {
              ...shape,
              y: shape.y + deltaY - bounds.height,
              points: flippedPoints,
            };
          }
          case 'text': {
            // テキストは位置のみ反転
            return {
              ...shape,
              y: shape.y + deltaY * 2,
            };
          }
          case 'arc': {
            // 円弧は角度を反転
            return {
              ...shape,
              y: shape.y + deltaY * 2,
              startAngle: -shape.endAngle,
              endAngle: -shape.startAngle,
            };
          }
          default:
            // 円、矩形、画像などは位置のみ反転
            return {
              ...shape,
              y: shape.y + deltaY * 2,
            };
        }
      });

      return {
        ...state,
        shapes: updatedShapes,
      };
    }

    case 'SCALE_SHAPES': {
      if (state.selectedIds.length === 0) return state;

      const scale = action.payload;
      if (scale <= 0) return state;

      const selectedSet = new Set(state.selectedIds);
      const selectedShapes = state.shapes.filter((s) => selectedSet.has(s.id) && !s.locked);

      if (selectedShapes.length === 0) return state;

      // 選択図形全体の中心を計算
      let minX = Infinity, maxX = -Infinity;
      let minY = Infinity, maxY = -Infinity;
      for (const shape of selectedShapes) {
        const bounds = getShapeBounds(shape);
        minX = Math.min(minX, bounds.x);
        maxX = Math.max(maxX, bounds.x + bounds.width);
        minY = Math.min(minY, bounds.y);
        maxY = Math.max(maxY, bounds.y + bounds.height);
      }
      const centerX = (minX + maxX) / 2;
      const centerY = (minY + maxY) / 2;

      // 各図形をスケール（ヘルパー関数を使用して再帰的にグループの子図形もスケール）
      const updatedShapes = state.shapes.map((shape) => {
        if (!selectedSet.has(shape.id) || shape.locked) return shape;
        return scaleShapeAroundCenter(shape, centerX, centerY, scale);
      });

      return {
        ...state,
        shapes: updatedShapes,
      };
    }

    // ============================================
    // ズーム操作
    // ============================================

    case 'ZOOM_TO_FIT': {
      if (state.shapes.length === 0) return state;

      const { canvasWidth, canvasHeight } = action.payload;
      const padding = 50; // 余白

      // 全図形のバウンディングボックスを計算
      let minX = Infinity, maxX = -Infinity;
      let minY = Infinity, maxY = -Infinity;
      for (const shape of state.shapes) {
        const bounds = getShapeBounds(shape);
        minX = Math.min(minX, bounds.x);
        maxX = Math.max(maxX, bounds.x + bounds.width);
        minY = Math.min(minY, bounds.y);
        maxY = Math.max(maxY, bounds.y + bounds.height);
      }

      const contentWidth = maxX - minX;
      const contentHeight = maxY - minY;

      if (contentWidth === 0 || contentHeight === 0) return state;

      // ズーム率を計算（余白を考慮）
      const scaleX = (canvasWidth - padding * 2) / contentWidth;
      const scaleY = (canvasHeight - padding * 2) / contentHeight;
      const newZoom = Math.min(scaleX, scaleY, 2); // 最大200%まで

      // パン位置を計算（中央に配置）
      const contentCenterX = (minX + maxX) / 2;
      const contentCenterY = (minY + maxY) / 2;
      const newPanX = canvasWidth / 2 - contentCenterX * newZoom;
      const newPanY = canvasHeight / 2 - contentCenterY * newZoom;

      return {
        ...state,
        zoom: Math.max(0.25, newZoom),
        pan: { x: newPanX, y: newPanY },
      };
    }

    case 'ZOOM_TO_SELECTION': {
      if (state.selectedIds.length === 0) return state;

      const { canvasWidth, canvasHeight } = action.payload;
      const padding = 50; // 余白

      const selectedSet = new Set(state.selectedIds);
      const selectedShapes = state.shapes.filter((s) => selectedSet.has(s.id));

      if (selectedShapes.length === 0) return state;

      // 選択図形のバウンディングボックスを計算
      let minX = Infinity, maxX = -Infinity;
      let minY = Infinity, maxY = -Infinity;
      for (const shape of selectedShapes) {
        const bounds = getShapeBounds(shape);
        minX = Math.min(minX, bounds.x);
        maxX = Math.max(maxX, bounds.x + bounds.width);
        minY = Math.min(minY, bounds.y);
        maxY = Math.max(maxY, bounds.y + bounds.height);
      }

      const contentWidth = maxX - minX;
      const contentHeight = maxY - minY;

      if (contentWidth === 0 || contentHeight === 0) return state;

      // ズーム率を計算（余白を考慮）
      const scaleX = (canvasWidth - padding * 2) / contentWidth;
      const scaleY = (canvasHeight - padding * 2) / contentHeight;
      const newZoom = Math.min(scaleX, scaleY, 2); // 最大200%まで

      // パン位置を計算（中央に配置）
      const contentCenterX = (minX + maxX) / 2;
      const contentCenterY = (minY + maxY) / 2;
      const newPanX = canvasWidth / 2 - contentCenterX * newZoom;
      const newPanY = canvasHeight / 2 - contentCenterY * newZoom;

      return {
        ...state,
        zoom: Math.max(0.25, newZoom),
        pan: { x: newPanX, y: newPanY },
      };
    }

    // ============================================
    // 計測操作
    // ============================================

    case 'ADD_MEASURE_POINT': {
      // 最大3点まで（3点で角度計測）
      const newPoints = [...state.measurePoints, action.payload];
      if (newPoints.length > 3) {
        // 4点目が追加されたらリセットして新しい計測開始
        return {
          ...state,
          measurePoints: [action.payload],
        };
      }
      return {
        ...state,
        measurePoints: newPoints,
      };
    }

    case 'CLEAR_MEASURE_POINTS': {
      return {
        ...state,
        measurePoints: [],
      };
    }

    case 'SET_MEASURE_UNIT': {
      return {
        ...state,
        measureUnit: action.payload,
      };
    }

    // ============================================
    // 頂点編集操作
    // ============================================

    case 'ENTER_VERTEX_EDIT_MODE': {
      const shapeId = action.payload;
      const shape = state.shapes.find((s) => s.id === shapeId);

      // ポリゴン、フリーハンド、線、矢印のみ頂点編集可能
      if (!shape || !['polygon', 'freehand', 'line', 'arrow'].includes(shape.type)) {
        return state;
      }

      return {
        ...state,
        vertexEditMode: true,
        editingShapeId: shapeId,
        editingVertexIndex: null,
        selectedIds: [shapeId],
      };
    }

    case 'EXIT_VERTEX_EDIT_MODE': {
      return {
        ...state,
        vertexEditMode: false,
        editingShapeId: null,
        editingVertexIndex: null,
      };
    }

    case 'SELECT_VERTEX': {
      return {
        ...state,
        editingVertexIndex: action.payload,
      };
    }

    case 'UPDATE_VERTEX': {
      const { shapeId, vertexIndex, position } = action.payload;
      const shape = state.shapes.find((s) => s.id === shapeId);

      if (!shape) return state;

      let updatedShape: Shape;

      switch (shape.type) {
        case 'line':
        case 'arrow':
        case 'dimension': {
          // 線系は4要素: [x1, y1, x2, y2]
          const newPoints = [...shape.points] as [number, number, number, number];
          if (vertexIndex === 0) {
            newPoints[0] = position.x - shape.x;
            newPoints[1] = position.y - shape.y;
          } else if (vertexIndex === 1) {
            newPoints[2] = position.x - shape.x;
            newPoints[3] = position.y - shape.y;
          }
          updatedShape = { ...shape, points: newPoints };
          break;
        }
        case 'polygon':
        case 'freehand': {
          const newPoints = [...shape.points];
          const pointIdx = vertexIndex * 2;
          if (pointIdx < newPoints.length) {
            newPoints[pointIdx] = position.x - shape.x;
            newPoints[pointIdx + 1] = position.y - shape.y;
          }
          updatedShape = { ...shape, points: newPoints };
          break;
        }
        default:
          return state;
      }

      return {
        ...state,
        shapes: state.shapes.map((s) => (s.id === shapeId ? updatedShape : s)),
      };
    }

    case 'ADD_VERTEX': {
      const { shapeId, afterIndex, position } = action.payload;
      const shape = state.shapes.find((s) => s.id === shapeId);

      if (!shape || !['polygon', 'freehand'].includes(shape.type)) return state;

      const polygonShape = shape as import('../types').PolygonShape | import('../types').FreehandShape;
      const newPoints = [...polygonShape.points];
      const insertIdx = (afterIndex + 1) * 2;

      // 新しい頂点を挿入（相対座標）
      const relX = position.x - shape.x;
      const relY = position.y - shape.y;
      newPoints.splice(insertIdx, 0, relX, relY);

      return {
        ...state,
        shapes: state.shapes.map((s) =>
          s.id === shapeId ? { ...s, points: newPoints } as Shape : s
        ),
      };
    }

    case 'DELETE_VERTEX': {
      const { shapeId, vertexIndex } = action.payload;
      const shape = state.shapes.find((s) => s.id === shapeId);

      if (!shape || !['polygon', 'freehand'].includes(shape.type)) return state;

      const polygonShape = shape as import('../types').PolygonShape | import('../types').FreehandShape;

      // 最低3頂点は維持
      if (polygonShape.points.length <= 6) return state;

      const newPoints = [...polygonShape.points];
      const deleteIdx = vertexIndex * 2;
      newPoints.splice(deleteIdx, 2);

      return {
        ...state,
        shapes: state.shapes.map((s) =>
          s.id === shapeId ? { ...s, points: newPoints } as Shape : s
        ),
        editingVertexIndex: null,
      };
    }

    // ============================================
    // ブーリアン演算
    // ============================================

    case 'BOOLEAN_UNION':
    case 'BOOLEAN_SUBTRACT':
    case 'BOOLEAN_INTERSECT':
    case 'BOOLEAN_EXCLUDE': {
      // 2つ以上の図形が選択されている必要がある
      if (state.selectedIds.length < 2) return state;

      const selectedSet = new Set(state.selectedIds);
      const selectedShapes = state.shapes.filter((s) => selectedSet.has(s.id));

      // ブーリアン演算可能な図形のみフィルタ
      const operableShapes = selectedShapes.filter((s) => canBooleanOperate(s));
      if (operableShapes.length < 2) return state;

      // 操作タイプを決定
      const operationType = action.type === 'BOOLEAN_UNION' ? 'union'
        : action.type === 'BOOLEAN_SUBTRACT' ? 'subtract'
        : action.type === 'BOOLEAN_INTERSECT' ? 'intersect'
        : 'exclude';

      // ブーリアン演算を実行
      const resultShapes = performBooleanOperation(operableShapes, operationType);

      if (resultShapes.length === 0) return state;

      // 元の図形を削除し、結果を追加
      const remainingShapes = state.shapes.filter((s) => !selectedSet.has(s.id));
      const newShapes = [...remainingShapes, ...resultShapes];
      const newSelectedIds = resultShapes.map((s) => s.id);

      return {
        ...state,
        shapes: newShapes,
        selectedIds: newSelectedIds,
      };
    }

    // ガイドライン操作
    case 'ADD_GUIDELINE':
      return {
        ...state,
        guidelines: [...state.guidelines, action.payload],
      };

    case 'REMOVE_GUIDELINE':
      return {
        ...state,
        guidelines: state.guidelines.filter((g) => g.id !== action.payload),
      };

    case 'UPDATE_GUIDELINE':
      return {
        ...state,
        guidelines: state.guidelines.map((g) =>
          g.id === action.payload.id ? { ...g, ...action.payload.changes } : g
        ),
      };

    case 'TOGGLE_GUIDES':
      return {
        ...state,
        guidesEnabled: !state.guidesEnabled,
      };

    case 'TOGGLE_SNAP_TO_GUIDES':
      return {
        ...state,
        snapToGuides: !state.snapToGuides,
      };

    case 'CLEAR_GUIDELINES':
      return {
        ...state,
        guidelines: [],
      };

    default:
      return state;
  }
}
