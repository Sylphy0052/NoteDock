/**
 * Drawing Page - 描画ページ
 */

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import {
  Save,
  FileImage,
  FileCode,
  Image as ImageIcon,
  FolderOpen,
  Ship,
  Share2,
  Cloud,
  CloudOff,
} from 'lucide-react';
import { DrawingProvider, useDrawing } from '../components/drawing/context/DrawingContext';
import { DrawingCanvas, type DrawingCanvasHandle } from '../components/drawing/DrawingCanvas';
import { exportDrawing } from '../components/drawing/utils/export';
import {
  saveDrawing as saveDrawingLocal,
  loadDrawing as loadDrawingLocal,
  loadAutoSave,
  saveAutoSave,
  generateDrawingId,
  type DrawingData,
} from '../components/drawing/utils/storage';
import { DrawingToolbar } from '../components/drawing/DrawingToolbar';
import { DrawingStylePanel } from '../components/drawing/DrawingStylePanel';
import { DrawingStatusBar } from '../components/drawing/DrawingStatusBar';
import { LayerPanel } from '../components/drawing/LayerPanel';
import { PropertyPanel } from '../components/drawing/PropertyPanel';
import { Ruler, RULER_SIZE } from '../components/drawing/Ruler';
import { ShareDialog } from '../components/drawing/ShareDialog';
import { CollaboratorPanel } from '../components/drawing/CollaboratorPanel';
import { AIAssistantPanel } from '../components/drawing/AIAssistantPanel';
import { useKeyboardShortcuts } from '../components/drawing/hooks/useKeyboardShortcuts';
import { useDrawing as useDrawingApi, useDrawingMutations } from '../hooks/useDrawings';
import { useDrawingCollaboration } from '../hooks/useDrawingCollaboration';
import Modal from '../components/common/Modal';
import Button from '../components/common/Button';
import type { Point, ExportFormat, Shape } from '../components/drawing/types';
import type { Shape as ApiShape } from '../api/drawings';
import '../styles/drawing.css';

/**
 * 保存モーダル
 */
interface SaveModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (name: string, saveToServer: boolean) => void;
  currentName: string;
  isSaving: boolean;
}

function SaveModal({ isOpen, onClose, onSave, currentName, isSaving }: SaveModalProps) {
  const [name, setName] = useState(currentName);
  const [saveToServer, setSaveToServer] = useState(true);

  useEffect(() => {
    if (isOpen) {
      setName(currentName);
    }
  }, [isOpen, currentName]);

  const handleSave = () => {
    const trimmedName = name.trim();
    if (!trimmedName) {
      alert('名前を入力してください');
      return;
    }
    onSave(trimmedName, saveToServer);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="描画を保存">
      <div className="drawing-save-modal">
        <div className="drawing-save-input-group">
          <label htmlFor="drawing-name">描画名</label>
          <input
            id="drawing-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="描画の名前を入力"
            autoFocus
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !isSaving) {
                handleSave();
              }
            }}
          />
        </div>
        <div className="drawing-save-option">
          <label className="drawing-save-checkbox">
            <input
              type="checkbox"
              checked={saveToServer}
              onChange={(e) => setSaveToServer(e.target.checked)}
            />
            <Cloud size={14} />
            サーバーに保存（共有可能）
          </label>
        </div>
        <div className="drawing-save-actions">
          <Button variant="secondary" onClick={onClose} disabled={isSaving}>
            キャンセル
          </Button>
          <Button variant="primary" onClick={handleSave} disabled={isSaving}>
            {isSaving ? '保存中...' : '保存'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

/**
 * エクスポートモーダル
 */
interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onExport: (format: ExportFormat) => void;
}

function ExportModal({ isOpen, onClose, onExport }: ExportModalProps) {
  const [selectedFormat, setSelectedFormat] = useState<ExportFormat>('png');

  const formats: { format: ExportFormat; icon: React.ReactNode; name: string; desc: string }[] = [
    { format: 'png', icon: <ImageIcon size={20} />, name: 'PNG', desc: '透過背景付きの画像' },
    { format: 'jpeg', icon: <FileImage size={20} />, name: 'JPEG', desc: '白背景の画像（軽量）' },
    { format: 'svg', icon: <FileCode size={20} />, name: 'SVG', desc: 'ベクター形式（拡大可能）' },
  ];

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="エクスポート">
      <div className="drawing-export-modal">
        <div className="drawing-export-options">
          {formats.map((f) => (
            <button
              key={f.format}
              type="button"
              className={`drawing-export-option ${
                selectedFormat === f.format ? 'drawing-export-option-selected' : ''
              }`}
              onClick={() => setSelectedFormat(f.format)}
            >
              <div className="drawing-export-option-icon">{f.icon}</div>
              <div className="drawing-export-option-info">
                <div className="drawing-export-option-name">{f.name}</div>
                <div className="drawing-export-option-desc">{f.desc}</div>
              </div>
            </button>
          ))}
        </div>
        <div className="drawing-export-actions">
          <Button variant="secondary" onClick={onClose}>
            キャンセル
          </Button>
          <Button
            variant="primary"
            onClick={() => {
              onExport(selectedFormat);
              onClose();
            }}
          >
            エクスポート
          </Button>
        </div>
      </div>
    </Modal>
  );
}

interface DrawingEditorProps {
  existingDrawingId?: string;
}

/**
 * Shape型をAPI用に変換
 */
function convertShapesToApi(shapes: Shape[]): ApiShape[] {
  return shapes as unknown as ApiShape[];
}

/**
 * API結果をShape型に変換
 */
function convertApiToShapes(apiShapes: unknown[]): Shape[] {
  return apiShapes as unknown as Shape[];
}

/**
 * 描画エディタ本体
 */
function DrawingEditor({ existingDrawingId }: DrawingEditorProps) {
  const navigate = useNavigate();
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<DrawingCanvasHandle>(null);
  const [canvasSize, setCanvasSize] = useState({ width: 800, height: 600 });
  const [mousePos, setMousePos] = useState<Point | null>(null);
  const [exportModalOpen, setExportModalOpen] = useState(false);
  const [saveModalOpen, setSaveModalOpen] = useState(false);
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [drawingId, setDrawingId] = useState<string | null>(existingDrawingId || null);
  const [localDrawingId, setLocalDrawingId] = useState<string>(() => generateDrawingId());
  const [drawingName, setDrawingName] = useState('無題の描画');
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isServerDrawing, setIsServerDrawing] = useState(false);

  const { state, dispatch, addShape, updateShape, deleteShapes } = useDrawing();

  // サーバーAPIフック
  const { data: serverDrawing, isLoading: isLoadingServer } = useDrawingApi(
    existingDrawingId && existingDrawingId.length === 36 ? existingDrawingId : undefined
  );
  const { create, update, isLoading: isSaving } = useDrawingMutations();

  // 自分のユーザーIDを追跡するref
  const currentUserIdRef = useRef<string | null>(null);

  // リモートからの変更を処理するコールバック
  const handleRemoteShapeAdd = useCallback((shape: Shape, userId: string) => {
    // 自分自身からの変更は無視
    if (userId === currentUserIdRef.current) return;
    addShape(shape);
  }, [addShape]);

  const handleRemoteShapeUpdate = useCallback((shapeId: string, changes: Partial<Shape>, userId: string) => {
    if (userId === currentUserIdRef.current) return;
    updateShape(shapeId, changes);
  }, [updateShape]);

  const handleRemoteShapeDelete = useCallback((shapeIds: string[], userId: string) => {
    if (userId === currentUserIdRef.current) return;
    deleteShapes(shapeIds);
  }, [deleteShapes]);

  const handleRemoteShapesSync = useCallback((shapes: Shape[], userId: string) => {
    if (userId === currentUserIdRef.current) return;
    dispatch({ type: 'LOAD_SHAPES', payload: shapes });
  }, [dispatch]);

  // コラボレーションフック（サーバー描画の場合のみ有効）
  const collaboration = useDrawingCollaboration({
    drawingId: isServerDrawing && drawingId ? drawingId : null,
    userName: 'ユーザー', // TODO: 実際のユーザー名を取得
    enabled: isServerDrawing,
    onShapeAdd: handleRemoteShapeAdd,
    onShapeUpdate: handleRemoteShapeUpdate,
    onShapeDelete: handleRemoteShapeDelete,
    onShapesSync: handleRemoteShapesSync,
  });

  // currentUserIdRefを更新
  useEffect(() => {
    currentUserIdRef.current = collaboration.currentUser?.user_id ?? null;
  }, [collaboration.currentUser]);

  // キーボードショートカット用コールバック
  const openSaveModal = useCallback(() => setSaveModalOpen(true), []);
  const openExportModal = useCallback(() => setExportModalOpen(true), []);

  // キーボードショートカット
  useKeyboardShortcuts({
    onSave: openSaveModal,
    onExport: openExportModal,
  });

  // コンテナサイズに合わせてキャンバスサイズを調整
  useEffect(() => {
    const updateSize = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        setCanvasSize({
          width: rect.width,
          height: rect.height,
        });
      }
    };

    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  // サーバーから描画データを読み込み
  useEffect(() => {
    if (serverDrawing && !isLoaded) {
      setDrawingId(serverDrawing.id);
      setDrawingName(serverDrawing.name);
      setLastSaved(new Date(serverDrawing.updated_at));
      setIsServerDrawing(true);
      dispatch({
        type: 'LOAD_SHAPES',
        payload: convertApiToShapes(serverDrawing.shapes as Record<string, unknown>[]),
      });
      setIsLoaded(true);
    }
  }, [serverDrawing, isLoaded, dispatch]);

  // ローカルから既存の描画データを読み込み（サーバーにない場合のフォールバック）
  useEffect(() => {
    if (existingDrawingId && !isLoaded && !isLoadingServer && !serverDrawing) {
      const data = loadDrawingLocal(existingDrawingId);
      if (data) {
        setLocalDrawingId(data.id);
        setDrawingName(data.name);
        setLastSaved(new Date(data.updatedAt));
        setIsServerDrawing(false);
        dispatch({ type: 'LOAD_SHAPES', payload: data.shapes });
        setIsLoaded(true);
      }
    }
  }, [existingDrawingId, isLoaded, isLoadingServer, serverDrawing, dispatch]);

  // 自動保存データの復元（新規描画かつマウント時のみ）
  useEffect(() => {
    // 既存の描画を読み込む場合はスキップ
    if (existingDrawingId) return;

    const autoSaveData = loadAutoSave();
    if (autoSaveData && autoSaveData.shapes.length > 0) {
      const savedAt = new Date(autoSaveData.savedAt);
      const timeDiff = Date.now() - savedAt.getTime();
      const hoursDiff = timeDiff / (1000 * 60 * 60);

      // 24時間以内の自動保存があれば復元を提案
      if (hoursDiff < 24) {
        const shouldRestore = window.confirm(
          `前回の自動保存データが見つかりました（${savedAt.toLocaleString()}）。\n復元しますか？`
        );
        if (shouldRestore) {
          dispatch({ type: 'LOAD_SHAPES', payload: autoSaveData.shapes });
        }
      }
    }
  }, [existingDrawingId, dispatch]);

  // 自動保存（形状変更時）
  useEffect(() => {
    if (state.shapes.length > 0) {
      const timeoutId = setTimeout(() => {
        saveAutoSave(state.shapes);
      }, 2000); // 2秒のデバウンス

      return () => clearTimeout(timeoutId);
    }
  }, [state.shapes]);

  // 保存処理
  const handleSave = useCallback(
    async (name: string, saveToServer: boolean) => {
      if (saveToServer) {
        try {
          if (drawingId && isServerDrawing) {
            // 既存のサーバー描画を更新
            await update(drawingId, {
              name,
              shapes: convertShapesToApi(state.shapes),
              canvas_width: canvasSize.width,
              canvas_height: canvasSize.height,
            });
          } else {
            // 新規作成
            const result = await create({
              name,
              shapes: convertShapesToApi(state.shapes),
              canvas_width: canvasSize.width,
              canvas_height: canvasSize.height,
              is_public: false,
            });
            setDrawingId(result.id);
            setIsServerDrawing(true);
            // URLを更新
            navigate(`/drawing/${result.id}`, { replace: true });
          }
          setDrawingName(name);
          setLastSaved(new Date());
          setSaveModalOpen(false);
          alert('サーバーに保存しました');
        } catch (error) {
          console.error('Failed to save to server:', error);
          alert('サーバーへの保存に失敗しました。ローカルに保存します。');
          // フォールバック：ローカル保存
          saveToLocal(name);
        }
      } else {
        saveToLocal(name);
      }
    },
    [drawingId, isServerDrawing, state.shapes, canvasSize, create, update, navigate]
  );

  // ローカル保存
  const saveToLocal = useCallback(
    (name: string) => {
      const now = new Date().toISOString();
      const data: DrawingData = {
        id: localDrawingId,
        name,
        shapes: state.shapes,
        createdAt: lastSaved ? localDrawingId : now,
        updatedAt: now,
        width: canvasSize.width,
        height: canvasSize.height,
      };

      saveDrawingLocal(data);
      setDrawingName(name);
      setLastSaved(new Date());
      setIsServerDrawing(false);
      setSaveModalOpen(false);
      alert('ローカルに保存しました');
    },
    [localDrawingId, state.shapes, canvasSize, lastSaved]
  );

  // マウス位置の更新（キャンバスから）+ WebSocket送信
  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const pos = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
    setMousePos(pos);

    // WebSocketでカーソル位置を送信（サーバー描画の場合のみ）
    if (collaboration.isConnected) {
      collaboration.sendCursorMove(pos.x, pos.y);
    }
  }, [collaboration]);

  // エクスポート処理
  const handleExport = useCallback(
    async (format: ExportFormat) => {
      const stage = canvasRef.current?.getStage();
      if (!stage) {
        alert('エクスポートに失敗しました。キャンバスが見つかりません。');
        return;
      }

      try {
        await exportDrawing(stage, state.shapes, format);
      } catch (error) {
        console.error('Export failed:', error);
        alert('エクスポートに失敗しました。');
      }
    },
    [state.shapes]
  );

  return (
    <div className="drawing-page">
      {/* ヘッダー */}
      <header className="drawing-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <Link to="/" className="header-logo">
            <div className="logo-icon-wrapper">
              <Ship size={20} className="logo-icon" />
            </div>
            <span className="logo-text">
              Note<span className="logo-text-accent">Dock</span>
            </span>
          </Link>
          <span style={{ color: 'var(--color-border)' }}>|</span>
          <h1 className="drawing-header-title">
            図形描画
            {isServerDrawing ? (
              <Cloud size={14} style={{ marginLeft: '0.5rem', color: 'var(--color-success)' }} />
            ) : (
              <CloudOff size={14} style={{ marginLeft: '0.5rem', color: 'var(--color-text-secondary)' }} />
            )}
          </h1>
        </div>
        <div className="drawing-header-actions">
          {/* コラボレーションパネル（サーバー描画の場合のみ） */}
          {isServerDrawing && (
            <CollaboratorPanel
              isConnected={collaboration.isConnected}
              isConnecting={collaboration.isConnecting}
              collaborators={collaboration.collaborators}
              currentUserId={collaboration.currentUser?.user_id}
              chatMessages={collaboration.chatMessages}
              onSendMessage={collaboration.sendChatMessage}
            />
          )}
          <Link to="/drawings">
            <Button
              variant="secondary"
              size="sm"
              leftIcon={<FolderOpen size={16} />}
            >
              一覧
            </Button>
          </Link>
          {drawingId && isServerDrawing && (
            <Button
              variant="secondary"
              size="sm"
              leftIcon={<Share2 size={16} />}
              onClick={() => setShareDialogOpen(true)}
            >
              共有
            </Button>
          )}
          <AIAssistantPanel
            canvasWidth={canvasSize.width}
            canvasHeight={canvasSize.height}
            shapes={state.shapes as unknown as ApiShape[]}
            onAddShapes={(shapes) => {
              shapes.forEach((shape) => addShape(shape as unknown as Shape));
            }}
            onReplaceShapes={(shapes) => {
              dispatch({ type: 'LOAD_SHAPES', payload: shapes as unknown as Shape[] });
            }}
          />
          <Button
            variant="secondary"
            size="sm"
            leftIcon={<Save size={16} />}
            onClick={() => setSaveModalOpen(true)}
          >
            保存
          </Button>
          <Button
            variant="primary"
            size="sm"
            leftIcon={<FileImage size={16} />}
            onClick={() => setExportModalOpen(true)}
          >
            エクスポート
          </Button>
        </div>
      </header>

      {/* ツールバー */}
      <DrawingToolbar onExport={() => setExportModalOpen(true)} />

      {/* メインコンテンツ */}
      <div className="drawing-main">
        {/* キャンバスエリア（ルーラー付き） */}
        <div
          ref={containerRef}
          className="drawing-canvas-wrapper"
          onMouseMove={handleMouseMove}
          onMouseLeave={() => setMousePos(null)}
        >
          {state.rulerEnabled && (
            <Ruler
              width={canvasSize.width}
              height={canvasSize.height}
              mousePosition={mousePos}
            />
          )}
          <div
            className="drawing-canvas-container"
            style={state.rulerEnabled ? {
              position: 'absolute',
              top: RULER_SIZE,
              left: RULER_SIZE,
              width: canvasSize.width - RULER_SIZE,
              height: canvasSize.height - RULER_SIZE,
            } : undefined}
          >
            <DrawingCanvas
              ref={canvasRef}
              width={state.rulerEnabled ? canvasSize.width - RULER_SIZE : canvasSize.width}
              height={state.rulerEnabled ? canvasSize.height - RULER_SIZE : canvasSize.height}
            />
            {/* コラボレーターカーソルオーバーレイ */}
            {isServerDrawing && collaboration.isConnected && (
              <div className="collaborator-cursors-overlay">
                {Array.from(collaboration.cursors.values())
                  .filter((cursor) => cursor.user_id !== collaboration.currentUser?.user_id)
                  .map((cursor) => (
                    <div
                      key={cursor.user_id}
                      className="collaborator-cursor"
                      style={{
                        left: cursor.x,
                        top: cursor.y,
                        '--cursor-color': cursor.user_color,
                      } as React.CSSProperties}
                    >
                      <svg
                        width="16"
                        height="20"
                        viewBox="0 0 16 20"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path
                          d="M0 0L0 16L4.5 12L8 20L10 19L6.5 11L12 11L0 0Z"
                          fill={cursor.user_color}
                        />
                      </svg>
                      <span
                        className="collaborator-cursor-name"
                        style={{ backgroundColor: cursor.user_color }}
                      >
                        {cursor.user_name}
                      </span>
                    </div>
                  ))}
              </div>
            )}
          </div>
        </div>

        {/* サイドバー */}
        <aside className="drawing-sidebar">
          <LayerPanel />
          <PropertyPanel />
          <DrawingStylePanel />
        </aside>
      </div>

      {/* ステータスバー */}
      <DrawingStatusBar
        mousePosition={mousePos}
        canvasWidth={canvasSize.width}
        canvasHeight={canvasSize.height}
      />

      {/* 保存モーダル */}
      <SaveModal
        isOpen={saveModalOpen}
        onClose={() => setSaveModalOpen(false)}
        onSave={handleSave}
        currentName={drawingName}
        isSaving={isSaving}
      />

      {/* エクスポートモーダル */}
      <ExportModal
        isOpen={exportModalOpen}
        onClose={() => setExportModalOpen(false)}
        onExport={handleExport}
      />

      {/* 共有ダイアログ */}
      {drawingId && isServerDrawing && (
        <ShareDialog
          isOpen={shareDialogOpen}
          onClose={() => setShareDialogOpen(false)}
          drawingId={drawingId}
          drawingName={drawingName}
        />
      )}
    </div>
  );
}

/**
 * 描画ページ（Provider でラップ）
 */
export function DrawingPage() {
  const { drawingId } = useParams<{ drawingId?: string }>();

  return (
    <DrawingProvider>
      <DrawingEditor existingDrawingId={drawingId} />
    </DrawingProvider>
  );
}
