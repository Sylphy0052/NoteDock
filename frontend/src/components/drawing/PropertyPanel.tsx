/**
 * Property Panel - プロパティパネル
 * 選択図形の位置・サイズ・回転を数値で編集
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Settings, RotateCw, Move, Maximize2, Circle as CircleIcon, Square } from 'lucide-react';
import { useDrawing } from './context/DrawingContext';
import type { Shape, CircleShape, RectShape, ArcShape, ImageShape } from './types';

interface NumberInputProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  unit?: string;
  disabled?: boolean;
}

function NumberInput({
  label,
  value,
  onChange,
  min,
  max,
  step = 1,
  unit = 'px',
  disabled = false,
}: NumberInputProps) {
  const [inputValue, setInputValue] = useState(value.toString());

  useEffect(() => {
    setInputValue(Math.round(value * 100) / 100 + '');
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
  };

  const handleBlur = () => {
    const numValue = parseFloat(inputValue);
    if (!isNaN(numValue)) {
      let newValue = numValue;
      if (min !== undefined) newValue = Math.max(min, newValue);
      if (max !== undefined) newValue = Math.min(max, newValue);
      onChange(newValue);
      setInputValue(Math.round(newValue * 100) / 100 + '');
    } else {
      setInputValue(Math.round(value * 100) / 100 + '');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleBlur();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      const newValue = value + step;
      if (max === undefined || newValue <= max) {
        onChange(newValue);
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      const newValue = value - step;
      if (min === undefined || newValue >= min) {
        onChange(newValue);
      }
    }
  };

  return (
    <div className="property-input-group">
      <label className="property-input-label">{label}</label>
      <div className="property-input-wrapper">
        <input
          type="text"
          className="property-input"
          value={inputValue}
          onChange={handleChange}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          disabled={disabled}
        />
        <span className="property-input-unit">{unit}</span>
      </div>
    </div>
  );
}

// 図形のバウンディングボックスを計算
function getShapeBounds(shape: Shape): { x: number; y: number; width: number; height: number } {
  switch (shape.type) {
    case 'rect':
    case 'image':
      return {
        x: shape.x,
        y: shape.y,
        width: shape.width,
        height: shape.height,
      };
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
    case 'polygon':
    case 'freehand': {
      const points = shape.points;
      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
      for (let i = 0; i < points.length; i += 2) {
        minX = Math.min(minX, points[i]);
        maxX = Math.max(maxX, points[i]);
        minY = Math.min(minY, points[i + 1]);
        maxY = Math.max(maxY, points[i + 1]);
      }
      return {
        x: shape.x + minX,
        y: shape.y + minY,
        width: maxX - minX,
        height: maxY - minY,
      };
    }
    case 'text':
      // テキストのサイズは推定
      return {
        x: shape.x,
        y: shape.y,
        width: shape.text.length * shape.fontSize * 0.6,
        height: shape.fontSize * 1.2,
      };
    case 'group':
      return {
        x: shape.x,
        y: shape.y,
        width: shape.width,
        height: shape.height,
      };
  }
}

export function PropertyPanel() {
  const { state, updateShape, saveHistory } = useDrawing();
  const { selectedIds, shapes } = state;

  const selectedShape = selectedIds.length === 1
    ? shapes.find((s) => s.id === selectedIds[0])
    : null;

  const bounds = selectedShape ? getShapeBounds(selectedShape) : null;

  // 位置の更新
  const handlePositionChange = useCallback((axis: 'x' | 'y', value: number) => {
    if (!selectedShape) return;

    let changes: Partial<Shape>;

    switch (selectedShape.type) {
      case 'circle':
      case 'arc':
        // 円・弧は中心座標なので、左上からの差分を計算
        if (axis === 'x') {
          changes = { x: value + (selectedShape as CircleShape | ArcShape).radius };
        } else {
          changes = { y: value + (selectedShape as CircleShape | ArcShape).radius };
        }
        break;
      case 'rect':
      case 'text':
      case 'image':
      case 'group':
        changes = { [axis]: value };
        break;
      case 'line':
      case 'arrow':
      case 'dimension': {
        const [x1, y1, x2, y2] = selectedShape.points;
        const minX = Math.min(x1, x2);
        const minY = Math.min(y1, y2);
        if (axis === 'x') {
          changes = { x: value - minX };
        } else {
          changes = { y: value - minY };
        }
        break;
      }
      case 'polygon':
      case 'freehand': {
        const points = selectedShape.points;
        let minX = Infinity, minY = Infinity;
        for (let i = 0; i < points.length; i += 2) {
          minX = Math.min(minX, points[i]);
          minY = Math.min(minY, points[i + 1]);
        }
        if (axis === 'x') {
          changes = { x: value - minX };
        } else {
          changes = { y: value - minY };
        }
        break;
      }
      default:
        changes = { [axis]: value };
    }

    updateShape(selectedShape.id, changes);
    saveHistory();
  }, [selectedShape, updateShape, saveHistory]);

  // サイズの更新
  const handleSizeChange = useCallback((dimension: 'width' | 'height', value: number) => {
    if (!selectedShape || value <= 0) return;

    let changes: Partial<Shape>;

    switch (selectedShape.type) {
      case 'circle': {
        // 円は半径を更新
        const radius = dimension === 'width' ? value / 2 : value / 2;
        changes = { radius };
        break;
      }
      case 'arc': {
        const radius = dimension === 'width' ? value / 2 : value / 2;
        changes = { radius };
        break;
      }
      case 'rect':
        changes = { [dimension]: value };
        break;
      case 'image': {
        const img = selectedShape as ImageShape;
        if (dimension === 'width') {
          // アスペクト比を維持
          const newHeight = value / img.aspectRatio;
          changes = { width: value, height: newHeight };
        } else {
          const newWidth = value * img.aspectRatio;
          changes = { width: newWidth, height: value };
        }
        break;
      }
      default:
        // 他の図形タイプはスケールで対応
        return;
    }

    updateShape(selectedShape.id, changes);
    saveHistory();
  }, [selectedShape, updateShape, saveHistory]);

  // 回転の更新
  const handleRotationChange = useCallback((value: number) => {
    if (!selectedShape) return;
    updateShape(selectedShape.id, { rotation: value });
    saveHistory();
  }, [selectedShape, updateShape, saveHistory]);

  // 円の半径の更新
  const handleRadiusChange = useCallback((value: number) => {
    if (!selectedShape || (selectedShape.type !== 'circle' && selectedShape.type !== 'arc')) return;
    if (value <= 0) return;
    updateShape(selectedShape.id, { radius: value });
    saveHistory();
  }, [selectedShape, updateShape, saveHistory]);

  // 矩形の角丸の更新
  const handleCornerRadiusChange = useCallback((value: number) => {
    if (!selectedShape || selectedShape.type !== 'rect') return;
    if (value < 0) return;
    updateShape(selectedShape.id, { cornerRadius: value });
    saveHistory();
  }, [selectedShape, updateShape, saveHistory]);

  if (selectedIds.length === 0) {
    return (
      <div className="property-panel">
        <div className="property-panel-header">
          <Settings size={14} />
          <span>プロパティ</span>
        </div>
        <div className="property-panel-empty">
          図形を選択してください
        </div>
      </div>
    );
  }

  if (selectedIds.length > 1) {
    return (
      <div className="property-panel">
        <div className="property-panel-header">
          <Settings size={14} />
          <span>プロパティ</span>
        </div>
        <div className="property-panel-info">
          <span>{selectedIds.length}個の図形を選択中</span>
        </div>
      </div>
    );
  }

  if (!selectedShape || !bounds) {
    return null;
  }

  const canEditSize = ['rect', 'circle', 'arc', 'image'].includes(selectedShape.type);

  return (
    <div className="property-panel">
      <div className="property-panel-header">
        <Settings size={14} />
        <span>プロパティ</span>
      </div>

      {/* 位置 */}
      <div className="property-section">
        <div className="property-section-header">
          <Move size={12} />
          <span>位置</span>
        </div>
        <div className="property-row">
          <NumberInput
            label="X"
            value={bounds.x}
            onChange={(v) => handlePositionChange('x', v)}
          />
          <NumberInput
            label="Y"
            value={bounds.y}
            onChange={(v) => handlePositionChange('y', v)}
          />
        </div>
      </div>

      {/* サイズ */}
      <div className="property-section">
        <div className="property-section-header">
          <Maximize2 size={12} />
          <span>サイズ</span>
        </div>
        <div className="property-row">
          <NumberInput
            label="W"
            value={bounds.width}
            onChange={(v) => handleSizeChange('width', v)}
            min={1}
            disabled={!canEditSize}
          />
          <NumberInput
            label="H"
            value={bounds.height}
            onChange={(v) => handleSizeChange('height', v)}
            min={1}
            disabled={!canEditSize}
          />
        </div>
      </div>

      {/* 回転 */}
      <div className="property-section">
        <div className="property-section-header">
          <RotateCw size={12} />
          <span>回転</span>
        </div>
        <div className="property-row">
          <NumberInput
            label="角度"
            value={selectedShape.rotation}
            onChange={handleRotationChange}
            min={-360}
            max={360}
            step={1}
            unit="°"
          />
        </div>
      </div>

      {/* 図形固有のプロパティ */}
      {(selectedShape.type === 'circle' || selectedShape.type === 'arc') && (
        <div className="property-section">
          <div className="property-section-header">
            <CircleIcon size={12} />
            <span>円</span>
          </div>
          <div className="property-row">
            <NumberInput
              label="半径"
              value={(selectedShape as CircleShape | ArcShape).radius}
              onChange={handleRadiusChange}
              min={1}
            />
          </div>
        </div>
      )}

      {selectedShape.type === 'rect' && (
        <div className="property-section">
          <div className="property-section-header">
            <Square size={12} />
            <span>矩形</span>
          </div>
          <div className="property-row">
            <NumberInput
              label="角丸"
              value={(selectedShape as RectShape).cornerRadius || 0}
              onChange={handleCornerRadiusChange}
              min={0}
            />
          </div>
        </div>
      )}
    </div>
  );
}
