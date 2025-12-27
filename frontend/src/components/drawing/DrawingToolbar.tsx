/**
 * Drawing Toolbar - ツールバーコンポーネント
 */

import React, { useRef, useState, useCallback } from 'react';
import {
  MousePointer2,
  Minus,
  Circle,
  Square,
  Pentagon,
  Undo2,
  Redo2,
  Download,
  Trash2,
  Grid3X3,
  Magnet,
  XCircle,
  Type,
  MoveRight,
  Pencil,
  Copy,
  Scissors,
  Clipboard,
  ArrowUpToLine,
  ArrowDownToLine,
  ChevronUp,
  ChevronDown,
  Group,
  Ungroup,
  AlignLeft,
  AlignCenterHorizontal,
  AlignRight,
  AlignStartVertical,
  AlignCenterVertical,
  AlignEndVertical,
  AlignHorizontalSpaceAround,
  AlignVerticalSpaceAround,
  Target,
  Ruler,
  ImagePlus,
  FlipHorizontal2,
  FlipVertical2,
  Maximize2,
  Combine,
  Minus as SubtractIcon,
  Crosshair,
  X,
  PanelLeftClose,
  PanelTopClose,
  Eye,
  EyeOff,
} from 'lucide-react';
import clsx from 'clsx';
import { useDrawing } from './context/DrawingContext';
import type { ToolType, ExportFormat } from './types';

interface ToolButtonProps {
  icon: React.ReactNode;
  label: string;
  shortcut?: string;
  isActive?: boolean;
  disabled?: boolean;
  onClick: () => void;
}

function ToolButton({
  icon,
  label,
  shortcut,
  isActive,
  disabled,
  onClick,
}: ToolButtonProps) {
  return (
    <button
      type="button"
      className={clsx(
        'drawing-toolbar-btn',
        isActive && 'drawing-toolbar-btn-active',
        disabled && 'drawing-toolbar-btn-disabled'
      )}
      onClick={onClick}
      disabled={disabled}
      title={shortcut ? `${label} (${shortcut})` : label}
    >
      {icon}
    </button>
  );
}

function Divider() {
  return <div className="drawing-toolbar-divider" />;
}

// 円弧アイコン（カスタム）
function ArcIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 22c5.523 0 10-4.477 10-10h-5c0 2.761-2.239 5-5 5v5z" />
    </svg>
  );
}

interface DrawingToolbarProps {
  onExport?: (format: ExportFormat) => void;
}

export function DrawingToolbar({ onExport }: DrawingToolbarProps) {
  const {
    state,
    setTool,
    undo,
    redo,
    canUndo,
    canRedo,
    deleteSelected,
    toggleGrid,
    toggleSnap,
    toggleObjectSnap,
    toggleRuler,
    clearAll,
    copy,
    cut,
    paste,
    canPaste,
    bringToFront,
    sendToBack,
    bringForward,
    sendBackward,
    groupShapes,
    ungroupShape,
    canGroup,
    canUngroup,
    alignShapes,
    distributeShapes,
    canAlign,
    canDistribute,
    insertImage,
    flipHorizontal,
    flipVertical,
    scaleShapes,
    booleanUnion,
    booleanSubtract,
    booleanIntersect,
    canBooleanOperate,
    addGuideline,
    toggleGuides,
    toggleSnapToGuides,
    clearGuidelines,
  } = useDrawing();

  const { currentTool, selectedIds, gridEnabled, snapToGrid, objectSnapEnabled, rulerEnabled, guidesEnabled, snapToGuides, shapes } = state;

  // スケールダイアログの状態
  const [showScaleDialog, setShowScaleDialog] = useState(false);
  const [scalePercent, setScalePercent] = useState('100');

  // スケール適用ハンドラー
  const handleApplyScale = useCallback(() => {
    const percent = parseFloat(scalePercent);
    if (isNaN(percent) || percent <= 0) {
      alert('有効なパーセンテージを入力してください（0より大きい数値）');
      return;
    }
    scaleShapes(percent / 100);
    setShowScaleDialog(false);
    setScalePercent('100');
  }, [scalePercent, scaleShapes]);

  // 画像ファイル入力のref
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 画像ファイル選択ハンドラー
  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // 画像ファイルのみ許可
    if (!file.type.startsWith('image/')) {
      alert('画像ファイルを選択してください');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;

      // 画像のサイズを取得
      const img = new Image();
      img.onload = () => {
        // 最大サイズを制限（500px）
        const maxSize = 500;
        let width = img.width;
        let height = img.height;

        if (width > maxSize || height > maxSize) {
          const ratio = Math.min(maxSize / width, maxSize / height);
          width = Math.round(width * ratio);
          height = Math.round(height * ratio);
        }

        insertImage(dataUrl, width, height);
      };
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);

    // 入力をリセット（同じファイルを再選択可能に）
    e.target.value = '';
  };

  const tools: { type: ToolType; icon: React.ReactNode; label: string; shortcut: string }[] = [
    { type: 'select', icon: <MousePointer2 size={18} />, label: '選択', shortcut: 'V' },
    { type: 'line', icon: <Minus size={18} />, label: '線', shortcut: 'L' },
    { type: 'circle', icon: <Circle size={18} />, label: '円', shortcut: 'C' },
    { type: 'arc', icon: <ArcIcon />, label: '円弧', shortcut: 'A' },
    { type: 'rect', icon: <Square size={18} />, label: '矩形', shortcut: 'R' },
    { type: 'polygon', icon: <Pentagon size={18} />, label: '多角形', shortcut: 'P' },
    { type: 'text', icon: <Type size={18} />, label: 'テキスト', shortcut: 'T' },
    { type: 'arrow', icon: <MoveRight size={18} />, label: '矢印', shortcut: 'W' },
    { type: 'freehand', icon: <Pencil size={18} />, label: 'フリーハンド', shortcut: 'F' },
    { type: 'dimension', icon: <Ruler size={18} />, label: '寸法線', shortcut: 'D' },
    { type: 'measure', icon: <Target size={18} />, label: '計測', shortcut: 'M' },
  ];

  return (
    <div className="drawing-toolbar">
      {/* ツール選択 */}
      <div className="drawing-toolbar-group">
        {tools.map((tool) => (
          <ToolButton
            key={tool.type}
            icon={tool.icon}
            label={tool.label}
            shortcut={tool.shortcut}
            isActive={currentTool === tool.type}
            onClick={() => setTool(tool.type)}
          />
        ))}
      </div>

      <Divider />

      {/* 編集操作 */}
      <div className="drawing-toolbar-group">
        <ToolButton
          icon={<Undo2 size={18} />}
          label="元に戻す"
          shortcut="Ctrl+Z"
          disabled={!canUndo}
          onClick={undo}
        />
        <ToolButton
          icon={<Redo2 size={18} />}
          label="やり直す"
          shortcut="Ctrl+Y"
          disabled={!canRedo}
          onClick={redo}
        />
        <ToolButton
          icon={<Copy size={18} />}
          label="コピー"
          shortcut="Ctrl+C"
          disabled={selectedIds.length === 0}
          onClick={copy}
        />
        <ToolButton
          icon={<Scissors size={18} />}
          label="カット"
          shortcut="Ctrl+X"
          disabled={selectedIds.length === 0}
          onClick={cut}
        />
        <ToolButton
          icon={<Clipboard size={18} />}
          label="ペースト"
          shortcut="Ctrl+V"
          disabled={!canPaste}
          onClick={paste}
        />
        <ToolButton
          icon={<Trash2 size={18} />}
          label="削除"
          shortcut="Delete"
          disabled={selectedIds.length === 0}
          onClick={deleteSelected}
        />
        <ToolButton
          icon={<XCircle size={18} />}
          label="すべてクリア"
          disabled={shapes.length === 0}
          onClick={() => {
            if (shapes.length > 0 && window.confirm('すべての図形を削除しますか？')) {
              clearAll();
            }
          }}
        />
      </div>

      <Divider />

      {/* Z-order操作 */}
      <div className="drawing-toolbar-group">
        <ToolButton
          icon={<ArrowUpToLine size={18} />}
          label="最前面へ"
          disabled={selectedIds.length === 0}
          onClick={bringToFront}
        />
        <ToolButton
          icon={<ChevronUp size={18} />}
          label="前面へ"
          disabled={selectedIds.length === 0}
          onClick={bringForward}
        />
        <ToolButton
          icon={<ChevronDown size={18} />}
          label="背面へ"
          disabled={selectedIds.length === 0}
          onClick={sendBackward}
        />
        <ToolButton
          icon={<ArrowDownToLine size={18} />}
          label="最背面へ"
          disabled={selectedIds.length === 0}
          onClick={sendToBack}
        />
      </div>

      <Divider />

      {/* グループ化 */}
      <div className="drawing-toolbar-group">
        <ToolButton
          icon={<Group size={18} />}
          label="グループ化"
          shortcut="Ctrl+G"
          disabled={!canGroup}
          onClick={groupShapes}
        />
        <ToolButton
          icon={<Ungroup size={18} />}
          label="グループ解除"
          shortcut="Ctrl+Shift+G"
          disabled={!canUngroup}
          onClick={ungroupShape}
        />
      </div>

      <Divider />

      {/* 整列 */}
      <div className="drawing-toolbar-group">
        <ToolButton
          icon={<AlignLeft size={18} />}
          label="左揃え"
          disabled={!canAlign}
          onClick={() => alignShapes('left')}
        />
        <ToolButton
          icon={<AlignCenterHorizontal size={18} />}
          label="中央揃え（水平）"
          disabled={!canAlign}
          onClick={() => alignShapes('center')}
        />
        <ToolButton
          icon={<AlignRight size={18} />}
          label="右揃え"
          disabled={!canAlign}
          onClick={() => alignShapes('right')}
        />
        <ToolButton
          icon={<AlignStartVertical size={18} />}
          label="上揃え"
          disabled={!canAlign}
          onClick={() => alignShapes('top')}
        />
        <ToolButton
          icon={<AlignCenterVertical size={18} />}
          label="中央揃え（垂直）"
          disabled={!canAlign}
          onClick={() => alignShapes('middle')}
        />
        <ToolButton
          icon={<AlignEndVertical size={18} />}
          label="下揃え"
          disabled={!canAlign}
          onClick={() => alignShapes('bottom')}
        />
      </div>

      <Divider />

      {/* 配置 */}
      <div className="drawing-toolbar-group">
        <ToolButton
          icon={<AlignHorizontalSpaceAround size={18} />}
          label="水平方向に均等配置"
          disabled={!canDistribute}
          onClick={() => distributeShapes('horizontal')}
        />
        <ToolButton
          icon={<AlignVerticalSpaceAround size={18} />}
          label="垂直方向に均等配置"
          disabled={!canDistribute}
          onClick={() => distributeShapes('vertical')}
        />
      </div>

      <Divider />

      {/* 変形 */}
      <div className="drawing-toolbar-group">
        <ToolButton
          icon={<FlipHorizontal2 size={18} />}
          label="水平反転"
          shortcut="H"
          disabled={selectedIds.length === 0}
          onClick={flipHorizontal}
        />
        <ToolButton
          icon={<FlipVertical2 size={18} />}
          label="垂直反転"
          shortcut="J"
          disabled={selectedIds.length === 0}
          onClick={flipVertical}
        />
        <ToolButton
          icon={<Maximize2 size={18} />}
          label="スケール"
          disabled={selectedIds.length === 0}
          onClick={() => setShowScaleDialog(true)}
        />
      </div>

      <Divider />

      {/* ブーリアン演算 */}
      <div className="drawing-toolbar-group">
        <ToolButton
          icon={<Combine size={18} />}
          label="合体"
          disabled={!canBooleanOperate}
          onClick={booleanUnion}
        />
        <ToolButton
          icon={<SubtractIcon size={18} />}
          label="切り抜き"
          disabled={!canBooleanOperate}
          onClick={booleanSubtract}
        />
        <ToolButton
          icon={<Crosshair size={18} />}
          label="交差"
          disabled={!canBooleanOperate}
          onClick={booleanIntersect}
        />
      </div>

      <Divider />

      {/* 表示オプション */}
      <div className="drawing-toolbar-group">
        <ToolButton
          icon={<Grid3X3 size={18} />}
          label="グリッド"
          shortcut="G"
          isActive={gridEnabled}
          onClick={toggleGrid}
        />
        <ToolButton
          icon={<Magnet size={18} />}
          label="グリッドスナップ"
          isActive={snapToGrid}
          onClick={toggleSnap}
        />
        <ToolButton
          icon={<Target size={18} />}
          label="オブジェクトスナップ"
          isActive={objectSnapEnabled}
          onClick={toggleObjectSnap}
        />
        <ToolButton
          icon={<Ruler size={18} />}
          label="ルーラー"
          isActive={rulerEnabled}
          onClick={toggleRuler}
        />
      </div>

      <Divider />

      {/* ガイドライン */}
      <div className="drawing-toolbar-group">
        <ToolButton
          icon={guidesEnabled ? <Eye size={18} /> : <EyeOff size={18} />}
          label="ガイドライン表示"
          isActive={guidesEnabled}
          onClick={toggleGuides}
        />
        <ToolButton
          icon={<Magnet size={18} />}
          label="ガイドスナップ"
          isActive={snapToGuides}
          onClick={toggleSnapToGuides}
        />
        <ToolButton
          icon={<PanelTopClose size={18} />}
          label="水平ガイド追加"
          onClick={() => addGuideline('horizontal', 200)}
        />
        <ToolButton
          icon={<PanelLeftClose size={18} />}
          label="垂直ガイド追加"
          onClick={() => addGuideline('vertical', 200)}
        />
        <ToolButton
          icon={<Trash2 size={18} />}
          label="ガイドクリア"
          onClick={clearGuidelines}
        />
      </div>

      <Divider />

      {/* 画像挿入・エクスポート */}
      <div className="drawing-toolbar-group">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          style={{ display: 'none' }}
          onChange={handleImageSelect}
        />
        <ToolButton
          icon={<ImagePlus size={18} />}
          label="画像を挿入"
          shortcut="Ctrl+I"
          onClick={() => fileInputRef.current?.click()}
        />
        <ToolButton
          icon={<Download size={18} />}
          label="エクスポート"
          shortcut="Ctrl+E"
          onClick={() => onExport?.('png')}
        />
      </div>

      {/* スケールダイアログ */}
      {showScaleDialog && (
        <div className="drawing-scale-dialog-overlay" onClick={() => setShowScaleDialog(false)}>
          <div className="drawing-scale-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="drawing-scale-dialog-header">
              <h4>スケール</h4>
              <button
                type="button"
                className="drawing-scale-dialog-close"
                onClick={() => setShowScaleDialog(false)}
              >
                <X size={16} />
              </button>
            </div>
            <div className="drawing-scale-dialog-content">
              <label>
                <span>倍率 (%)</span>
                <input
                  type="number"
                  value={scalePercent}
                  onChange={(e) => setScalePercent(e.target.value)}
                  min="1"
                  max="1000"
                  step="10"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleApplyScale();
                    }
                    if (e.key === 'Escape') {
                      setShowScaleDialog(false);
                    }
                  }}
                />
              </label>
              <div className="drawing-scale-dialog-presets">
                {[50, 75, 100, 125, 150, 200].map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    className={clsx(
                      'drawing-scale-preset-btn',
                      scalePercent === String(preset) && 'active'
                    )}
                    onClick={() => setScalePercent(String(preset))}
                  >
                    {preset}%
                  </button>
                ))}
              </div>
            </div>
            <div className="drawing-scale-dialog-footer">
              <button
                type="button"
                className="drawing-scale-dialog-btn cancel"
                onClick={() => setShowScaleDialog(false)}
              >
                キャンセル
              </button>
              <button
                type="button"
                className="drawing-scale-dialog-btn apply"
                onClick={handleApplyScale}
              >
                適用
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
