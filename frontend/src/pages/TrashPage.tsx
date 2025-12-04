import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Trash2, RotateCcw, AlertTriangle, X } from "lucide-react";
import { getTrash, restoreNote, permanentDeleteNote } from "../api/notes";
import { Pagination, Modal } from "../components/common";
import type { NoteSummary } from "../api/types";

interface TrashItemProps {
  note: NoteSummary;
  onRestore: (id: number) => void;
  onDelete: (id: number) => void;
  isRestoring: boolean;
  isDeleting: boolean;
}

function TrashItem({
  note,
  onRestore,
  onDelete,
  isRestoring,
  isDeleting,
}: TrashItemProps) {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString("ja-JP");
  };

  return (
    <div className="trash-item">
      <div className="trash-item-info">
        <h3 className="trash-item-title">{note.title}</h3>
        <span className="trash-item-date">
          削除日: {formatDate(note.updated_at)}
        </span>
        {note.tags.length > 0 && (
          <div className="trash-item-tags">
            {note.tags.slice(0, 3).map((tag) => (
              <span key={tag.id} className="tag">
                {tag.name}
              </span>
            ))}
          </div>
        )}
      </div>
      <div className="trash-item-actions">
        <button
          className="btn btn-secondary btn-sm"
          onClick={() => onRestore(note.id)}
          disabled={isRestoring}
          title="復元"
        >
          <RotateCcw size={16} />
          復元
        </button>
        <button
          className="btn btn-danger btn-sm"
          onClick={() => onDelete(note.id)}
          disabled={isDeleting}
          title="完全に削除"
        >
          <Trash2 size={16} />
          削除
        </button>
      </div>
    </div>
  );
}

export default function TrashPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);
  const pageSize = 10;

  // Fetch trash
  const { data, isLoading } = useQuery({
    queryKey: ["trash", { page, pageSize }],
    queryFn: () => getTrash({ page, page_size: pageSize }),
  });

  const notes = data?.items || [];
  const total = data?.total || 0;
  const totalPages = Math.ceil(total / pageSize);

  // Restore mutation
  const restoreMutation = useMutation({
    mutationFn: (noteId: number) => restoreNote(noteId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["trash"] });
      queryClient.invalidateQueries({ queryKey: ["notes"] });
    },
  });

  // Permanent delete mutation
  const deleteMutation = useMutation({
    mutationFn: (noteId: number) => permanentDeleteNote(noteId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["trash"] });
      setDeleteConfirmId(null);
    },
  });

  const handleRestore = (noteId: number) => {
    restoreMutation.mutate(noteId);
  };

  const handleDelete = (noteId: number) => {
    setDeleteConfirmId(noteId);
  };

  const confirmDelete = () => {
    if (deleteConfirmId) {
      deleteMutation.mutate(deleteConfirmId);
    }
  };

  return (
    <div className="trash-page">
      <header className="page-header">
        <h1>
          <Trash2 size={24} />
          ゴミ箱
        </h1>
        <p className="page-description">
          削除されたノートは30日後に自動的に完全削除されます
        </p>
      </header>

      <div className="trash-content">
        {isLoading ? (
          <div className="loading-placeholder">
            <div className="spinner" />
            <span>読み込み中...</span>
          </div>
        ) : notes.length > 0 ? (
          <>
            <div className="trash-info">
              <span>{total}件のノートがゴミ箱にあります</span>
            </div>
            <div className="trash-list">
              {notes.map((note) => (
                <TrashItem
                  key={note.id}
                  note={note}
                  onRestore={handleRestore}
                  onDelete={handleDelete}
                  isRestoring={restoreMutation.isPending}
                  isDeleting={deleteMutation.isPending}
                />
              ))}
            </div>
            {totalPages > 1 && (
              <Pagination
                currentPage={page}
                totalPages={totalPages}
                onPageChange={setPage}
              />
            )}
          </>
        ) : (
          <div className="empty-state">
            <Trash2 size={48} className="empty-icon" />
            <h2>ゴミ箱は空です</h2>
            <p>削除されたノートはここに表示されます</p>
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={deleteConfirmId !== null}
        onClose={() => setDeleteConfirmId(null)}
        title="ノートを完全に削除"
      >
        <div className="delete-confirm-content">
          <div className="warning-icon">
            <AlertTriangle size={48} />
          </div>
          <p>
            このノートを完全に削除しますか？
            <br />
            <strong>この操作は取り消せません。</strong>
          </p>
          <div className="modal-actions">
            <button
              className="btn btn-secondary"
              onClick={() => setDeleteConfirmId(null)}
            >
              キャンセル
            </button>
            <button
              className="btn btn-danger"
              onClick={confirmDelete}
              disabled={deleteMutation.isPending}
            >
              <Trash2 size={16} />
              完全に削除
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
