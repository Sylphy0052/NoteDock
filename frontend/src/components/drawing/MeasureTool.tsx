/**
 * MeasureTool - 距離・角度計測オーバーレイ
 * 2点で距離、3点で角度を測定
 */

import { useMemo } from 'react';
import { Group, Line, Circle, Text } from 'react-konva';
import { useDrawing } from './context/DrawingContext';
import type { Point, MeasureUnit } from './types';

// 単位変換係数（px基準）
const UNIT_CONVERSION: Record<MeasureUnit, { factor: number; suffix: string }> = {
  px: { factor: 1, suffix: 'px' },
  mm: { factor: 1 / 3.7795275591, suffix: 'mm' }, // 96dpi基準
  cm: { factor: 1 / 37.795275591, suffix: 'cm' },
};

// 2点間の距離を計算
function calculateDistance(p1: Point, p2: Point): number {
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  return Math.sqrt(dx * dx + dy * dy);
}

// 3点で角度を計算（p1-p2-p3の角度、p2が頂点）
function calculateAngle(p1: Point, p2: Point, p3: Point): number {
  const v1x = p1.x - p2.x;
  const v1y = p1.y - p2.y;
  const v2x = p3.x - p2.x;
  const v2y = p3.y - p2.y;

  const dot = v1x * v2x + v1y * v2y;
  const cross = v1x * v2y - v1y * v2x;
  const angle = Math.atan2(cross, dot);

  return Math.abs(angle * (180 / Math.PI));
}

// 2点間の中点を計算
function getMidpoint(p1: Point, p2: Point): Point {
  return {
    x: (p1.x + p2.x) / 2,
    y: (p1.y + p2.y) / 2,
  };
}

// 値のフォーマット
function formatValue(value: number, decimals: number = 1): string {
  return value.toFixed(decimals);
}

interface MeasureToolProps {
  currentMousePos?: Point | null;
}

export function MeasureTool({ currentMousePos }: MeasureToolProps) {
  const { state } = useDrawing();
  const { measurePoints, measureUnit, currentTool } = state;

  // 計測モードでない場合は何も表示しない
  if (currentTool !== 'measure') {
    return null;
  }

  const unit = UNIT_CONVERSION[measureUnit];

  // 表示用のポイント配列（確定点 + マウス位置）
  const displayPoints = useMemo(() => {
    const points = [...measurePoints];
    if (currentMousePos && points.length < 3) {
      points.push(currentMousePos);
    }
    return points;
  }, [measurePoints, currentMousePos]);

  // 距離・角度の計算
  const measurements = useMemo(() => {
    const result: {
      distances: { value: number; midpoint: Point; angle: number }[];
      angle: number | null;
      angleVertex: Point | null;
    } = {
      distances: [],
      angle: null,
      angleVertex: null,
    };

    // 距離を計算
    for (let i = 0; i < displayPoints.length - 1; i++) {
      const p1 = displayPoints[i];
      const p2 = displayPoints[i + 1];
      const distance = calculateDistance(p1, p2);
      const midpoint = getMidpoint(p1, p2);
      const dx = p2.x - p1.x;
      const dy = p2.y - p1.y;
      const lineAngle = Math.atan2(dy, dx) * (180 / Math.PI);

      result.distances.push({
        value: distance * unit.factor,
        midpoint,
        angle: lineAngle,
      });
    }

    // 3点あれば角度を計算
    if (displayPoints.length >= 3) {
      result.angle = calculateAngle(
        displayPoints[0],
        displayPoints[1],
        displayPoints[2]
      );
      result.angleVertex = displayPoints[1];
    }

    return result;
  }, [displayPoints, unit.factor]);

  if (displayPoints.length === 0) {
    return null;
  }

  // テキストの回転を調整（常に読みやすい向きに）
  const getTextRotation = (angle: number): number => {
    if (angle > 90) return angle - 180;
    if (angle < -90) return angle + 180;
    return angle;
  };

  return (
    <Group>
      {/* 計測点 */}
      {displayPoints.map((point, index) => (
        <Circle
          key={`point-${index}`}
          x={point.x}
          y={point.y}
          radius={6}
          fill={index < measurePoints.length ? '#FF6B6B' : '#FF6B6B80'}
          stroke="#FFFFFF"
          strokeWidth={2}
        />
      ))}

      {/* 計測線 */}
      {displayPoints.length >= 2 && (
        <Line
          points={displayPoints.flatMap(p => [p.x, p.y])}
          stroke="#FF6B6B"
          strokeWidth={2}
          dash={[5, 5]}
        />
      )}

      {/* 距離表示 */}
      {measurements.distances.map((d, index) => (
        <Group key={`distance-${index}`}>
          {/* 背景 */}
          <Text
            x={d.midpoint.x}
            y={d.midpoint.y - 12}
            text={`${formatValue(d.value)} ${unit.suffix}`}
            fontSize={14}
            fontFamily="monospace"
            fontStyle="bold"
            fill="#FFFFFF"
            stroke="#000000"
            strokeWidth={3}
            rotation={getTextRotation(d.angle)}
            offsetX={30}
            offsetY={7}
          />
          {/* 前景 */}
          <Text
            x={d.midpoint.x}
            y={d.midpoint.y - 12}
            text={`${formatValue(d.value)} ${unit.suffix}`}
            fontSize={14}
            fontFamily="monospace"
            fontStyle="bold"
            fill="#FF6B6B"
            rotation={getTextRotation(d.angle)}
            offsetX={30}
            offsetY={7}
          />
        </Group>
      ))}

      {/* 角度表示（3点ある場合） */}
      {measurements.angle !== null && measurements.angleVertex && (
        <Group>
          {/* 角度の弧 */}
          {displayPoints.length >= 3 && (() => {
            const vertex = displayPoints[1];
            const p1 = displayPoints[0];
            const p3 = displayPoints[2];

            const angle1 = Math.atan2(p1.y - vertex.y, p1.x - vertex.x);
            const angle3 = Math.atan2(p3.y - vertex.y, p3.x - vertex.x);

            const arcRadius = 30;
            const startAngle = angle1;
            const endAngle = angle3;

            // 弧のポイントを生成
            const arcPoints: number[] = [];
            const steps = 20;
            const angleDiff = endAngle - startAngle;

            for (let i = 0; i <= steps; i++) {
              const t = i / steps;
              const angle = startAngle + angleDiff * t;
              arcPoints.push(
                vertex.x + Math.cos(angle) * arcRadius,
                vertex.y + Math.sin(angle) * arcRadius
              );
            }

            return (
              <Line
                points={arcPoints}
                stroke="#4ECDC4"
                strokeWidth={2}
              />
            );
          })()}

          {/* 角度テキスト */}
          <Text
            x={measurements.angleVertex.x + 40}
            y={measurements.angleVertex.y - 25}
            text={`${formatValue(measurements.angle)}°`}
            fontSize={16}
            fontFamily="monospace"
            fontStyle="bold"
            fill="#FFFFFF"
            stroke="#000000"
            strokeWidth={3}
          />
          <Text
            x={measurements.angleVertex.x + 40}
            y={measurements.angleVertex.y - 25}
            text={`${formatValue(measurements.angle)}°`}
            fontSize={16}
            fontFamily="monospace"
            fontStyle="bold"
            fill="#4ECDC4"
          />
        </Group>
      )}

      {/* 計測モードのヒント */}
      {displayPoints.length === 0 && (
        <Text
          x={50}
          y={50}
          text="クリックで計測点を追加（2点:距離、3点:角度）"
          fontSize={14}
          fill="#666666"
        />
      )}
    </Group>
  );
}
