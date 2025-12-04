import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams, useNavigate, Link } from "react-router-dom";
import {
  Edit,
  Trash2,
  Pin,
  PinOff,
  Lock,
  Unlock,
  Copy,
  MoreVertical,
  Clock,
  FileText,
  MessageSquare,
  List,
  ChevronRight,
  Download,
  X,
} from "lucide-react";
import { MarkdownViewer } from "../components/markdown";
import {
  getNote,
  deleteNote,
  toggleNotePin,
  toggleNoteReadonly,
  duplicateNote,
  getNoteToc,
  getNoteVersions,
} from "../api/notes";
import { getComments, createComment, deleteComment } from "../api/comments";
import { getFileDownloadUrl } from "../api/files";
import { useToast } from "../components/common";
import type { TocItem, Comment as CommentType } from "../api/types";

// Table of Contents Sidebar
function TocSidebar({ items }: { items: TocItem[] }) {
  const handleClick = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
    }
  };

  if (items.length === 0) return null;

  return (
    <aside className="toc-sidebar">
      <h3>
        <List size={16} />
        目次
      </h3>
      <nav className="toc-nav">
        {items.map((item) => (
          <button
            key={item.id}
            className="toc-item"
            onClick={() => handleClick(item.id)}
          >
            {item.text}
          </button>
        ))}
      </nav>
    </aside>
  );
}

// File List Component
function FileList({
  files,
}: {
  files: { id: number; original_name: string; mime_type: string; size_bytes: number }[];
}) {
  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const handleDownload = async (fileId: number, fileName: string) => {
    const url = await getFileDownloadUrl(fileId);
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  if (files.length === 0) return null;

  return (
    <div className="file-list">
      <h3>
        <FileText size={16} />
        添付ファイル ({files.length})
      </h3>
      <ul>
        {files.map((file) => (
          <li key={file.id} className="file-item">
            <span className="file-name">{file.original_name}</span>
            <span className="file-size">{formatSize(file.size_bytes)}</span>
            <button
              className="btn btn-icon btn-sm"
              onClick={() => handleDownload(file.id, file.original_name)}
            >
              <Download size={14} />
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

// Comment Section
function CommentSection({
  noteId,
  comments,
  isLoading,
}: {
  noteId: number;
  comments: CommentType[];
  isLoading: boolean;
}) {
  const [newComment, setNewComment] = useState("");
  const [displayName, setDisplayName] = useState(
    localStorage.getItem("commentDisplayName") || ""
  );
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  const createMutation = useMutation({
    mutationFn: (data: { content: string; display_name: string }) =>
      createComment(noteId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["comments", noteId] });
      setNewComment("");
      localStorage.setItem("commentDisplayName", displayName);
      showToast("コメントを投稿しました", "success");
    },
    onError: () => {
      showToast("コメントの投稿に失敗しました", "error");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (commentId: number) => deleteComment(noteId, commentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["comments", noteId] });
      showToast("コメントを削除しました", "success");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || !displayName.trim()) return;
    createMutation.mutate({ content: newComment, display_name: displayName });
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString("ja-JP");
  };

  return (
    <div className="comment-section">
      <h3>
        <MessageSquare size={16} />
        コメント ({comments.length})
      </h3>

      <form onSubmit={handleSubmit} className="comment-form">
        <input
          type="text"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          placeholder="表示名"
          className="comment-name-input"
          required
        />
        <textarea
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          placeholder="コメントを入力..."
          className="comment-textarea"
          required
        />
        <button
          type="submit"
          className="btn btn-primary"
          disabled={createMutation.isPending}
        >
          投稿
        </button>
      </form>

      {isLoading ? (
        <div className="loading-placeholder">読み込み中...</div>
      ) : comments.length > 0 ? (
        <ul className="comment-list">
          {comments.map((comment) => (
            <li key={comment.id} className="comment-item">
              <div className="comment-header">
                <span className="comment-author">{comment.display_name}</span>
                <span className="comment-date">{formatDate(comment.created_at)}</span>
                <button
                  className="btn btn-icon btn-sm"
                  onClick={() => deleteMutation.mutate(comment.id)}
                >
                  <X size={14} />
                </button>
              </div>
              <div className="comment-content">{comment.content}</div>
              {comment.replies && comment.replies.length > 0 && (
                <ul className="comment-replies">
                  {comment.replies.map((reply) => (
                    <li key={reply.id} className="comment-item reply">
                      <div className="comment-header">
                        <span className="comment-author">{reply.display_name}</span>
                        <span className="comment-date">
                          {formatDate(reply.created_at)}
                        </span>
                      </div>
                      <div className="comment-content">{reply.content}</div>
                    </li>
                  ))}
                </ul>
              )}
            </li>
          ))}
        </ul>
      ) : (
        <p className="no-comments">まだコメントはありません</p>
      )}
    </div>
  );
}

export default function NoteDetailPage() {
  const { noteId } = useParams<{ noteId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const [showMenu, setShowMenu] = useState(false);
  const [showVersions, setShowVersions] = useState(false);

  const id = parseInt(noteId!, 10);

  // Fetch note
  const {
    data: note,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["note", id],
    queryFn: () => getNote(id),
    enabled: !isNaN(id),
  });

  // Fetch TOC
  const { data: tocItems } = useQuery({
    queryKey: ["note", id, "toc"],
    queryFn: () => getNoteToc(id),
    enabled: !isNaN(id),
  });

  // Fetch comments
  const { data: comments, isLoading: commentsLoading } = useQuery({
    queryKey: ["comments", id],
    queryFn: () => getComments(id),
    enabled: !isNaN(id),
  });

  // Fetch versions
  const { data: versions } = useQuery({
    queryKey: ["note", id, "versions"],
    queryFn: () => getNoteVersions(id),
    enabled: !isNaN(id) && showVersions,
  });

  // Mutations
  const deleteMutation = useMutation({
    mutationFn: () => deleteNote(id),
    onSuccess: () => {
      showToast("ノートをゴミ箱に移動しました", "success");
      navigate("/notes");
    },
    onError: () => {
      showToast("削除に失敗しました", "error");
    },
  });

  const pinMutation = useMutation({
    mutationFn: (is_pinned: boolean) => toggleNotePin(id, is_pinned),
    onSuccess: (data) => {
      queryClient.setQueryData(["note", id], data);
      showToast(
        data.is_pinned ? "ピン留めしました" : "ピン留めを解除しました",
        "success"
      );
    },
  });

  const readonlyMutation = useMutation({
    mutationFn: (is_readonly: boolean) => toggleNoteReadonly(id, is_readonly),
    onSuccess: (data) => {
      queryClient.setQueryData(["note", id], data);
      showToast(
        data.is_readonly ? "閲覧専用に設定しました" : "編集可能に設定しました",
        "success"
      );
    },
  });

  const duplicateMutation = useMutation({
    mutationFn: () => duplicateNote(id),
    onSuccess: (data) => {
      showToast("ノートを複製しました", "success");
      navigate(`/notes/${data.id}`);
    },
    onError: () => {
      showToast("複製に失敗しました", "error");
    },
  });

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString("ja-JP");
  };

  if (isLoading) {
    return (
      <div className="note-detail-page loading">
        <div className="spinner" />
        <span>読み込み中...</span>
      </div>
    );
  }

  if (error || !note) {
    return (
      <div className="note-detail-page error">
        <h2>ノートが見つかりません</h2>
        <Link to="/notes" className="btn btn-primary">
          ノート一覧に戻る
        </Link>
      </div>
    );
  }

  return (
    <div className="note-detail-page">
      {/* Header */}
      <header className="note-header">
        <div className="note-breadcrumb">
          <Link to="/notes">ノート</Link>
          {note.folder && (
            <>
              <ChevronRight size={16} />
              <span>{note.folder.name}</span>
            </>
          )}
          <ChevronRight size={16} />
          <span>{note.title}</span>
        </div>

        <div className="note-actions">
          {!note.is_readonly && (
            <Link to={`/notes/${id}/edit`} className="btn btn-primary">
              <Edit size={16} />
              編集
            </Link>
          )}

          <div className="dropdown">
            <button
              className="btn btn-icon"
              onClick={() => setShowMenu(!showMenu)}
            >
              <MoreVertical size={20} />
            </button>
            {showMenu && (
              <div className="dropdown-menu">
                <button onClick={() => pinMutation.mutate(!note.is_pinned)}>
                  {note.is_pinned ? (
                    <>
                      <PinOff size={16} /> ピン留め解除
                    </>
                  ) : (
                    <>
                      <Pin size={16} /> ピン留め
                    </>
                  )}
                </button>
                <button onClick={() => readonlyMutation.mutate(!note.is_readonly)}>
                  {note.is_readonly ? (
                    <>
                      <Unlock size={16} /> 編集可能にする
                    </>
                  ) : (
                    <>
                      <Lock size={16} /> 閲覧専用にする
                    </>
                  )}
                </button>
                <button onClick={() => duplicateMutation.mutate()}>
                  <Copy size={16} /> 複製
                </button>
                <button onClick={() => setShowVersions(!showVersions)}>
                  <Clock size={16} /> バージョン履歴
                </button>
                <hr />
                <button
                  className="danger"
                  onClick={() => deleteMutation.mutate()}
                >
                  <Trash2 size={16} /> ゴミ箱へ移動
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Version History Panel */}
      {showVersions && versions && (
        <div className="version-panel">
          <h3>
            <Clock size={16} />
            バージョン履歴
          </h3>
          <ul className="version-list">
            {versions.map((version) => (
              <li key={version.id}>
                <span className="version-no">v{version.version_no}</span>
                <span className="version-title">{version.title}</span>
                <span className="version-date">
                  {formatDate(version.created_at)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Main Content */}
      <div className="note-layout">
        <TocSidebar items={tocItems || []} />

        <main className="note-main">
          <article className="note-article">
            <h1 className="note-title">{note.title}</h1>

            <div className="note-meta">
              <span className="meta-item">
                <Clock size={14} />
                更新: {formatDate(note.updated_at)}
              </span>
              {note.is_pinned && (
                <span className="badge badge-pin">
                  <Pin size={12} /> ピン留め
                </span>
              )}
              {note.is_readonly && (
                <span className="badge badge-readonly">
                  <Lock size={12} /> 閲覧専用
                </span>
              )}
            </div>

            {note.tags.length > 0 && (
              <div className="note-tags">
                {note.tags.map((tag) => (
                  <Link
                    key={tag.id}
                    to={`/notes?tag=${tag.name}`}
                    className="tag"
                  >
                    {tag.name}
                  </Link>
                ))}
              </div>
            )}

            <MarkdownViewer content={note.content_md} />
          </article>

          <FileList files={note.files} />

          <CommentSection
            noteId={id}
            comments={comments || []}
            isLoading={commentsLoading}
          />
        </main>
      </div>
    </div>
  );
}
