/**
 * Drawings List Page - 保存済み描画の一覧ページ
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, Trash2, Download, Edit3, Calendar, Shapes, HelpCircle } from 'lucide-react';
import {
  getDrawingsList,
  loadDrawing,
  deleteDrawing,
  exportAsJson,
  type DrawingListItem,
} from '../components/drawing/utils/storage';
import Button from '../components/common/Button';
import Modal from '../components/common/Modal';
import '../styles/drawing.css';

export function DrawingsListPage() {
  const navigate = useNavigate();
  const [drawings, setDrawings] = useState<DrawingListItem[]>([]);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [drawingToDelete, setDrawingToDelete] = useState<DrawingListItem | null>(null);

  // 描画リストを読み込み
  const loadDrawings = useCallback(() => {
    const list = getDrawingsList();
    setDrawings(list);
  }, []);

  useEffect(() => {
    loadDrawings();
  }, [loadDrawings]);

  // 描画を開く
  const handleOpen = (id: string) => {
    navigate(`/drawing/${id}`);
  };

  // 新規描画を作成
  const handleNewDrawing = () => {
    navigate('/drawing');
  };

  // 削除確認ダイアログを開く
  const openDeleteModal = (drawing: DrawingListItem) => {
    setDrawingToDelete(drawing);
    setDeleteModalOpen(true);
  };

  // 削除を実行
  const handleDelete = () => {
    if (drawingToDelete) {
      deleteDrawing(drawingToDelete.id);
      loadDrawings();
      setDeleteModalOpen(false);
      setDrawingToDelete(null);
    }
  };

  // JSONとしてエクスポート
  const handleExportJson = (id: string) => {
    const data = loadDrawing(id);
    if (data) {
      exportAsJson(data);
    }
  };

  // 日付をフォーマット
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="drawings-list-page">
      {/* ヘッダー */}
      <header className="drawings-list-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <Link to="/" style={{ color: 'var(--color-text-secondary)' }}>
            <ArrowLeft size={20} />
          </Link>
          <h1 className="drawings-list-title">保存済み描画</h1>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <Button
            variant="secondary"
            size="sm"
            leftIcon={<HelpCircle size={16} />}
            onClick={() => navigate('/drawings/tutorial')}
          >
            チュートリアル
          </Button>
          <Button
            variant="primary"
            size="sm"
            leftIcon={<Plus size={16} />}
            onClick={handleNewDrawing}
          >
            新規作成
          </Button>
        </div>
      </header>

      {/* 描画リスト */}
      <div className="drawings-list-content">
        {drawings.length === 0 ? (
          <div className="drawings-list-empty">
            <Shapes size={48} />
            <h2>保存済みの描画がありません</h2>
            <p>「新規作成」ボタンから描画を始めましょう</p>
            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', justifyContent: 'center' }}>
              <Button
                variant="secondary"
                leftIcon={<HelpCircle size={16} />}
                onClick={() => navigate('/drawings/tutorial')}
              >
                チュートリアルで学ぶ
              </Button>
              <Button
                variant="primary"
                leftIcon={<Plus size={16} />}
                onClick={handleNewDrawing}
              >
                新規作成
              </Button>
            </div>
          </div>
        ) : (
          <div className="drawings-list-grid">
            {drawings.map((drawing) => (
              <div key={drawing.id} className="drawing-card">
                <div
                  className="drawing-card-preview"
                  onClick={() => handleOpen(drawing.id)}
                >
                  <Shapes size={32} />
                </div>
                <div className="drawing-card-info">
                  <h3 className="drawing-card-name">{drawing.name}</h3>
                  <div className="drawing-card-meta">
                    <span>
                      <Shapes size={12} />
                      {drawing.shapeCount}個の図形
                    </span>
                    <span>
                      <Calendar size={12} />
                      {formatDate(drawing.updatedAt)}
                    </span>
                  </div>
                </div>
                <div className="drawing-card-actions">
                  <button
                    type="button"
                    className="drawing-card-action"
                    onClick={() => handleOpen(drawing.id)}
                    title="編集"
                  >
                    <Edit3 size={16} />
                  </button>
                  <button
                    type="button"
                    className="drawing-card-action"
                    onClick={() => handleExportJson(drawing.id)}
                    title="JSONエクスポート"
                  >
                    <Download size={16} />
                  </button>
                  <button
                    type="button"
                    className="drawing-card-action drawing-card-action-danger"
                    onClick={() => openDeleteModal(drawing)}
                    title="削除"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 削除確認モーダル */}
      <Modal
        isOpen={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        title="描画を削除"
      >
        <div className="drawings-delete-modal">
          <p>
            「{drawingToDelete?.name}」を削除しますか？
            <br />
            この操作は取り消せません。
          </p>
          <div className="drawings-delete-actions">
            <Button variant="secondary" onClick={() => setDeleteModalOpen(false)}>
              キャンセル
            </Button>
            <Button variant="danger" onClick={handleDelete}>
              削除
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
