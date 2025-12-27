/**
 * Drawing Status Bar - ステータスバーコンポーネント
 */

import React, { useCallback } from 'react';
import { Grid3X3, Magnet, ZoomIn, ZoomOut, RotateCcw, Maximize, Focus } from 'lucide-react';
import clsx from 'clsx';
import { useDrawing } from './context/DrawingContext';
import type { Point, ToolType } from './types';

export interface DrawingStatusBarProps {
  mousePosition?: Point | null;
  canvasWidth?: number;
  canvasHeight?: number;
}

const TOOL_LABELS: Record<ToolType, string> = {
  select: '選択',
  line: '線',
  circle: '円',
  arc: '円弧',
  rect: '矩形',
  polygon: '多角形',
  text: 'テキスト',
  arrow: '矢印',
  freehand: 'フリーハンド',
  dimension: '寸法線',
  measure: '計測',
};

const TOOL_HINTS: Record<ToolType, string> = {
  select: 'クリックで選択、ドラッグで移動',
  line: 'クリックで始点、ドラッグで終点',
  circle: 'クリックで中心、ドラッグで半径',
  arc: 'クリックで中心、ドラッグで円弧',
  rect: 'クリックで始点、ドラッグで対角',
  polygon: 'クリックで頂点追加、ダブルクリックで完了',
  text: 'クリックでテキスト入力',
  arrow: 'ドラッグで矢印を描画',
  freehand: 'ドラッグで自由に描画',
  dimension: '2点をクリックして寸法線を描画',
  measure: '2点で距離、3点で角度を計測',
};

export function DrawingStatusBar({ mousePosition, canvasWidth, canvasHeight }: DrawingStatusBarProps) {
  const { state, setZoom, zoomToFit, zoomToSelection } = useDrawing();

  const {
    currentTool,
    isDrawing,
    selectedIds,
    zoom,
    gridEnabled,
    snapToGrid,
    drawingShape,
    shapes,
  } = state;

  // ズームプリセット
  const zoomPresets = [25, 50, 75, 100, 150, 200, 400];

  const handleZoomChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setZoom(Number(e.target.value) / 100);
  };

  // ズームイン（+10%）
  const handleZoomIn = useCallback(() => {
    const newZoom = Math.min(zoom * 1.1, 4); // 最大400%
    setZoom(newZoom);
  }, [zoom, setZoom]);

  // ズームアウト（-10%）
  const handleZoomOut = useCallback(() => {
    const newZoom = Math.max(zoom * 0.9, 0.25); // 最小25%
    setZoom(newZoom);
  }, [zoom, setZoom]);

  // ズームリセット（100%）
  const handleZoomReset = useCallback(() => {
    setZoom(1);
  }, [setZoom]);

  // 全体表示
  const handleZoomToFit = useCallback(() => {
    if (canvasWidth && canvasHeight && shapes.length > 0) {
      zoomToFit(canvasWidth, canvasHeight);
    }
  }, [canvasWidth, canvasHeight, shapes.length, zoomToFit]);

  // 選択オブジェクトにズーム
  const handleZoomToSelection = useCallback(() => {
    if (canvasWidth && canvasHeight && selectedIds.length > 0) {
      zoomToSelection(canvasWidth, canvasHeight);
    }
  }, [canvasWidth, canvasHeight, selectedIds.length, zoomToSelection]);

  // 描画中の追加情報
  const getDrawingInfo = () => {
    if (!isDrawing || !drawingShape) return null;

    switch (drawingShape.type) {
      case 'circle': {
        const radius = (drawingShape as { radius?: number }).radius ?? 0;
        return `半径: ${radius.toFixed(1)}`;
      }
      case 'rect': {
        const width = (drawingShape as { width?: number }).width ?? 0;
        const height = (drawingShape as { height?: number }).height ?? 0;
        return `${width.toFixed(0)} × ${height.toFixed(0)}`;
      }
      case 'polygon': {
        const points = (drawingShape as { points?: number[] }).points ?? [];
        return `頂点: ${Math.floor(points.length / 2)}`;
      }
      default:
        return null;
    }
  };

  const drawingInfo = getDrawingInfo();

  return (
    <div className="drawing-status-bar">
      {/* ツール情報 */}
      <div className="drawing-status-item drawing-status-tool">
        <span className="drawing-status-tool-name">
          {TOOL_LABELS[currentTool]}
        </span>
        <span className="drawing-status-tool-hint">
          {TOOL_HINTS[currentTool]}
        </span>
      </div>

      {/* 座標 */}
      <div className="drawing-status-item drawing-status-coords">
        {mousePosition ? (
          <>
            <span>X: {mousePosition.x.toFixed(0)}</span>
            <span>Y: {mousePosition.y.toFixed(0)}</span>
          </>
        ) : (
          <span>---</span>
        )}
      </div>

      {/* 描画中情報 */}
      {drawingInfo && (
        <div className="drawing-status-item drawing-status-drawing">
          {drawingInfo}
        </div>
      )}

      {/* 選択情報 */}
      {selectedIds.length > 0 && (
        <div className="drawing-status-item drawing-status-selection">
          {selectedIds.length}個選択中
        </div>
      )}

      {/* グリッド・スナップ状態 */}
      <div className="drawing-status-item drawing-status-options">
        <span
          className={clsx(
            'drawing-status-icon',
            gridEnabled && 'drawing-status-icon-active'
          )}
          title="グリッド"
        >
          <Grid3X3 size={14} />
        </span>
        <span
          className={clsx(
            'drawing-status-icon',
            snapToGrid && 'drawing-status-icon-active'
          )}
          title="スナップ"
        >
          <Magnet size={14} />
        </span>
      </div>

      {/* ズーム */}
      <div className="drawing-status-item drawing-status-zoom">
        <button
          type="button"
          className="drawing-status-zoom-btn"
          onClick={handleZoomOut}
          title="ズームアウト (Ctrl+-)"
        >
          <ZoomOut size={14} />
        </button>
        <select
          className="drawing-status-zoom-select"
          value={Math.round(zoom * 100)}
          onChange={handleZoomChange}
          title="ズームレベル"
        >
          {zoomPresets.map((preset) => (
            <option key={preset} value={preset}>
              {preset}%
            </option>
          ))}
        </select>
        <button
          type="button"
          className="drawing-status-zoom-btn"
          onClick={handleZoomIn}
          title="ズームイン (Ctrl++)"
        >
          <ZoomIn size={14} />
        </button>
        <button
          type="button"
          className="drawing-status-zoom-btn"
          onClick={handleZoomReset}
          title="ズームリセット (Ctrl+0)"
        >
          <RotateCcw size={14} />
        </button>
        <button
          type="button"
          className="drawing-status-zoom-btn"
          onClick={handleZoomToFit}
          disabled={!canvasWidth || !canvasHeight || shapes.length === 0}
          title="全体表示"
        >
          <Maximize size={14} />
        </button>
        <button
          type="button"
          className="drawing-status-zoom-btn"
          onClick={handleZoomToSelection}
          disabled={!canvasWidth || !canvasHeight || selectedIds.length === 0}
          title="選択オブジェクトにズーム"
        >
          <Focus size={14} />
        </button>
      </div>
    </div>
  );
}
