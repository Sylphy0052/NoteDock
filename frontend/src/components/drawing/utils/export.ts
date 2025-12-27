/**
 * Export Utilities - エクスポート機能
 */

import type Konva from 'konva';
import type { Shape, ExportFormat, ExportOptions } from '../types';
import { LINE_DASH_PATTERNS } from '../types';

/**
 * Data URL を Blob に変換
 */
export function dataUrlToBlob(dataUrl: string): Blob {
  const arr = dataUrl.split(',');
  const mimeMatch = arr[0].match(/:(.*?);/);
  const mime = mimeMatch ? mimeMatch[1] : 'image/png';
  const bstr = atob(arr[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n);
  }
  return new Blob([u8arr], { type: mime });
}

/**
 * Stage を PNG としてエクスポート
 */
export async function exportToPng(
  stage: Konva.Stage,
  options: Partial<ExportOptions> = {}
): Promise<Blob> {
  const { pixelRatio = 2 } = options;

  const dataUrl = stage.toDataURL({
    pixelRatio,
    mimeType: 'image/png',
  });

  return dataUrlToBlob(dataUrl);
}

/**
 * Stage を JPEG としてエクスポート
 */
export async function exportToJpeg(
  stage: Konva.Stage,
  options: Partial<ExportOptions> = {}
): Promise<Blob> {
  const { pixelRatio = 2, quality = 0.9, backgroundColor = '#ffffff' } = options;

  // 背景色を設定するために一時的なレイヤーを追加
  const container = stage.container();
  const originalBg = container.style.backgroundColor;
  container.style.backgroundColor = backgroundColor;

  const dataUrl = stage.toDataURL({
    pixelRatio,
    mimeType: 'image/jpeg',
    quality,
  });

  // 背景色を元に戻す
  container.style.backgroundColor = originalBg;

  return dataUrlToBlob(dataUrl);
}

/**
 * 図形を SVG 文字列に変換
 */
export function shapeToSvgElement(shape: Shape): string {
  const dashPattern = LINE_DASH_PATTERNS[shape.lineStyle] || [];
  const strokeDasharray = dashPattern.length > 0 ? `stroke-dasharray="${dashPattern.join(',')}"` : '';
  const commonAttrs = `
    stroke="${shape.stroke}"
    stroke-width="${shape.strokeWidth}"
    ${strokeDasharray}
    fill="${shape.fill || 'none'}"
    opacity="${shape.opacity}"
    transform="rotate(${shape.rotation}, ${shape.x}, ${shape.y})"
  `.trim();

  switch (shape.type) {
    case 'line': {
      const [x1, y1, x2, y2] = shape.points;
      return `<line x1="${shape.x + x1}" y1="${shape.y + y1}" x2="${shape.x + x2}" y2="${shape.y + y2}" ${commonAttrs} />`;
    }
    case 'circle':
      return `<circle cx="${shape.x}" cy="${shape.y}" r="${shape.radius}" ${commonAttrs} />`;
    case 'arc': {
      // SVG の円弧は path で表現
      const startRad = (shape.startAngle * Math.PI) / 180;
      const endRad = (shape.endAngle * Math.PI) / 180;
      const r = shape.radius;
      const x1 = shape.x + r * Math.cos(startRad);
      const y1 = shape.y + r * Math.sin(startRad);
      const x2 = shape.x + r * Math.cos(endRad);
      const y2 = shape.y + r * Math.sin(endRad);
      // 角度差を計算（常に反時計回り方向）
      let angleDiff = shape.endAngle - shape.startAngle;
      if (angleDiff <= 0) angleDiff += 360;
      const largeArc = angleDiff > 180 ? 1 : 0;
      return `<path d="M ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2}" fill="none" ${commonAttrs} />`;
    }
    case 'rect':
      return `<rect x="${shape.x}" y="${shape.y}" width="${shape.width}" height="${shape.height}" rx="${shape.cornerRadius || 0}" ${commonAttrs} />`;
    case 'polygon': {
      const points = [];
      for (let i = 0; i < shape.points.length; i += 2) {
        points.push(`${shape.x + shape.points[i]},${shape.y + shape.points[i + 1]}`);
      }
      return `<polygon points="${points.join(' ')}" ${commonAttrs} />`;
    }
    case 'text': {
      const fontStyle = `${shape.fontWeight === 'bold' ? 'font-weight: bold;' : ''} ${shape.fontStyle === 'italic' ? 'font-style: italic;' : ''}`;
      return `<text x="${shape.x}" y="${shape.y}" font-size="${shape.fontSize}" font-family="${shape.fontFamily}" text-anchor="${shape.textAlign === 'center' ? 'middle' : shape.textAlign === 'right' ? 'end' : 'start'}" fill="${shape.stroke}" opacity="${shape.opacity}" style="${fontStyle}">${shape.text}</text>`;
    }
    case 'arrow': {
      const [x1, y1, x2, y2] = shape.points;
      const absX1 = shape.x + x1;
      const absY1 = shape.y + y1;
      const absX2 = shape.x + x2;
      const absY2 = shape.y + y2;
      // 矢印のマーカー定義とライン
      const markerId = `arrow-${shape.id}`;
      return `
        <defs>
          <marker id="${markerId}" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
            <path d="M 0 0 L 10 5 L 0 10 z" fill="${shape.stroke}" />
          </marker>
        </defs>
        <line x1="${absX1}" y1="${absY1}" x2="${absX2}" y2="${absY2}" ${commonAttrs} marker-end="url(#${markerId})" ${shape.arrowStart !== 'none' ? `marker-start="url(#${markerId})"` : ''} />`;
    }
    case 'freehand': {
      const pathPoints = [];
      for (let i = 0; i < shape.points.length; i += 2) {
        const px = shape.x + shape.points[i];
        const py = shape.y + shape.points[i + 1];
        if (i === 0) {
          pathPoints.push(`M ${px} ${py}`);
        } else {
          pathPoints.push(`L ${px} ${py}`);
        }
      }
      return `<path d="${pathPoints.join(' ')}" fill="none" ${commonAttrs} stroke-linecap="round" stroke-linejoin="round" />`;
    }
    case 'dimension': {
      const [x1, y1, x2, y2] = shape.points;
      const absX1 = shape.x + x1;
      const absY1 = shape.y + y1;
      const absX2 = shape.x + x2;
      const absY2 = shape.y + y2;
      const offset = shape.offset;
      const length = Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
      const text = shape.text ?? `${length.toFixed(1)}${shape.unit}`;
      const midX = (absX1 + absX2) / 2;
      const midY = ((absY1 - offset) + (absY2 - offset)) / 2 - 5;

      return `<g ${commonAttrs}>
        <line x1="${absX1}" y1="${absY1 - offset}" x2="${absX2}" y2="${absY2 - offset}" />
        ${shape.showExtensionLines ? `
        <line x1="${absX1}" y1="${absY1}" x2="${absX1}" y2="${absY1 - offset - 5}" stroke-width="1" />
        <line x1="${absX2}" y1="${absY2}" x2="${absX2}" y2="${absY2 - offset - 5}" stroke-width="1" />
        ` : ''}
        <text x="${midX}" y="${midY}" font-size="12" text-anchor="middle" fill="${shape.stroke}">${text}</text>
      </g>`;
    }
    case 'image': {
      return `<image x="${shape.x}" y="${shape.y}" width="${shape.width}" height="${shape.height}" href="${shape.src}" opacity="${shape.opacity}" transform="rotate(${shape.rotation}, ${shape.x + shape.width / 2}, ${shape.y + shape.height / 2})" />`;
    }
    case 'group': {
      const children = shape.children.map((child) => {
        // 子図形の座標をグループ座標に加算
        const adjustedChild = {
          ...child,
          x: child.x + shape.x,
          y: child.y + shape.y,
        } as Shape;
        return shapeToSvgElement(adjustedChild);
      }).join('\n');
      return `<g transform="rotate(${shape.rotation}, ${shape.x + shape.width / 2}, ${shape.y + shape.height / 2})">${children}</g>`;
    }
    default:
      return '';
  }
}

/**
 * 図形リストを SVG としてエクスポート
 */
export function exportToSvg(
  shapes: Shape[],
  width: number,
  height: number
): string {
  const svgElements = shapes
    .filter((s) => s.visible)
    .map(shapeToSvgElement)
    .join('\n  ');

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  ${svgElements}
</svg>`;
}

/**
 * Blob をダウンロード
 */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * 文字列をダウンロード
 */
export function downloadString(content: string, filename: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  downloadBlob(blob, filename);
}

/**
 * エクスポート実行
 */
export async function exportDrawing(
  stage: Konva.Stage,
  shapes: Shape[],
  format: ExportFormat,
  options: Partial<ExportOptions> = {}
): Promise<void> {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const baseFilename = `drawing-${timestamp}`;

  switch (format) {
    case 'png': {
      const blob = await exportToPng(stage, options);
      downloadBlob(blob, `${baseFilename}.png`);
      break;
    }
    case 'jpeg': {
      const blob = await exportToJpeg(stage, options);
      downloadBlob(blob, `${baseFilename}.jpg`);
      break;
    }
    case 'svg': {
      const svg = exportToSvg(shapes, stage.width(), stage.height());
      downloadString(svg, `${baseFilename}.svg`, 'image/svg+xml');
      break;
    }
  }
}
