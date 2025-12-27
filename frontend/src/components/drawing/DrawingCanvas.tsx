/**
 * Drawing Canvas - メインキャンバスコンポーネント
 */

import React, { useRef, useCallback, useEffect, useState, forwardRef, useImperativeHandle } from 'react';
import { Stage, Layer, Line, Circle, Rect, Transformer, Arrow, Text, Group } from 'react-konva';
import type Konva from 'konva';
import { useDrawing } from './context/DrawingContext';
import { ShapeRenderer } from './shapes/ShapeRenderer';
import { MeasureTool } from './MeasureTool';
import { SmartGuidesOverlay, calculateSmartGuides, type SmartGuide } from './SmartGuides';
import { VertexEditOverlay } from './VertexEditOverlay';
import { GuidelinesLayer } from './GuidelinesLayer';
import type { Point, Shape, SnapPoint } from './types';
import { snapToGrid, snapLineAngle, constrainToSquare, distance, getArcPoints, angle as calcAngle } from './utils/geometry';
import { snapPoint as calculateSnapPoint } from './utils/snap';

interface DrawingCanvasProps {
  width: number;
  height: number;
}

export interface DrawingCanvasHandle {
  getStage: () => Konva.Stage | null;
}

/**
 * グリッドレイヤー
 */
function GridLayer({
  width,
  height,
  gridSize,
  zoom,
  pan,
}: {
  width: number;
  height: number;
  gridSize: number;
  zoom: number;
  pan: Point;
}) {
  const lines: React.ReactNode[] = [];
  const adjustedGridSize = gridSize * zoom;

  // 表示範囲を計算
  const startX = Math.floor(-pan.x / adjustedGridSize) * adjustedGridSize;
  const startY = Math.floor(-pan.y / adjustedGridSize) * adjustedGridSize;
  const endX = startX + width / zoom + adjustedGridSize * 2;
  const endY = startY + height / zoom + adjustedGridSize * 2;

  // 垂直線
  for (let x = startX; x < endX; x += gridSize) {
    lines.push(
      <Line
        key={`v-${x}`}
        points={[x, startY, x, endY]}
        stroke="#e5e7eb"
        strokeWidth={1 / zoom}
        listening={false}
      />
    );
  }

  // 水平線
  for (let y = startY; y < endY; y += gridSize) {
    lines.push(
      <Line
        key={`h-${y}`}
        points={[startX, y, endX, y]}
        stroke="#e5e7eb"
        strokeWidth={1 / zoom}
        listening={false}
      />
    );
  }

  return <>{lines}</>;
}

/**
 * 描画中プレビュー
 */
function DrawingPreview({
  drawingShape,
  style,
}: {
  drawingShape: Partial<Shape> | null;
  style: { stroke: string; strokeWidth: number; fill: string | null };
}) {
  if (!drawingShape || !drawingShape.type) return null;

  const commonProps = {
    stroke: style.stroke,
    strokeWidth: style.strokeWidth,
    fill: style.fill ?? undefined,
    opacity: 0.6,
    listening: false,
  };

  switch (drawingShape.type) {
    case 'line': {
      const lineShape = drawingShape as Partial<Shape & { points: number[] }>;
      if (!lineShape.points || lineShape.points.length < 4) return null;
      return (
        <Line
          x={lineShape.x ?? 0}
          y={lineShape.y ?? 0}
          points={lineShape.points}
          {...commonProps}
        />
      );
    }
    case 'circle': {
      const circleShape = drawingShape as Partial<Shape & { radius: number }>;
      return (
        <Circle
          x={circleShape.x ?? 0}
          y={circleShape.y ?? 0}
          radius={circleShape.radius ?? 0}
          {...commonProps}
        />
      );
    }
    case 'arc': {
      const arcShape = drawingShape as Partial<
        Shape & {
          radius: number;
          startAngle: number;
          endAngle: number;
        }
      >;
      // 弧上のポイントを計算（相対座標で計算）
      const arcPoints = getArcPoints(
        0, 0,
        arcShape.radius ?? 0,
        arcShape.startAngle ?? 0,
        arcShape.endAngle ?? 0
      );
      if (arcPoints.length < 4) return null;
      return (
        <Line
          x={arcShape.x ?? 0}
          y={arcShape.y ?? 0}
          points={arcPoints}
          stroke={style.stroke}
          strokeWidth={style.strokeWidth}
          opacity={0.6}
          listening={false}
        />
      );
    }
    case 'rect': {
      const rectShape = drawingShape as Partial<
        Shape & { width: number; height: number }
      >;
      return (
        <Rect
          x={rectShape.x ?? 0}
          y={rectShape.y ?? 0}
          width={rectShape.width ?? 0}
          height={rectShape.height ?? 0}
          {...commonProps}
        />
      );
    }
    case 'polygon': {
      const polygonShape = drawingShape as Partial<
        Shape & { points: number[]; closed: boolean }
      >;
      if (!polygonShape.points || polygonShape.points.length < 2) return null;
      return (
        <Line
          x={polygonShape.x ?? 0}
          y={polygonShape.y ?? 0}
          points={polygonShape.points}
          closed={polygonShape.closed ?? false}
          {...commonProps}
        />
      );
    }
    case 'arrow': {
      const arrowShape = drawingShape as Partial<Shape & { points: number[] }>;
      if (!arrowShape.points || arrowShape.points.length < 4) return null;
      return (
        <Arrow
          x={arrowShape.x ?? 0}
          y={arrowShape.y ?? 0}
          points={arrowShape.points}
          stroke={style.stroke}
          strokeWidth={style.strokeWidth}
          fill={style.stroke}
          pointerLength={10}
          pointerWidth={10}
          opacity={0.6}
          listening={false}
        />
      );
    }
    case 'freehand': {
      const freehandShape = drawingShape as Partial<Shape & { points: number[] }>;
      if (!freehandShape.points || freehandShape.points.length < 2) return null;
      return (
        <Line
          x={freehandShape.x ?? 0}
          y={freehandShape.y ?? 0}
          points={freehandShape.points}
          stroke={style.stroke}
          strokeWidth={style.strokeWidth}
          tension={0.5}
          lineCap="round"
          lineJoin="round"
          opacity={0.6}
          listening={false}
        />
      );
    }
    case 'dimension': {
      const dimShape = drawingShape as Partial<Shape & {
        points: number[];
        offset: number;
        unit: string;
        showExtensionLines: boolean;
      }>;
      if (!dimShape.points || dimShape.points.length < 4) return null;

      const [x1, y1, x2, y2] = dimShape.points;
      const offset = dimShape.offset ?? 30;

      // 寸法線の方向を計算
      const dx = x2 - x1;
      const dy = y2 - y1;
      const len = Math.sqrt(dx * dx + dy * dy);
      if (len === 0) return null;

      // 垂直方向のベクトル（正規化）
      const perpX = -dy / len;
      const perpY = dx / len;

      // オフセット位置を計算
      const offsetX1 = x1 + perpX * offset;
      const offsetY1 = y1 + perpY * offset;
      const offsetX2 = x2 + perpX * offset;
      const offsetY2 = y2 + perpY * offset;

      // 寸法テキスト
      const dist = len.toFixed(1);
      const midX = (offsetX1 + offsetX2) / 2;
      const midY = (offsetY1 + offsetY2) / 2;

      return (
        <Group opacity={0.6} listening={false}>
          {/* 延長線 */}
          <Line
            points={[x1, y1, offsetX1, offsetY1]}
            stroke={style.stroke}
            strokeWidth={1}
          />
          <Line
            points={[x2, y2, offsetX2, offsetY2]}
            stroke={style.stroke}
            strokeWidth={1}
          />
          {/* 寸法線（矢印付き） */}
          <Arrow
            points={[offsetX1, offsetY1, offsetX2, offsetY2]}
            stroke={style.stroke}
            strokeWidth={style.strokeWidth}
            fill={style.stroke}
            pointerLength={8}
            pointerWidth={8}
            pointerAtBeginning={true}
            pointerAtEnding={true}
          />
          {/* 寸法テキスト */}
          <Text
            x={midX}
            y={midY - 12}
            text={`${dist} px`}
            fontSize={12}
            fill={style.stroke}
            align="center"
            offsetX={dist.length * 3}
          />
        </Group>
      );
    }
    default:
      return null;
  }
}

export const DrawingCanvas = forwardRef<DrawingCanvasHandle, DrawingCanvasProps>(
  function DrawingCanvas({ width, height }, ref) {
  const stageRef = useRef<Konva.Stage>(null);
  const transformerRef = useRef<Konva.Transformer>(null);
  const [mousePos, setMousePos] = useState<Point | null>(null);
  const [drawStart, setDrawStart] = useState<Point | null>(null);
  const [shiftPressed, setShiftPressed] = useState(false);
  const [smartGuides, setSmartGuides] = useState<SmartGuide[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  // 範囲選択ボックス
  const [selectionBox, setSelectionBox] = useState<{ start: Point; end: Point } | null>(null);
  // テキスト編集状態
  const [editingTextId, setEditingTextId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState<string>('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  // 新規テキスト作成中フラグ（編集開始待ち）
  const [pendingNewTextEdit, setPendingNewTextEdit] = useState(false);
  // オブジェクトスナップ表示用
  const [activeSnapPoint, setActiveSnapPoint] = useState<SnapPoint | null>(null);

  const {
    state,
    selectShapes,
    clearSelection,
    updateShape,
    startDrawing,
    updateDrawing,
    finishDrawing,
    cancelDrawing,
    setZoom,
    setPan,
    saveHistory,
    addMeasurePoint,
    clearMeasurePoints,
    deleteShapes,
    enterVertexEditMode,
    exitVertexEditMode,
  } = useDrawing();

  // Expose stage ref to parent
  useImperativeHandle(ref, () => ({
    getStage: () => stageRef.current,
  }), []);

  const {
    shapes,
    selectedIds,
    currentTool,
    isDrawing,
    drawingShape,
    zoom,
    pan,
    gridEnabled,
    gridSize,
    snapToGrid: snapEnabled,
    objectSnapEnabled,
    currentStyle,
    vertexEditMode,
    editingShapeId,
  } = state;

  // Transformer の更新
  useEffect(() => {
    if (!transformerRef.current || !stageRef.current) return;

    const selectedNodes = selectedIds
      .map((id) => stageRef.current?.findOne(`#${id}`))
      .filter((node): node is Konva.Node => node !== undefined);

    transformerRef.current.nodes(selectedNodes);
  }, [selectedIds, shapes]);

  // キーボードイベント
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Shift') {
        setShiftPressed(true);
      }
      if (e.key === 'Escape') {
        // 頂点編集モードを終了
        if (vertexEditMode) {
          exitVertexEditMode();
          return;
        }
        if (isDrawing) {
          cancelDrawing();
          setDrawStart(null);
        } else if (currentTool === 'measure') {
          clearMeasurePoints();
        } else {
          clearSelection();
        }
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'Shift') {
        setShiftPressed(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [isDrawing, cancelDrawing, clearSelection, currentTool, clearMeasurePoints, vertexEditMode, exitVertexEditMode]);

  // 新規テキスト作成後のインライン編集開始
  useEffect(() => {
    if (pendingNewTextEdit && selectedIds.length === 1) {
      const selectedShape = shapes.find((s) => s.id === selectedIds[0] && s.type === 'text');
      if (selectedShape && selectedShape.type === 'text') {
        setEditingTextId(selectedShape.id);
        setEditingText(''); // 空で開始
        setPendingNewTextEdit(false);
        // 次のレンダリング後にフォーカス
        setTimeout(() => textareaRef.current?.focus(), 0);
      }
    }
  }, [pendingNewTextEdit, selectedIds, shapes]);

  // マウス座標を取得（ズーム・パン考慮）
  const getPointerPosition = useCallback((): Point | null => {
    const stage = stageRef.current;
    if (!stage) return null;
    const pos = stage.getPointerPosition();
    if (!pos) return null;

    // ステージ座標からワールド座標に変換
    const worldX = (pos.x - pan.x) / zoom;
    const worldY = (pos.y - pan.y) / zoom;

    let point = { x: worldX, y: worldY };

    // オブジェクトスナップを優先
    if (objectSnapEnabled) {
      // 描画中でない場合（選択・ドラッグ中）は選択中の図形を除外
      // 描画中は新しい図形を作成しているので、既存の全図形をスナップ対象とする
      const excludeIds = currentTool === 'select' ? selectedIds : [];
      const result = calculateSnapPoint(point, shapes, {
        snapToGrid: snapEnabled,
        gridSize,
        objectSnapEnabled: true,
        excludeIds,
        zoom, // ズームレベルを渡してスナップ距離を調整
      });
      setActiveSnapPoint(result.snapInfo);
      return result.point;
    }

    // オブジェクトスナップが無効の場合はスナップポイントをクリア
    setActiveSnapPoint(null);

    // グリッドスナップ
    if (snapEnabled) {
      point = snapToGrid(point, gridSize);
    }

    return point;
  }, [zoom, pan, snapEnabled, gridSize, objectSnapEnabled, shapes, selectedIds, currentTool]);

  // マウスダウン
  const handleMouseDown = useCallback(
    (e: Konva.KonvaEventObject<MouseEvent>) => {
      const pos = getPointerPosition();
      if (!pos) return;

      // キャンバスクリック時（選択モード）は範囲選択を開始
      if (e.target === e.target.getStage()) {
        if (currentTool === 'select') {
          // Shift押下中は選択を維持しつつ範囲選択開始
          if (!shiftPressed) {
            clearSelection();
          }
          // 範囲選択ボックスを開始
          setSelectionBox({ start: pos, end: pos });
          return;
        }
      }

      // 計測ツールの場合
      if (currentTool === 'measure') {
        addMeasurePoint(pos);
        return;
      }

      // 描画ツールの場合
      if (currentTool !== 'select') {
        setDrawStart(pos);

        switch (currentTool) {
          case 'line':
            startDrawing({
              type: 'line',
              x: 0,
              y: 0,
              points: [pos.x, pos.y, pos.x, pos.y],
            });
            break;
          case 'circle':
            startDrawing({
              type: 'circle',
              x: pos.x,
              y: pos.y,
              radius: 0,
            });
            break;
          case 'arc':
            startDrawing({
              type: 'arc',
              x: pos.x,
              y: pos.y,
              radius: 0,
              startAngle: 0,
              endAngle: 0,
            });
            break;
          case 'rect':
            startDrawing({
              type: 'rect',
              x: pos.x,
              y: pos.y,
              width: 0,
              height: 0,
            });
            break;
          case 'polygon':
            if (!isDrawing) {
              startDrawing({
                type: 'polygon',
                x: 0,
                y: 0,
                points: [pos.x, pos.y],
                closed: false,
              });
            } else {
              // 既存のポリゴンに頂点追加
              const currentPoints =
                (drawingShape as { points?: number[] })?.points ?? [];
              // 始点に近い場合は閉じる
              if (currentPoints.length >= 4) {
                const startX = currentPoints[0];
                const startY = currentPoints[1];
                if (distance({ x: startX, y: startY }, pos) < 10) {
                  updateDrawing({ closed: true });
                  finishDrawing();
                  setDrawStart(null);
                  return;
                }
              }
              updateDrawing({
                points: [...currentPoints, pos.x, pos.y],
              });
            }
            break;
          case 'text':
            // テキストは即座に作成し、インライン編集を開始
            {
              // プレースホルダーテキストで図形を作成
              startDrawing({
                type: 'text',
                x: pos.x,
                y: pos.y,
                text: ' ', // 一時的なプレースホルダー（空だとレンダリングされない可能性）
                fontSize: currentStyle.fontSize,
                fontFamily: currentStyle.fontFamily,
                fontWeight: 'normal',
                fontStyle: 'normal',
                textAlign: 'left',
              });
              finishDrawing();
              // 新規テキスト編集待ちフラグを立てる
              setPendingNewTextEdit(true);
              setDrawStart(null);
            }
            break;
          case 'arrow':
            startDrawing({
              type: 'arrow',
              x: 0,
              y: 0,
              points: [pos.x, pos.y, pos.x, pos.y],
              arrowStart: 'none',
              arrowEnd: 'triangle',
            });
            break;
          case 'freehand':
            startDrawing({
              type: 'freehand',
              x: 0,
              y: 0,
              points: [pos.x, pos.y],
            });
            break;
          case 'dimension':
            startDrawing({
              type: 'dimension',
              x: 0,
              y: 0,
              points: [pos.x, pos.y, pos.x, pos.y],
              offset: 30,
              unit: state.measureUnit,
              showExtensionLines: true,
            });
            break;
        }
      }
    },
    [
      currentTool,
      getPointerPosition,
      clearSelection,
      startDrawing,
      updateDrawing,
      finishDrawing,
      isDrawing,
      drawingShape,
      currentStyle,
      addMeasurePoint,
    ]
  );

  // マウス移動
  const handleMouseMove = useCallback(() => {
    const pos = getPointerPosition();
    if (!pos) return;

    setMousePos(pos);

    // 範囲選択中の場合
    if (selectionBox) {
      setSelectionBox({ ...selectionBox, end: pos });
      return;
    }

    if (!isDrawing || !drawStart) return;

    switch (currentTool) {
      case 'line': {
        let endPos = pos;
        if (shiftPressed) {
          endPos = snapLineAngle(drawStart, pos, 45);
        }
        updateDrawing({
          points: [drawStart.x, drawStart.y, endPos.x, endPos.y],
        });
        break;
      }
      case 'circle': {
        const radius = distance(drawStart, pos);
        updateDrawing({ radius });
        break;
      }
      case 'arc': {
        // 半径と終了角度を計算
        const radius = distance(drawStart, pos);
        // 開始角度は0度（右方向）に固定
        // 終了角度はマウス位置から計算
        const endAngle = calcAngle(drawStart, pos);
        updateDrawing({ radius, startAngle: 0, endAngle });
        break;
      }
      case 'rect': {
        let endPos = pos;
        if (shiftPressed) {
          endPos = constrainToSquare(drawStart, pos);
        }
        const width = endPos.x - drawStart.x;
        const height = endPos.y - drawStart.y;
        // 負の幅/高さに対応
        const x = width < 0 ? drawStart.x + width : drawStart.x;
        const y = height < 0 ? drawStart.y + height : drawStart.y;
        updateDrawing({
          x,
          y,
          width: Math.abs(width),
          height: Math.abs(height),
        });
        break;
      }
      case 'polygon': {
        // ポリゴン描画中のプレビュー更新（最後の点を現在位置に）
        const currentPoints =
          (drawingShape as { points?: number[] })?.points ?? [];
        if (currentPoints.length >= 2) {
          const newPoints = currentPoints.slice(0, -2);
          newPoints.push(pos.x, pos.y);
          updateDrawing({ points: newPoints });
        }
        break;
      }
      case 'arrow': {
        let endPos = pos;
        if (shiftPressed) {
          endPos = snapLineAngle(drawStart, pos, 45);
        }
        updateDrawing({
          points: [drawStart.x, drawStart.y, endPos.x, endPos.y],
        });
        break;
      }
      case 'freehand': {
        // フリーハンドは現在のポイントに追加
        const currentPoints =
          (drawingShape as { points?: number[] })?.points ?? [];
        updateDrawing({
          points: [...currentPoints, pos.x, pos.y],
        });
        break;
      }
      case 'dimension': {
        let endPos = pos;
        if (shiftPressed) {
          endPos = snapLineAngle(drawStart, pos, 45);
        }
        updateDrawing({
          points: [drawStart.x, drawStart.y, endPos.x, endPos.y],
        });
        break;
      }
    }
  }, [
    currentTool,
    getPointerPosition,
    isDrawing,
    drawStart,
    shiftPressed,
    updateDrawing,
    drawingShape,
    selectionBox,
  ]);

  // 範囲内の図形を取得
  const getShapesInSelectionBox = useCallback(
    (box: { start: Point; end: Point }): string[] => {
      const minX = Math.min(box.start.x, box.end.x);
      const maxX = Math.max(box.start.x, box.end.x);
      const minY = Math.min(box.start.y, box.end.y);
      const maxY = Math.max(box.start.y, box.end.y);

      return shapes
        .filter((shape) => {
          if (!shape.visible) return false;

          // 図形のバウンディングボックスを計算
          let shapeMinX: number, shapeMaxX: number, shapeMinY: number, shapeMaxY: number;

          switch (shape.type) {
            case 'line':
            case 'arrow':
            case 'dimension': {
              const [x1, y1, x2, y2] = shape.points;
              shapeMinX = shape.x + Math.min(x1, x2);
              shapeMaxX = shape.x + Math.max(x1, x2);
              shapeMinY = shape.y + Math.min(y1, y2);
              shapeMaxY = shape.y + Math.max(y1, y2);
              break;
            }
            case 'circle':
            case 'arc':
              shapeMinX = shape.x - shape.radius;
              shapeMaxX = shape.x + shape.radius;
              shapeMinY = shape.y - shape.radius;
              shapeMaxY = shape.y + shape.radius;
              break;
            case 'rect':
            case 'image':
            case 'group':
              shapeMinX = shape.x;
              shapeMaxX = shape.x + shape.width;
              shapeMinY = shape.y;
              shapeMaxY = shape.y + shape.height;
              break;
            case 'polygon':
            case 'freehand': {
              if (shape.points.length < 2) return false;
              let pMinX = Infinity, pMaxX = -Infinity;
              let pMinY = Infinity, pMaxY = -Infinity;
              for (let i = 0; i < shape.points.length; i += 2) {
                pMinX = Math.min(pMinX, shape.points[i]);
                pMaxX = Math.max(pMaxX, shape.points[i]);
                pMinY = Math.min(pMinY, shape.points[i + 1]);
                pMaxY = Math.max(pMaxY, shape.points[i + 1]);
              }
              shapeMinX = shape.x + pMinX;
              shapeMaxX = shape.x + pMaxX;
              shapeMinY = shape.y + pMinY;
              shapeMaxY = shape.y + pMaxY;
              break;
            }
            case 'text':
              shapeMinX = shape.x;
              shapeMaxX = shape.x + shape.text.length * shape.fontSize * 0.6;
              shapeMinY = shape.y;
              shapeMaxY = shape.y + shape.fontSize;
              break;
            default:
              return false;
          }

          // 選択ボックスと図形のバウンディングボックスが重なるか判定
          return !(shapeMaxX < minX || shapeMinX > maxX || shapeMaxY < minY || shapeMinY > maxY);
        })
        .map((shape) => shape.id);
    },
    [shapes]
  );

  // マウスアップ
  const handleMouseUp = useCallback(() => {
    // 範囲選択の完了
    if (selectionBox) {
      const selectedShapeIds = getShapesInSelectionBox(selectionBox);
      if (selectedShapeIds.length > 0) {
        if (shiftPressed) {
          // Shift押下中は既存の選択に追加
          const newSelection = [...new Set([...selectedIds, ...selectedShapeIds])];
          selectShapes(newSelection);
        } else {
          selectShapes(selectedShapeIds);
        }
      }
      setSelectionBox(null);
      return;
    }

    if (!isDrawing || !drawStart) return;

    // ポリゴンとテキスト以外は即座に完了
    // テキストはmouseDownで既に完了済み
    if (currentTool !== 'polygon' && currentTool !== 'text') {
      finishDrawing();
      setDrawStart(null);
    }
  }, [currentTool, isDrawing, drawStart, finishDrawing, selectionBox, getShapesInSelectionBox, shiftPressed, selectedIds, selectShapes]);

  // テキストダブルクリック（インライン編集開始）
  const handleTextDoubleClick = useCallback(
    (id: string) => {
      const textShape = shapes.find((s) => s.id === id && s.type === 'text');
      if (textShape && textShape.type === 'text') {
        setEditingTextId(id);
        setEditingText(textShape.text);
        selectShapes([id]);
        // フォーカスは次のレンダリング後に設定
        setTimeout(() => textareaRef.current?.focus(), 0);
      }
    },
    [shapes, selectShapes]
  );

  // ダブルクリック（ポリゴン完了 or テキスト編集 or 頂点編集）
  const handleDblClick = useCallback(() => {
    // ポリゴン描画中は完了処理
    if (currentTool === 'polygon' && isDrawing) {
      updateDrawing({ closed: true });
      finishDrawing();
      setDrawStart(null);
      return;
    }

    // 選択モードで単一の図形が選択されている場合
    if (currentTool === 'select' && selectedIds.length === 1) {
      const selectedShape = shapes.find((s) => s.id === selectedIds[0]);
      if (!selectedShape) return;

      // テキストの場合はインライン編集
      if (selectedShape.type === 'text') {
        handleTextDoubleClick(selectedShape.id);
        return;
      }

      // ポリゴン、線、矢印、フリーハンドの場合は頂点編集モード
      if (['polygon', 'freehand', 'line', 'arrow'].includes(selectedShape.type)) {
        enterVertexEditMode(selectedShape.id);
        return;
      }
    }
  }, [currentTool, isDrawing, updateDrawing, finishDrawing, selectedIds, shapes, handleTextDoubleClick, enterVertexEditMode]);

  // ホイールでズーム
  const handleWheel = useCallback(
    (e: Konva.KonvaEventObject<WheelEvent>) => {
      e.evt.preventDefault();
      const stage = stageRef.current;
      if (!stage) return;

      const scaleBy = 1.1;
      const oldScale = zoom;
      const pointer = stage.getPointerPosition();
      if (!pointer) return;

      const mousePointTo = {
        x: (pointer.x - pan.x) / oldScale,
        y: (pointer.y - pan.y) / oldScale,
      };

      const newScale =
        e.evt.deltaY < 0 ? oldScale * scaleBy : oldScale / scaleBy;
      const clampedScale = Math.max(0.1, Math.min(10, newScale));

      setZoom(clampedScale);
      setPan({
        x: pointer.x - mousePointTo.x * clampedScale,
        y: pointer.y - mousePointTo.y * clampedScale,
      });
    },
    [zoom, pan, setZoom, setPan]
  );

  // 図形選択
  const handleShapeSelect = useCallback(
    (id: string) => {
      if (currentTool === 'select') {
        selectShapes([id]);
      }
    },
    [currentTool, selectShapes]
  );

  // 図形ドラッグ中
  const handleShapeDragMove = useCallback(
    (id: string, x: number, y: number) => {
      const draggingShape = shapes.find((s) => s.id === id);
      if (!draggingShape) return;

      // ドラッグ中の位置で仮の図形を作成
      const tempShape = { ...draggingShape, x, y } as Shape;
      const otherShapes = shapes.filter((s) => s.id !== id);

      // スマートガイドを計算
      const guides = calculateSmartGuides(tempShape, otherShapes, width, height);
      setSmartGuides(guides);
      setIsDragging(true);
    },
    [shapes, width, height]
  );

  // 図形ドラッグ終了
  const handleShapeDragEnd = useCallback(
    (id: string, x: number, y: number) => {
      updateShape(id, { x, y });
      saveHistory();
      setSmartGuides([]);
      setIsDragging(false);
    },
    [updateShape, saveHistory]
  );

  // テキスト編集完了
  const handleTextEditComplete = useCallback(() => {
    if (editingTextId) {
      if (editingText.trim()) {
        // テキストがある場合は更新
        updateShape(editingTextId, { text: editingText });
        saveHistory();
      } else {
        // テキストが空の場合は図形を削除
        deleteShapes([editingTextId]);
      }
    }
    setEditingTextId(null);
    setEditingText('');
  }, [editingTextId, editingText, updateShape, saveHistory, deleteShapes]);

  // テキスト編集キャンセル
  const handleTextEditCancel = useCallback(() => {
    setEditingTextId(null);
    setEditingText('');
  }, []);

  // 編集中のテキスト図形を取得
  const editingTextShape = editingTextId
    ? shapes.find((s) => s.id === editingTextId && s.type === 'text')
    : null;

  return (
    <div style={{ position: 'relative', width, height }}>
      <Stage
        ref={stageRef}
        width={width}
        height={height}
        scaleX={zoom}
        scaleY={zoom}
        x={pan.x}
        y={pan.y}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onDblClick={handleDblClick}
        onWheel={handleWheel}
        style={{
          backgroundColor: '#ffffff',
          cursor:
            currentTool === 'select'
              ? 'default'
              : 'crosshair',
        }}
      >
      {/* グリッドレイヤー */}
      {gridEnabled && (
        <Layer listening={false}>
          <GridLayer
            width={width}
            height={height}
            gridSize={gridSize}
            zoom={zoom}
            pan={pan}
          />
        </Layer>
      )}

      {/* ガイドラインレイヤー */}
      <Layer>
        <GuidelinesLayer
          canvasWidth={width}
          canvasHeight={height}
          zoom={zoom}
          panX={pan.x}
          panY={pan.y}
        />
      </Layer>

      {/* 図形レイヤー */}
      <Layer>
        {shapes.map((shape) => (
          <ShapeRenderer
            key={shape.id}
            shape={shape}
            isSelected={selectedIds.includes(shape.id)}
            isDraggable={currentTool === 'select'}
            onSelect={handleShapeSelect}
            onDragMove={handleShapeDragMove}
            onDragEnd={handleShapeDragEnd}
            onDoubleClick={handleTextDoubleClick}
          />
        ))}

        {/* 描画中プレビュー */}
        <DrawingPreview
          drawingShape={drawingShape}
          style={currentStyle}
        />

        {/* 範囲選択ボックス */}
        {selectionBox && (
          <Rect
            x={Math.min(selectionBox.start.x, selectionBox.end.x)}
            y={Math.min(selectionBox.start.y, selectionBox.end.y)}
            width={Math.abs(selectionBox.end.x - selectionBox.start.x)}
            height={Math.abs(selectionBox.end.y - selectionBox.start.y)}
            fill="rgba(79, 70, 229, 0.1)"
            stroke="#4f46e5"
            strokeWidth={1}
            dash={[4, 4]}
            listening={false}
          />
        )}

        {/* 選択トランスフォーマー */}
        {currentTool === 'select' && !vertexEditMode && (
          <Transformer
            ref={transformerRef}
            rotateEnabled={true}
            enabledAnchors={[
              'top-left',
              'top-right',
              'bottom-left',
              'bottom-right',
              'middle-left',
              'middle-right',
              'top-center',
              'bottom-center',
            ]}
            boundBoxFunc={(oldBox, newBox) => {
              // 最小サイズ制限
              if (newBox.width < 5 || newBox.height < 5) {
                return oldBox;
              }
              return newBox;
            }}
          />
        )}

        {/* 頂点編集オーバーレイ */}
        {vertexEditMode && editingShapeId && (() => {
          const editingShape = shapes.find((s) => s.id === editingShapeId);
          return editingShape ? (
            <VertexEditOverlay shape={editingShape} zoom={zoom} />
          ) : null;
        })()}

        {/* 計測ツール */}
        <MeasureTool currentMousePos={mousePos} />

        {/* スマートガイド（ドラッグ中のみ表示） */}
        {isDragging && <SmartGuidesOverlay guides={smartGuides} />}

        {/* オブジェクトスナップインジケーター */}
        {activeSnapPoint && objectSnapEnabled && (() => {
          // ズームに関係なく画面上で一定サイズに見えるよう調整
          const indicatorSize = 6 / zoom;
          const indicatorStroke = 2 / zoom;
          return (
            <Group listening={false}>
              {/* スナップポイントのマーカー */}
              {activeSnapPoint.type === 'endpoint' && (
                <Rect
                  x={activeSnapPoint.x - indicatorSize}
                  y={activeSnapPoint.y - indicatorSize}
                  width={indicatorSize * 2}
                  height={indicatorSize * 2}
                  fill="transparent"
                  stroke="#22c55e"
                  strokeWidth={indicatorStroke}
                />
              )}
              {activeSnapPoint.type === 'midpoint' && (
                <Line
                  points={[
                    activeSnapPoint.x - indicatorSize, activeSnapPoint.y,
                    activeSnapPoint.x, activeSnapPoint.y - indicatorSize,
                    activeSnapPoint.x + indicatorSize, activeSnapPoint.y,
                    activeSnapPoint.x, activeSnapPoint.y + indicatorSize,
                  ]}
                  closed
                  fill="transparent"
                  stroke="#eab308"
                  strokeWidth={indicatorStroke}
                />
              )}
              {activeSnapPoint.type === 'center' && (
                <Circle
                  x={activeSnapPoint.x}
                  y={activeSnapPoint.y}
                  radius={indicatorSize}
                  fill="transparent"
                  stroke="#3b82f6"
                  strokeWidth={indicatorStroke}
                />
              )}
              {activeSnapPoint.type === 'intersection' && (
                <>
                  <Line
                    points={[
                      activeSnapPoint.x - indicatorSize, activeSnapPoint.y - indicatorSize,
                      activeSnapPoint.x + indicatorSize, activeSnapPoint.y + indicatorSize,
                    ]}
                    stroke="#ef4444"
                    strokeWidth={indicatorStroke}
                  />
                  <Line
                    points={[
                      activeSnapPoint.x + indicatorSize, activeSnapPoint.y - indicatorSize,
                      activeSnapPoint.x - indicatorSize, activeSnapPoint.y + indicatorSize,
                    ]}
                    stroke="#ef4444"
                    strokeWidth={indicatorStroke}
                  />
                </>
              )}
            </Group>
          );
        })()}
      </Layer>
    </Stage>

      {/* テキストインライン編集オーバーレイ */}
      {editingTextShape && editingTextShape.type === 'text' && (
        <textarea
          ref={textareaRef}
          value={editingText}
          onChange={(e) => setEditingText(e.target.value)}
          onBlur={handleTextEditComplete}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleTextEditComplete();
            } else if (e.key === 'Escape') {
              handleTextEditCancel();
            }
          }}
          style={{
            position: 'absolute',
            left: editingTextShape.x * zoom + pan.x,
            top: editingTextShape.y * zoom + pan.y,
            fontSize: editingTextShape.fontSize * zoom,
            fontFamily: editingTextShape.fontFamily,
            fontWeight: editingTextShape.fontWeight,
            fontStyle: editingTextShape.fontStyle,
            color: editingTextShape.stroke,
            border: '2px solid #4f46e5',
            borderRadius: '4px',
            padding: '4px 8px',
            outline: 'none',
            resize: 'none',
            minWidth: '100px',
            minHeight: `${editingTextShape.fontSize * zoom + 16}px`,
            backgroundColor: 'rgba(255, 255, 255, 0.95)',
            zIndex: 1000,
            transform: `rotate(${editingTextShape.rotation}deg)`,
            transformOrigin: 'top left',
          }}
        />
      )}
    </div>
  );
});
