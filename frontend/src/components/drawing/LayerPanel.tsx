/**
 * Layer Panel - レイヤーパネル
 * 図形のリスト表示、選択、可視性・ロック状態の切り替え
 */

import React, { useCallback } from 'react';
import {
  Eye,
  EyeOff,
  Lock,
  Unlock,
  Minus,
  Circle,
  Square,
  Pentagon,
  Type,
  MoveRight,
  Pencil,
  Image as ImageIcon,
  Ruler,
  Group,
  Layers,
} from 'lucide-react';
import clsx from 'clsx';
import { useDrawing } from './context/DrawingContext';
import type { Shape, ShapeType } from './types';

// 円弧アイコン（カスタム）
function ArcIcon({ size = 14 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
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

// 図形タイプに応じたアイコンを返す
function getShapeIcon(type: ShapeType) {
  const iconProps = { size: 14 };
  switch (type) {
    case 'line':
      return <Minus {...iconProps} />;
    case 'circle':
      return <Circle {...iconProps} />;
    case 'arc':
      return <ArcIcon size={14} />;
    case 'rect':
      return <Square {...iconProps} />;
    case 'polygon':
      return <Pentagon {...iconProps} />;
    case 'text':
      return <Type {...iconProps} />;
    case 'arrow':
      return <MoveRight {...iconProps} />;
    case 'freehand':
      return <Pencil {...iconProps} />;
    case 'dimension':
      return <Ruler {...iconProps} />;
    case 'image':
      return <ImageIcon {...iconProps} />;
    case 'group':
      return <Group {...iconProps} />;
    default:
      return <Layers {...iconProps} />;
  }
}

// 図形タイプの日本語名を返す
function getShapeTypeName(type: ShapeType): string {
  switch (type) {
    case 'line':
      return '線';
    case 'circle':
      return '円';
    case 'arc':
      return '円弧';
    case 'rect':
      return '矩形';
    case 'polygon':
      return '多角形';
    case 'text':
      return 'テキスト';
    case 'arrow':
      return '矢印';
    case 'freehand':
      return 'フリーハンド';
    case 'dimension':
      return '寸法線';
    case 'image':
      return '画像';
    case 'group':
      return 'グループ';
    default:
      return '図形';
  }
}

// 図形アイテムコンポーネント
interface LayerItemProps {
  shape: Shape;
  isSelected: boolean;
  onSelect: (id: string, multiSelect: boolean) => void;
  onToggleVisibility: (id: string) => void;
  onToggleLock: (id: string) => void;
}

function LayerItem({
  shape,
  isSelected,
  onSelect,
  onToggleVisibility,
  onToggleLock,
}: LayerItemProps) {
  const handleClick = (e: React.MouseEvent) => {
    onSelect(shape.id, e.ctrlKey || e.metaKey || e.shiftKey);
  };

  return (
    <div
      className={clsx(
        'layer-item',
        isSelected && 'layer-item-selected',
        !shape.visible && 'layer-item-hidden',
        shape.locked && 'layer-item-locked'
      )}
      onClick={handleClick}
    >
      <div className="layer-item-icon">{getShapeIcon(shape.type)}</div>
      <div className="layer-item-name">
        {getShapeTypeName(shape.type)}
        {shape.type === 'text' && shape.text && (
          <span className="layer-item-text-preview">: {shape.text.substring(0, 10)}...</span>
        )}
      </div>
      <div className="layer-item-actions">
        <button
          type="button"
          className="layer-item-action-btn"
          onClick={(e) => {
            e.stopPropagation();
            onToggleVisibility(shape.id);
          }}
          title={shape.visible ? '非表示にする' : '表示する'}
        >
          {shape.visible ? <Eye size={12} /> : <EyeOff size={12} />}
        </button>
        <button
          type="button"
          className="layer-item-action-btn"
          onClick={(e) => {
            e.stopPropagation();
            onToggleLock(shape.id);
          }}
          title={shape.locked ? 'ロック解除' : 'ロック'}
        >
          {shape.locked ? <Lock size={12} /> : <Unlock size={12} />}
        </button>
      </div>
    </div>
  );
}

export function LayerPanel() {
  const { state, dispatch } = useDrawing();
  const { shapes, selectedIds } = state;

  // 図形を選択
  const handleSelect = useCallback(
    (id: string, multiSelect: boolean) => {
      if (multiSelect) {
        // 複数選択モード
        const newSelectedIds = selectedIds.includes(id)
          ? selectedIds.filter((sid) => sid !== id)
          : [...selectedIds, id];
        dispatch({ type: 'SELECT_SHAPES', payload: newSelectedIds });
      } else {
        dispatch({ type: 'SELECT_SHAPES', payload: [id] });
      }
    },
    [dispatch, selectedIds]
  );

  // 可視性を切り替え
  const handleToggleVisibility = useCallback(
    (id: string) => {
      dispatch({ type: 'TOGGLE_VISIBILITY', payload: id });
    },
    [dispatch]
  );

  // ロック状態を切り替え
  const handleToggleLock = useCallback(
    (id: string) => {
      dispatch({ type: 'TOGGLE_LOCK', payload: id });
    },
    [dispatch]
  );

  // Z-orderの逆順（上にあるものが先に表示）で表示
  const reversedShapes = [...shapes].reverse();

  return (
    <div className="layer-panel">
      <div className="layer-panel-header">
        <Layers size={14} />
        <span>レイヤー</span>
        <span className="layer-panel-count">{shapes.length}</span>
      </div>
      <div className="layer-panel-list">
        {reversedShapes.length === 0 ? (
          <div className="layer-panel-empty">図形がありません</div>
        ) : (
          reversedShapes.map((shape) => (
            <LayerItem
              key={shape.id}
              shape={shape}
              isSelected={selectedIds.includes(shape.id)}
              onSelect={handleSelect}
              onToggleVisibility={handleToggleVisibility}
              onToggleLock={handleToggleLock}
            />
          ))
        )}
      </div>
    </div>
  );
}
