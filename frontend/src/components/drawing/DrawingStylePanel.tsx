/**
 * Drawing Style Panel - スタイル設定パネル
 */

import { useState } from 'react';
import clsx from 'clsx';
import { useDrawing } from './context/DrawingContext';
import { PRESET_COLORS, STROKE_WIDTHS, LINE_DASH_PATTERNS, PRESET_GRADIENTS, type LineStyleType, type GradientFill } from './types';

interface ColorPickerProps {
  label: string;
  value: string | null;
  onChange: (color: string | null) => void;
  allowNone?: boolean;
}

function ColorPicker({ label, value, onChange, allowNone }: ColorPickerProps) {
  const [showPicker, setShowPicker] = useState(false);

  return (
    <div className="drawing-style-item">
      <label className="drawing-style-label">{label}</label>
      <div className="drawing-color-picker-wrapper">
        <button
          type="button"
          className="drawing-color-preview"
          style={{
            backgroundColor: value || 'transparent',
            backgroundImage: value ? undefined : 'linear-gradient(135deg, #fff 45%, #f00 45%, #f00 55%, #fff 55%)',
          }}
          onClick={() => setShowPicker(!showPicker)}
          title={value || 'なし'}
        />
        {showPicker && (
          <div className="drawing-color-picker-dropdown">
            {allowNone && (
              <button
                type="button"
                className={clsx(
                  'drawing-color-swatch',
                  'drawing-color-swatch-none',
                  value === null && 'drawing-color-swatch-selected'
                )}
                onClick={() => {
                  onChange(null);
                  setShowPicker(false);
                }}
                title="なし"
              >
                ✕
              </button>
            )}
            {PRESET_COLORS.map((color) => (
              <button
                key={color}
                type="button"
                className={clsx(
                  'drawing-color-swatch',
                  value === color && 'drawing-color-swatch-selected'
                )}
                style={{ backgroundColor: color }}
                onClick={() => {
                  onChange(color);
                  setShowPicker(false);
                }}
                title={color}
              />
            ))}
            <input
              type="color"
              className="drawing-color-input"
              value={value || '#000000'}
              onChange={(e) => {
                onChange(e.target.value);
              }}
            />
          </div>
        )}
      </div>
    </div>
  );
}

interface StrokeWidthPickerProps {
  value: number;
  onChange: (width: number) => void;
}

function StrokeWidthPicker({ value, onChange }: StrokeWidthPickerProps) {
  return (
    <div className="drawing-style-item">
      <label className="drawing-style-label">線幅</label>
      <div className="drawing-stroke-width-picker">
        <select
          className="drawing-stroke-width-select"
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
        >
          {STROKE_WIDTHS.map((w) => (
            <option key={w} value={w}>
              {w}px
            </option>
          ))}
        </select>
        <div className="drawing-stroke-preview">
          <div
            className="drawing-stroke-preview-line"
            style={{ height: Math.min(value, 10) }}
          />
        </div>
      </div>
    </div>
  );
}

interface LineStylePickerProps {
  value: LineStyleType;
  onChange: (style: LineStyleType) => void;
}

const LINE_STYLE_OPTIONS: { value: LineStyleType; label: string }[] = [
  { value: 'solid', label: '実線' },
  { value: 'dashed', label: '破線' },
  { value: 'dotted', label: '点線' },
  { value: 'dashdot', label: '一点鎖線' },
];

function LineStylePicker({ value, onChange }: LineStylePickerProps) {
  return (
    <div className="drawing-style-item">
      <label className="drawing-style-label">線種</label>
      <div className="drawing-line-style-picker">
        {LINE_STYLE_OPTIONS.map((option) => {
          const dashPattern = LINE_DASH_PATTERNS[option.value];
          const strokeDasharray = dashPattern.length > 0 ? dashPattern.join(',') : 'none';
          return (
            <button
              key={option.value}
              type="button"
              className={clsx(
                'drawing-line-style-option',
                value === option.value && 'drawing-line-style-option-selected'
              )}
              onClick={() => onChange(option.value)}
              title={option.label}
            >
              <svg width="40" height="16" viewBox="0 0 40 16">
                <line
                  x1="4"
                  y1="8"
                  x2="36"
                  y2="8"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeDasharray={strokeDasharray}
                />
              </svg>
            </button>
          );
        })}
      </div>
    </div>
  );
}

interface GradientPickerProps {
  value: GradientFill | undefined | null;
  solidFill: string | undefined | null;
  onChange: (gradient: GradientFill | null) => void;
}

function GradientPicker({ value, solidFill, onChange }: GradientPickerProps) {
  const [showPicker, setShowPicker] = useState(false);

  // グラデーションのCSS表現を生成
  const getGradientCSS = (gradient: GradientFill): string => {
    const stops = gradient.colorStops
      .map((stop) => `${stop.color} ${stop.offset * 100}%`)
      .join(', ');
    if (gradient.type === 'linear') {
      const angle = gradient.angle ?? 0;
      return `linear-gradient(${angle}deg, ${stops})`;
    } else {
      return `radial-gradient(circle, ${stops})`;
    }
  };

  // 現在の表示用スタイル
  const previewStyle = value
    ? { backgroundImage: getGradientCSS(value) }
    : solidFill
      ? { backgroundColor: solidFill }
      : { backgroundImage: 'linear-gradient(135deg, #fff 45%, #ccc 45%, #ccc 55%, #fff 55%)' };

  return (
    <div className="drawing-style-item">
      <label className="drawing-style-label">グラデーション</label>
      <div className="drawing-color-picker-wrapper">
        <button
          type="button"
          className="drawing-color-preview drawing-gradient-preview"
          style={previewStyle}
          onClick={() => setShowPicker(!showPicker)}
          title={value ? `${value.type}グラデーション` : 'なし'}
        />
        {showPicker && (
          <div className="drawing-color-picker-dropdown drawing-gradient-dropdown">
            <button
              type="button"
              className={clsx(
                'drawing-color-swatch',
                'drawing-color-swatch-none',
                !value && 'drawing-color-swatch-selected'
              )}
              onClick={() => {
                onChange(null);
                setShowPicker(false);
              }}
              title="なし（単色に戻す）"
            >
              ✕
            </button>
            {PRESET_GRADIENTS.map((preset, index) => (
              <button
                key={index}
                type="button"
                className={clsx(
                  'drawing-gradient-swatch',
                  value && value.type === preset.gradient.type &&
                  JSON.stringify(value.colorStops) === JSON.stringify(preset.gradient.colorStops) &&
                  'drawing-gradient-swatch-selected'
                )}
                style={{ backgroundImage: getGradientCSS(preset.gradient) }}
                onClick={() => {
                  onChange(preset.gradient);
                  setShowPicker(false);
                }}
                title={preset.name}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export function DrawingStylePanel() {
  const { state, setStroke, setStrokeWidth, setFill, setStyle, setGradientFill, updateShape, saveHistory } =
    useDrawing();

  const { currentStyle, selectedIds, shapes } = state;

  // 選択中の図形があればそのスタイルを表示
  const selectedShape = selectedIds.length === 1
    ? shapes.find((s) => s.id === selectedIds[0])
    : null;

  const displayStroke = selectedShape?.stroke ?? currentStyle.stroke;
  const displayStrokeWidth = selectedShape?.strokeWidth ?? currentStyle.strokeWidth;
  const displayFill = selectedShape?.fill ?? currentStyle.fill;
  const displayLineStyle = selectedShape?.lineStyle ?? currentStyle.lineStyle;
  const displayGradientFill = selectedShape?.gradientFill ?? currentStyle.gradientFill;

  const handleStrokeChange = (color: string | null) => {
    if (color === null) return; // 線色は必須
    setStroke(color);
    if (selectedShape) {
      updateShape(selectedShape.id, { stroke: color });
      saveHistory();
    }
  };

  const handleStrokeWidthChange = (width: number) => {
    setStrokeWidth(width);
    if (selectedShape) {
      updateShape(selectedShape.id, { strokeWidth: width });
      saveHistory();
    }
  };

  const handleFillChange = (color: string | null) => {
    setFill(color);
    if (selectedShape) {
      updateShape(selectedShape.id, { fill: color ?? undefined });
      saveHistory();
    }
  };

  const handleLineStyleChange = (lineStyle: LineStyleType) => {
    setStyle({ lineStyle });
    if (selectedShape) {
      updateShape(selectedShape.id, { lineStyle });
      saveHistory();
    }
  };

  const handleGradientChange = (gradient: GradientFill | null) => {
    if (gradient) {
      setGradientFill(gradient);
      if (selectedShape) {
        updateShape(selectedShape.id, { gradientFill: gradient, fill: undefined });
        saveHistory();
      }
    } else {
      // グラデーションを解除（nullをundefinedに変換）
      setGradientFill(null);
      if (selectedShape) {
        updateShape(selectedShape.id, { gradientFill: undefined });
        saveHistory();
      }
    }
  };

  return (
    <div className="drawing-style-panel">
      <div className="drawing-style-panel-header">
        スタイル
        {selectedShape && (
          <span className="drawing-style-panel-hint">
            (選択中)
          </span>
        )}
      </div>

      <ColorPicker
        label="線色"
        value={displayStroke}
        onChange={handleStrokeChange}
      />

      <StrokeWidthPicker
        value={displayStrokeWidth}
        onChange={handleStrokeWidthChange}
      />

      <LineStylePicker
        value={displayLineStyle}
        onChange={handleLineStyleChange}
      />

      <ColorPicker
        label="塗り"
        value={displayFill ?? null}
        onChange={handleFillChange}
        allowNone
      />

      <GradientPicker
        value={displayGradientFill}
        solidFill={displayFill}
        onChange={handleGradientChange}
      />
    </div>
  );
}
