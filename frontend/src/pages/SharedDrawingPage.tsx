/**
 * SharedDrawingPage - 共有リンクから描画を表示するページ
 */

import { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Ship, Lock, Eye, Edit, AlertTriangle } from 'lucide-react';
import { DrawingProvider, useDrawing } from '../components/drawing/context/DrawingContext';
import { DrawingCanvas, type DrawingCanvasHandle } from '../components/drawing/DrawingCanvas';
import { DrawingToolbar } from '../components/drawing/DrawingToolbar';
import type { Shape as ApiShape } from '../api/drawings';
import { DrawingStatusBar } from '../components/drawing/DrawingStatusBar';
import { LayerPanel } from '../components/drawing/LayerPanel';
import { PropertyPanel } from '../components/drawing/PropertyPanel';
import { DrawingStylePanel } from '../components/drawing/DrawingStylePanel';
import { Ruler, RULER_SIZE } from '../components/drawing/Ruler';
import { useSharedDrawing, useDrawingMutations } from '../hooks/useDrawings';
import Button from '../components/common/Button';
import type { Point, Shape } from '../components/drawing/types';
import '../styles/drawing.css';

interface PasswordFormProps {
  onSubmit: (password: string) => void;
  error: string | null;
}

function PasswordForm({ onSubmit, error }: PasswordFormProps) {
  const [password, setPassword] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(password);
  };

  return (
    <div className="shared-drawing-password">
      <div className="shared-drawing-password-card">
        <div className="shared-drawing-password-icon">
          <Lock size={48} />
        </div>
        <h2>パスワードで保護されています</h2>
        <p>この描画を表示するにはパスワードを入力してください</p>
        <form onSubmit={handleSubmit}>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="パスワードを入力"
            autoFocus
          />
          {error && <div className="shared-drawing-password-error">{error}</div>}
          <Button type="submit" variant="primary">
            開く
          </Button>
        </form>
      </div>
    </div>
  );
}

interface SharedDrawingViewerProps {
  token: string;
  password?: string;
}

function SharedDrawingViewer({ token, password }: SharedDrawingViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<DrawingCanvasHandle>(null);
  const [canvasSize, setCanvasSize] = useState({ width: 800, height: 600 });
  const [mousePos, setMousePos] = useState<Point | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  const { data: sharedData, isLoading, error } = useSharedDrawing(token, password);
  const { state, dispatch } = useDrawing();
  const { update } = useDrawingMutations();

  // 編集可能かどうか
  const canEdit = sharedData?.can_edit ?? false;

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

  // 描画データを読み込み
  useEffect(() => {
    if (sharedData?.drawing && !isLoaded) {
      dispatch({
        type: 'LOAD_SHAPES',
        payload: sharedData.drawing.shapes as unknown as Shape[],
      });
      setIsLoaded(true);
    }
  }, [sharedData, isLoaded, dispatch]);

  // マウス位置の更新
  const handleMouseMove = (e: React.MouseEvent) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setMousePos({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
  };

  // 保存処理（編集可能な場合のみ）
  const handleSave = async () => {
    if (!canEdit || !sharedData?.drawing) return;

    try {
      await update(sharedData.drawing.id, {
        shapes: state.shapes as unknown as ApiShape[],
      });
      alert('保存しました');
    } catch (err) {
      console.error('Failed to save:', err);
      alert('保存に失敗しました');
    }
  };

  if (isLoading) {
    return (
      <div className="shared-drawing-loading">
        <div className="shared-drawing-spinner" />
        <p>読み込み中...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="shared-drawing-error">
        <AlertTriangle size={48} />
        <h2>エラーが発生しました</h2>
        <p>この共有リンクは無効か、有効期限が切れています。</p>
        <Link to="/">
          <Button variant="primary">ホームに戻る</Button>
        </Link>
      </div>
    );
  }

  if (!sharedData) {
    return null;
  }

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
            {sharedData.drawing.name}
            <span className="shared-drawing-badge">
              {canEdit ? (
                <>
                  <Edit size={12} />
                  編集可能
                </>
              ) : (
                <>
                  <Eye size={12} />
                  閲覧のみ
                </>
              )}
            </span>
          </h1>
        </div>
        <div className="drawing-header-actions">
          {canEdit && (
            <Button
              variant="primary"
              size="sm"
              onClick={handleSave}
            >
              保存
            </Button>
          )}
        </div>
      </header>

      {/* ツールバー（編集可能な場合のみ表示） */}
      {canEdit && <DrawingToolbar onExport={() => {}} />}

      {/* メインコンテンツ */}
      <div className="drawing-main">
        {/* キャンバスエリア */}
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
          </div>
        </div>

        {/* サイドバー（編集可能な場合のみ表示） */}
        {canEdit && (
          <aside className="drawing-sidebar">
            <LayerPanel />
            <PropertyPanel />
            <DrawingStylePanel />
          </aside>
        )}
      </div>

      {/* ステータスバー */}
      <DrawingStatusBar
        mousePosition={mousePos}
        canvasWidth={canvasSize.width}
        canvasHeight={canvasSize.height}
      />
    </div>
  );
}

/**
 * 共有描画ページ
 */
export function SharedDrawingPage() {
  const { token } = useParams<{ token: string }>();
  const [password, setPassword] = useState<string | undefined>(undefined);
  const [needsPassword, setNeedsPassword] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  // パスワードが必要かチェック
  useEffect(() => {
    const checkPassword = async () => {
      if (!token) return;

      try {
        const response = await fetch(`/api/drawings/shared/${token}`);
        if (response.status === 400) {
          const data = await response.json();
          if (data.detail?.includes('パスワード')) {
            setNeedsPassword(true);
          }
        }
      } catch {
        // エラーは無視
      }
    };

    checkPassword();
  }, [token]);

  const handlePasswordSubmit = (pwd: string) => {
    setPassword(pwd);
    setPasswordError(null);
  };

  if (!token) {
    return (
      <div className="shared-drawing-error">
        <AlertTriangle size={48} />
        <h2>無効なリンク</h2>
        <p>共有リンクが無効です。</p>
        <Link to="/">
          <Button variant="primary">ホームに戻る</Button>
        </Link>
      </div>
    );
  }

  if (needsPassword && !password) {
    return <PasswordForm onSubmit={handlePasswordSubmit} error={passwordError} />;
  }

  return (
    <DrawingProvider>
      <SharedDrawingViewer token={token} password={password} />
    </DrawingProvider>
  );
}
