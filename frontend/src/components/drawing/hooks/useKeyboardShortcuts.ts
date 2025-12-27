/**
 * Keyboard Shortcuts Hook - キーボードショートカット処理
 */

import { useEffect, useCallback } from 'react';
import { useDrawing } from '../context/DrawingContext';
import { SHORTCUTS } from '../types';
import type { ToolType } from '../types';

interface KeyboardShortcutsOptions {
  onSave?: () => void;
  onExport?: () => void;
}

export function useKeyboardShortcuts(options: KeyboardShortcutsOptions = {}) {
  const { onSave, onExport } = options;
  const {
    setTool,
    undo,
    redo,
    deleteSelected,
    selectAll,
    clearSelection,
    toggleGrid,
    cancelDrawing,
    copy,
    cut,
    paste,
    duplicate,
    groupShapes,
    ungroupShape,
    flipHorizontal,
    flipVertical,
    setZoom,
    state,
  } = useDrawing();

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      // 入力フィールドにフォーカスがある場合は無視
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        e.target instanceof HTMLSelectElement
      ) {
        return;
      }

      // Ctrl/Cmd キーの組み合わせ
      if (e.ctrlKey || e.metaKey) {
        switch (e.key.toLowerCase()) {
          case 'z':
            e.preventDefault();
            if (e.shiftKey) {
              redo();
            } else {
              undo();
            }
            return;
          case 'y':
            e.preventDefault();
            redo();
            return;
          case 'a':
            e.preventDefault();
            selectAll();
            return;
          case 'c':
            e.preventDefault();
            copy();
            return;
          case 'x':
            e.preventDefault();
            cut();
            return;
          case 'v':
            e.preventDefault();
            paste();
            return;
          case 'd':
            e.preventDefault();
            duplicate();
            return;
          case 'g':
            e.preventDefault();
            if (e.shiftKey) {
              ungroupShape();
            } else {
              groupShapes();
            }
            return;
          case 's':
            e.preventDefault();
            onSave?.();
            return;
          case 'e':
            e.preventDefault();
            onExport?.();
            return;
          case '=':
          case '+':
            // ズームイン
            e.preventDefault();
            setZoom(Math.min(state.zoom * 1.1, 4));
            return;
          case '-':
            // ズームアウト
            e.preventDefault();
            setZoom(Math.max(state.zoom * 0.9, 0.25));
            return;
          case '0':
            // ズームリセット
            e.preventDefault();
            setZoom(1);
            return;
        }
        return;
      }

      // 単一キー
      const key = e.key.toLowerCase();
      const shortcut = SHORTCUTS[key] || SHORTCUTS[e.key];

      if (shortcut) {
        e.preventDefault();
        if (shortcut.tool) {
          setTool(shortcut.tool as ToolType);
        } else if (shortcut.action) {
          switch (shortcut.action) {
            case 'delete':
              deleteSelected();
              break;
            case 'cancel':
              if (state.isDrawing) {
                cancelDrawing();
              } else {
                clearSelection();
              }
              break;
            case 'toggleGrid':
              toggleGrid();
              break;
            case 'flipHorizontal':
              flipHorizontal();
              break;
            case 'flipVertical':
              flipVertical();
              break;
          }
        }
      }
    },
    [
      setTool,
      undo,
      redo,
      deleteSelected,
      selectAll,
      clearSelection,
      toggleGrid,
      cancelDrawing,
      copy,
      cut,
      paste,
      duplicate,
      groupShapes,
      ungroupShape,
      flipHorizontal,
      flipVertical,
      setZoom,
      state.isDrawing,
      state.zoom,
      onSave,
      onExport,
    ]
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown]);
}
