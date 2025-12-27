/**
 * Guidelines Layer - ガイドラインの描画レイヤー
 */

import { Line, Group } from 'react-konva';
import { useDrawing } from './context/DrawingContext';

interface GuidelinesLayerProps {
  canvasWidth: number;
  canvasHeight: number;
  zoom: number;
  panX: number;
  panY: number;
}

export function GuidelinesLayer({
  canvasWidth,
  canvasHeight,
  zoom,
  panX,
  panY,
}: GuidelinesLayerProps) {
  const { state, removeGuideline, updateGuideline } = useDrawing();
  const { guidelines, guidesEnabled } = state;

  if (!guidesEnabled || guidelines.length === 0) {
    return null;
  }

  // キャンバス座標からガイドライン座標への変換を考慮
  // ガイドラインは無限に延びているように見せる

  return (
    <Group>
      {guidelines.map((guide) => {
        const isHorizontal = guide.type === 'horizontal';
        const color = guide.color || (isHorizontal ? '#10b981' : '#3b82f6');

        // 実際の描画位置を計算（ズームとパンを考慮）
        const actualPos = guide.position * zoom;

        // ガイドラインをキャンバス全体に描画
        const points = isHorizontal
          ? [-panX, actualPos + panY, canvasWidth - panX, actualPos + panY]
          : [actualPos + panX, -panY, actualPos + panX, canvasHeight - panY];

        return (
          <Line
            key={guide.id}
            points={points}
            stroke={color}
            strokeWidth={1}
            dash={[8, 4]}
            opacity={0.8}
            listening={!guide.locked}
            draggable={!guide.locked}
            onDragMove={(e) => {
              if (guide.locked) return;
              const node = e.target;
              if (isHorizontal) {
                const newY = (node.y() - panY) / zoom;
                updateGuideline(guide.id, { position: newY });
                node.y(0); // リセット
              } else {
                const newX = (node.x() - panX) / zoom;
                updateGuideline(guide.id, { position: newX });
                node.x(0); // リセット
              }
            }}
            onDblClick={() => {
              if (!guide.locked) {
                removeGuideline(guide.id);
              }
            }}
          />
        );
      })}
    </Group>
  );
}
