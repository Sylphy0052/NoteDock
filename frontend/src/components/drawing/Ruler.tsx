/**
 * Ruler - キャンバスのルーラー（定規）コンポーネント
 * 上端と左端に目盛りを表示
 */

import { useMemo } from 'react';
import { useDrawing } from './context/DrawingContext';

interface RulerProps {
  width: number;
  height: number;
  mousePosition?: { x: number; y: number } | null;
}

const RULER_SIZE = 20; // ルーラーの幅/高さ

// 目盛り間隔を計算（ズームに応じて調整）
function getTickInterval(zoom: number): number {
  const baseInterval = 50;
  if (zoom >= 2) return baseInterval / 2;
  if (zoom >= 1) return baseInterval;
  if (zoom >= 0.5) return baseInterval * 2;
  return baseInterval * 4;
}

// 小目盛りの間隔
function getSubTickInterval(tickInterval: number): number {
  return tickInterval / 5;
}

interface HorizontalRulerProps {
  width: number;
  zoom: number;
  panX: number;
  mouseX?: number | null;
}

function HorizontalRuler({ width, zoom, panX, mouseX }: HorizontalRulerProps) {
  const tickInterval = getTickInterval(zoom);
  const subTickInterval = getSubTickInterval(tickInterval);

  const ticks = useMemo(() => {
    const result: { position: number; value: number; isMajor: boolean }[] = [];

    // 画面外から開始して余裕を持たせる
    const startValue = Math.floor((-panX / zoom - RULER_SIZE) / subTickInterval) * subTickInterval;
    const endValue = Math.ceil(((width - RULER_SIZE - panX) / zoom + 100) / subTickInterval) * subTickInterval;

    for (let value = startValue; value <= endValue; value += subTickInterval) {
      const position = RULER_SIZE + value * zoom + panX;
      if (position >= RULER_SIZE && position <= width) {
        const isMajor = Math.abs(value % tickInterval) < 0.01;
        result.push({ position, value: Math.round(value), isMajor });
      }
    }

    return result;
  }, [width, zoom, panX, tickInterval, subTickInterval]);

  return (
    <div className="ruler ruler-horizontal" style={{ width, height: RULER_SIZE }}>
      <svg width={width} height={RULER_SIZE}>
        {/* 背景 */}
        <rect x={0} y={0} width={width} height={RULER_SIZE} fill="var(--color-bg-secondary)" />

        {/* コーナー */}
        <rect x={0} y={0} width={RULER_SIZE} height={RULER_SIZE} fill="var(--color-bg-tertiary)" />

        {/* 目盛り線 */}
        {ticks.map((tick, index) => (
          <g key={index}>
            <line
              x1={tick.position}
              y1={tick.isMajor ? 0 : RULER_SIZE - 6}
              x2={tick.position}
              y2={RULER_SIZE}
              stroke="var(--color-border)"
              strokeWidth={tick.isMajor ? 1 : 0.5}
            />
            {tick.isMajor && (
              <text
                x={tick.position + 2}
                y={10}
                fill="var(--color-text-muted)"
                fontSize={9}
                fontFamily="monospace"
              >
                {tick.value}
              </text>
            )}
          </g>
        ))}

        {/* マウス位置マーカー */}
        {mouseX != null && mouseX >= RULER_SIZE && (
          <line
            x1={mouseX}
            y1={0}
            x2={mouseX}
            y2={RULER_SIZE}
            stroke="var(--color-primary)"
            strokeWidth={1}
          />
        )}

        {/* 下端線 */}
        <line x1={0} y1={RULER_SIZE - 0.5} x2={width} y2={RULER_SIZE - 0.5} stroke="var(--color-border)" strokeWidth={1} />
      </svg>
    </div>
  );
}

interface VerticalRulerProps {
  height: number;
  zoom: number;
  panY: number;
  mouseY?: number | null;
}

function VerticalRuler({ height, zoom, panY, mouseY }: VerticalRulerProps) {
  const tickInterval = getTickInterval(zoom);
  const subTickInterval = getSubTickInterval(tickInterval);

  const ticks = useMemo(() => {
    const result: { position: number; value: number; isMajor: boolean }[] = [];

    const startValue = Math.floor((-panY / zoom - RULER_SIZE) / subTickInterval) * subTickInterval;
    const endValue = Math.ceil(((height - RULER_SIZE - panY) / zoom + 100) / subTickInterval) * subTickInterval;

    for (let value = startValue; value <= endValue; value += subTickInterval) {
      const position = RULER_SIZE + value * zoom + panY;
      if (position >= RULER_SIZE && position <= height) {
        const isMajor = Math.abs(value % tickInterval) < 0.01;
        result.push({ position, value: Math.round(value), isMajor });
      }
    }

    return result;
  }, [height, zoom, panY, tickInterval, subTickInterval]);

  return (
    <div className="ruler ruler-vertical" style={{ width: RULER_SIZE, height: height - RULER_SIZE }}>
      <svg width={RULER_SIZE} height={height - RULER_SIZE}>
        {/* 背景 */}
        <rect x={0} y={0} width={RULER_SIZE} height={height - RULER_SIZE} fill="var(--color-bg-secondary)" />

        {/* 目盛り線 */}
        {ticks.map((tick, index) => (
          <g key={index}>
            <line
              x1={tick.isMajor ? 0 : RULER_SIZE - 6}
              y1={tick.position - RULER_SIZE}
              x2={RULER_SIZE}
              y2={tick.position - RULER_SIZE}
              stroke="var(--color-border)"
              strokeWidth={tick.isMajor ? 1 : 0.5}
            />
            {tick.isMajor && (
              <text
                x={2}
                y={tick.position - RULER_SIZE + 10}
                fill="var(--color-text-muted)"
                fontSize={9}
                fontFamily="monospace"
                transform={`rotate(-90, 10, ${tick.position - RULER_SIZE + 5})`}
              >
                {tick.value}
              </text>
            )}
          </g>
        ))}

        {/* マウス位置マーカー */}
        {mouseY != null && mouseY >= RULER_SIZE && (
          <line
            x1={0}
            y1={mouseY - RULER_SIZE}
            x2={RULER_SIZE}
            y2={mouseY - RULER_SIZE}
            stroke="var(--color-primary)"
            strokeWidth={1}
          />
        )}

        {/* 右端線 */}
        <line x1={RULER_SIZE - 0.5} y1={0} x2={RULER_SIZE - 0.5} y2={height - RULER_SIZE} stroke="var(--color-border)" strokeWidth={1} />
      </svg>
    </div>
  );
}

export function Ruler({ width, height, mousePosition }: RulerProps) {
  const { state } = useDrawing();
  const { zoom, pan } = state;

  return (
    <>
      {/* 水平ルーラー（上端） */}
      <HorizontalRuler
        width={width}
        zoom={zoom}
        panX={pan.x}
        mouseX={mousePosition?.x}
      />

      {/* 垂直ルーラー（左端） */}
      <VerticalRuler
        height={height}
        zoom={zoom}
        panY={pan.y}
        mouseY={mousePosition?.y}
      />
    </>
  );
}

export { RULER_SIZE };
