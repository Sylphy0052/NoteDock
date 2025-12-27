/**
 * Storage Utilities - 描画データの保存・読み込み
 */

import type { Shape } from '../types';

const STORAGE_KEY = 'notedock-drawing';
const DRAWINGS_LIST_KEY = 'notedock-drawings-list';

/**
 * 描画データの保存形式
 */
export interface DrawingData {
  id: string;
  name: string;
  shapes: Shape[];
  createdAt: string;
  updatedAt: string;
  width?: number;
  height?: number;
}

/**
 * 描画リストアイテム（メタデータのみ）
 */
export interface DrawingListItem {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  shapeCount: number;
}

/**
 * 新しい描画IDを生成
 */
export function generateDrawingId(): string {
  return `drawing-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * 描画データをlocalStorageに保存
 */
export function saveDrawing(data: DrawingData): void {
  const key = `${STORAGE_KEY}-${data.id}`;
  localStorage.setItem(key, JSON.stringify(data));

  // リストも更新
  updateDrawingsList(data);
}

/**
 * 描画データをlocalStorageから読み込み
 */
export function loadDrawing(id: string): DrawingData | null {
  const key = `${STORAGE_KEY}-${id}`;
  const data = localStorage.getItem(key);
  if (!data) return null;

  try {
    return JSON.parse(data) as DrawingData;
  } catch {
    console.error('Failed to parse drawing data');
    return null;
  }
}

/**
 * 描画データをlocalStorageから削除
 */
export function deleteDrawing(id: string): void {
  const key = `${STORAGE_KEY}-${id}`;
  localStorage.removeItem(key);

  // リストからも削除
  removeFromDrawingsList(id);
}

/**
 * すべての描画リストを取得
 */
export function getDrawingsList(): DrawingListItem[] {
  const data = localStorage.getItem(DRAWINGS_LIST_KEY);
  if (!data) return [];

  try {
    return JSON.parse(data) as DrawingListItem[];
  } catch {
    return [];
  }
}

/**
 * 描画リストを更新
 */
function updateDrawingsList(data: DrawingData): void {
  const list = getDrawingsList();
  const existingIndex = list.findIndex((item) => item.id === data.id);

  const listItem: DrawingListItem = {
    id: data.id,
    name: data.name,
    createdAt: data.createdAt,
    updatedAt: data.updatedAt,
    shapeCount: data.shapes.length,
  };

  if (existingIndex >= 0) {
    list[existingIndex] = listItem;
  } else {
    list.unshift(listItem);
  }

  localStorage.setItem(DRAWINGS_LIST_KEY, JSON.stringify(list));
}

/**
 * 描画リストから削除
 */
function removeFromDrawingsList(id: string): void {
  const list = getDrawingsList();
  const filtered = list.filter((item) => item.id !== id);
  localStorage.setItem(DRAWINGS_LIST_KEY, JSON.stringify(filtered));
}

/**
 * 自動保存用のデータをlocalStorageに保存
 */
export function saveAutoSave(shapes: Shape[]): void {
  const data = {
    shapes,
    savedAt: new Date().toISOString(),
  };
  localStorage.setItem(`${STORAGE_KEY}-autosave`, JSON.stringify(data));
}

/**
 * 自動保存データを読み込み
 */
export function loadAutoSave(): { shapes: Shape[]; savedAt: string } | null {
  const data = localStorage.getItem(`${STORAGE_KEY}-autosave`);
  if (!data) return null;

  try {
    return JSON.parse(data);
  } catch {
    return null;
  }
}

/**
 * 自動保存データをクリア
 */
export function clearAutoSave(): void {
  localStorage.removeItem(`${STORAGE_KEY}-autosave`);
}

/**
 * 描画データをJSONファイルとしてエクスポート
 */
export function exportAsJson(data: DrawingData): void {
  const json = JSON.stringify(data, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${data.name || 'drawing'}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * JSONファイルから描画データをインポート
 */
export function importFromJson(file: File): Promise<DrawingData> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target?.result as string) as DrawingData;
        // IDを再生成して新規描画として扱う
        data.id = generateDrawingId();
        data.createdAt = new Date().toISOString();
        data.updatedAt = new Date().toISOString();
        resolve(data);
      } catch {
        reject(new Error('Invalid JSON file'));
      }
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsText(file);
  });
}
