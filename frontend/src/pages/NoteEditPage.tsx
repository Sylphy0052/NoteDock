import { useState, useEffect, useRef, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams, useNavigate, Link } from "react-router-dom";
import {
  Save,
  Eye,
  Edit as EditIcon,
  Bold,
  Italic,
  List,
  ListOrdered,
  Link as LinkIcon,
  Image,
  Code,
  Heading1,
  Heading2,
  Heading3,
  Quote,
  Upload,
  X,
  ChevronRight,
  ImagePlus,
  Paperclip,
  Trash2,
  Download,
  File,
  Lock,
  AlertTriangle,
  FileText,
  MoreVertical,
} from "lucide-react";
import { MarkdownViewer } from "../components/markdown";
import { ImageInsertModal, NoteLinkSuggester } from "../components/editor";
import { TemplateSelectModal, SaveAsTemplateModal } from "../components/templates";
import {
  getNote,
  createNote,
  updateNote,
  checkEditLock,
  acquireEditLock,
  releaseEditLock,
  refreshEditLock,
} from "../api/notes";
import { uploadFile, getFileDownloadUrl } from "../api/files";
import { getFolders } from "../api/folders";
import { getSuggestedTags } from "../api/tags";
import { useToast } from "../components/common";
import type { NoteCreate, NoteUpdate } from "../api/types";

// Editor Toolbar
interface ToolbarProps {
  onInsert: (prefix: string, suffix: string) => void;
  onUploadImage: () => void;
}

function EditorToolbar({ onInsert, onUploadImage }: ToolbarProps) {
  const tools = [
    { icon: <Bold size={16} />, action: () => onInsert("**", "**"), title: "太字" },
    { icon: <Italic size={16} />, action: () => onInsert("*", "*"), title: "斜体" },
    { icon: <Heading1 size={16} />, action: () => onInsert("# ", ""), title: "見出し1" },
    { icon: <Heading2 size={16} />, action: () => onInsert("## ", ""), title: "見出し2" },
    { icon: <Heading3 size={16} />, action: () => onInsert("### ", ""), title: "見出し3" },
    { icon: <List size={16} />, action: () => onInsert("- ", ""), title: "箇条書き" },
    { icon: <ListOrdered size={16} />, action: () => onInsert("1. ", ""), title: "番号付き" },
    { icon: <Quote size={16} />, action: () => onInsert("> ", ""), title: "引用" },
    { icon: <Code size={16} />, action: () => onInsert("`", "`"), title: "コード" },
    { icon: <LinkIcon size={16} />, action: () => onInsert("[", "](url)"), title: "リンク" },
    { icon: <Image size={16} />, action: onUploadImage, title: "画像" },
  ];

  return (
    <div className="editor-toolbar">
      {tools.map((tool, index) => (
        <button
          key={index}
          type="button"
          className="toolbar-btn"
          onClick={tool.action}
          title={tool.title}
        >
          {tool.icon}
        </button>
      ))}
    </div>
  );
}

// Tag Input Component
interface TagInputProps {
  tags: string[];
  onChange: (tags: string[]) => void;
  noteId?: number;
}

function TagInput({ tags, onChange, noteId }: TagInputProps) {
  const [input, setInput] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);

  const { data: suggestions } = useQuery({
    queryKey: ["tag-suggestions", noteId],
    queryFn: () => (noteId ? getSuggestedTags(noteId) : Promise.resolve([])),
    enabled: !!noteId,
  });

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addTag(input.trim());
    }
  };

  const addTag = (tag: string) => {
    if (tag && !tags.includes(tag)) {
      onChange([...tags, tag]);
    }
    setInput("");
    setShowSuggestions(false);
  };

  const removeTag = (tag: string) => {
    onChange(tags.filter((t) => t !== tag));
  };

  return (
    <div className="tag-input-container">
      <div className="tag-input-tags">
        {tags.map((tag) => (
          <span key={tag} className="tag">
            {tag}
            <button type="button" onClick={() => removeTag(tag)}>
              <X size={12} />
            </button>
          </span>
        ))}
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => setShowSuggestions(true)}
          onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
          placeholder="タグを追加..."
          className="tag-input"
        />
      </div>
      {showSuggestions && suggestions && suggestions.length > 0 && (
        <ul className="tag-suggestions">
          {suggestions
            .filter((s) => !tags.includes(s))
            .map((suggestion) => (
              <li key={suggestion} onClick={() => addTag(suggestion)}>
                {suggestion}
              </li>
            ))}
        </ul>
      )}
    </div>
  );
}

// Attached file type
interface AttachedFile {
  id: number;
  original_name: string;
  mime_type: string;
  size_bytes: number;
}

export default function NoteEditPage() {
  const { noteId } = useParams<{ noteId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const dropZoneRef = useRef<HTMLDivElement>(null);

  const isNew = !noteId || noteId === "new";
  const id = isNew ? undefined : parseInt(noteId, 10);

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [folderId, setFolderId] = useState<number | null>(null);
  const [tags, setTags] = useState<string[]>([]);
  const [isPinned, setIsPinned] = useState(false);
  const [isReadonly, setIsReadonly] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [coverFileId, setCoverFileId] = useState<number | null>(null);
  const [coverFileUrl, setCoverFileUrl] = useState<string | null>(null);
  const [attachedFiles, setAttachedFiles] = useState<AttachedFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [showImageModal, setShowImageModal] = useState(false);
  const [showTemplateModal, setShowTemplateModal] = useState(isNew);
  const [showSaveTemplateModal, setShowSaveTemplateModal] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);

  // Edit lock state
  const [lockStatus, setLockStatus] = useState<{
    isLocked: boolean;
    lockedBy: string | null;
    showWarning: boolean;
  }>({ isLocked: false, lockedBy: null, showWarning: false });
  const [displayName] = useState<string>(
    () => localStorage.getItem("displayName") || "匿名ユーザー"
  );
  const lockRefreshIntervalRef = useRef<number | null>(null);

  // Draft auto-save state
  const [lastDraftSaved, setLastDraftSaved] = useState<Date | null>(null);
  const [showDraftRecovery, setShowDraftRecovery] = useState(false);
  const [recoveredDraft, setRecoveredDraft] = useState<{
    title: string;
    content: string;
  } | null>(null);
  const draftAutoSaveIntervalRef = useRef<number | null>(null);
  const DRAFT_AUTO_SAVE_INTERVAL = 30 * 1000; // 30 seconds

  // Draft helper functions
  const getDraftKey = useCallback(() => {
    return isNew ? "draft_new_note" : `draft_note_${id}`;
  }, [isNew, id]);

  const saveDraft = useCallback(() => {
    if (!title && !content) return;
    const draft = {
      title,
      content,
      savedAt: new Date().toISOString(),
    };
    localStorage.setItem(getDraftKey(), JSON.stringify(draft));
    setLastDraftSaved(new Date());
  }, [title, content, getDraftKey]);

  const loadDraft = useCallback(() => {
    const draftStr = localStorage.getItem(getDraftKey());
    if (draftStr) {
      try {
        const draft = JSON.parse(draftStr);
        return draft;
      } catch {
        return null;
      }
    }
    return null;
  }, [getDraftKey]);

  const clearDraft = useCallback(() => {
    localStorage.removeItem(getDraftKey());
    setLastDraftSaved(null);
  }, [getDraftKey]);

  // Fetch existing note
  const { data: note, isLoading } = useQuery({
    queryKey: ["note", id],
    queryFn: () => getNote(id!),
    enabled: !!id,
  });

  // Fetch folders
  const { data: folders } = useQuery({
    queryKey: ["folders"],
    queryFn: getFolders,
  });

  // Populate form with existing note data
  useEffect(() => {
    if (note) {
      setTitle(note.title);
      setContent(note.content_md);
      setFolderId(note.folder_id);
      setTags(note.tags.map((t) => t.name));
      setIsPinned(note.is_pinned);
      setIsReadonly(note.is_readonly);
      setCoverFileId(note.cover_file_id);
      setCoverFileUrl(note.cover_file_url);
      setAttachedFiles(note.files || []);
    }
  }, [note]);

  // Check for draft recovery on mount
  useEffect(() => {
    const draft = loadDraft();
    if (draft) {
      // For new notes, always check draft
      // For existing notes, check if draft is newer or has different content
      const shouldRecover = isNew
        ? draft.title || draft.content
        : note && (draft.title !== note.title || draft.content !== note.content_md);

      if (shouldRecover) {
        setRecoveredDraft({ title: draft.title, content: draft.content });
        setShowDraftRecovery(true);
      }
    }
  }, [loadDraft, isNew, note]);

  // Draft auto-save interval
  useEffect(() => {
    // Start auto-save interval
    draftAutoSaveIntervalRef.current = window.setInterval(() => {
      if (isDirty) {
        saveDraft();
      }
    }, DRAFT_AUTO_SAVE_INTERVAL);

    return () => {
      if (draftAutoSaveIntervalRef.current) {
        clearInterval(draftAutoSaveIntervalRef.current);
      }
    };
  }, [isDirty, saveDraft]);

  // Handle draft recovery
  const handleRecoverDraft = () => {
    if (recoveredDraft) {
      setTitle(recoveredDraft.title);
      setContent(recoveredDraft.content);
      showToast("ドラフトを復元しました", "success");
    }
    setShowDraftRecovery(false);
    setRecoveredDraft(null);
  };

  const handleDiscardDraft = () => {
    clearDraft();
    setShowDraftRecovery(false);
    setRecoveredDraft(null);
  };

  // Mark as dirty when content changes
  useEffect(() => {
    if (note) {
      const hasChanges =
        title !== note.title ||
        content !== note.content_md ||
        folderId !== note.folder_id ||
        isPinned !== note.is_pinned ||
        isReadonly !== note.is_readonly;
      setIsDirty(hasChanges);
    } else if (isNew) {
      setIsDirty(title !== "" || content !== "");
    }
  }, [title, content, folderId, isPinned, isReadonly, note, isNew]);

  // Warn before leaving with unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirty) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [isDirty]);

  // Edit lock: acquire on mount, release on unmount
  useEffect(() => {
    if (isNew || !id) return;

    const tryAcquireLock = async () => {
      try {
        // First check if already locked
        const status = await checkEditLock(id);
        if (status.is_locked && status.locked_by !== displayName) {
          setLockStatus({
            isLocked: true,
            lockedBy: status.locked_by,
            showWarning: true,
          });
          return;
        }

        // Try to acquire lock
        const result = await acquireEditLock(id, displayName);
        if (!result.success) {
          setLockStatus({
            isLocked: true,
            lockedBy: result.locked_by || null,
            showWarning: true,
          });
        } else {
          setLockStatus({ isLocked: false, lockedBy: null, showWarning: false });
          // Start refresh interval (every 10 minutes)
          lockRefreshIntervalRef.current = window.setInterval(async () => {
            try {
              await refreshEditLock(id, displayName);
            } catch (err) {
              console.error("Failed to refresh edit lock:", err);
            }
          }, 10 * 60 * 1000);
        }
      } catch (err) {
        console.error("Failed to check/acquire edit lock:", err);
      }
    };

    tryAcquireLock();

    // Cleanup: release lock on unmount
    return () => {
      if (lockRefreshIntervalRef.current) {
        clearInterval(lockRefreshIntervalRef.current);
      }
      if (id && !lockStatus.showWarning) {
        releaseEditLock(id, displayName).catch((err) =>
          console.error("Failed to release edit lock:", err)
        );
      }
    };
  }, [id, isNew, displayName]);

  // Handle force acquire lock (ignore warning)
  const handleForceAcquireLock = async () => {
    if (!id) return;
    try {
      const result = await acquireEditLock(id, displayName, true);
      if (result.success) {
        setLockStatus({ isLocked: false, lockedBy: null, showWarning: false });
        showToast("編集ロックを取得しました", "success");
        // Start refresh interval
        lockRefreshIntervalRef.current = window.setInterval(async () => {
          try {
            await refreshEditLock(id, displayName);
          } catch (err) {
            console.error("Failed to refresh edit lock:", err);
          }
        }, 10 * 60 * 1000);
      }
    } catch (err) {
      showToast("ロックの取得に失敗しました", "error");
    }
  };

  // Create mutation
  const createMutation = useMutation({
    mutationFn: (data: NoteCreate) => createNote(data),
    onSuccess: (data) => {
      clearDraft(); // Clear draft after successful save
      queryClient.invalidateQueries({ queryKey: ["notes"] });
      showToast("ノートを作成しました", "success");
      navigate(`/notes/${data.id}`);
    },
    onError: () => {
      showToast("ノートの作成に失敗しました", "error");
    },
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: (data: NoteUpdate) => updateNote(id!, data),
    onSuccess: (data) => {
      clearDraft(); // Clear draft after successful save
      queryClient.invalidateQueries({ queryKey: ["notes"] });
      queryClient.setQueryData(["note", id], data);
      setIsDirty(false);
      showToast("ノートを保存しました", "success");
    },
    onError: () => {
      showToast("ノートの保存に失敗しました", "error");
    },
  });

  // File upload mutation
  const uploadMutation = useMutation({
    mutationFn: (file: File) => uploadFile(file),
    onSuccess: async (data) => {
      const url = await getFileDownloadUrl(data.id);
      const isImage = data.mime_type.startsWith("image/");
      const markdown = isImage
        ? `![${data.original_name}](${url})`
        : `[${data.original_name}](${url})`;
      insertText(markdown);
      showToast("ファイルをアップロードしました", "success");
    },
    onError: () => {
      showToast("ファイルのアップロードに失敗しました", "error");
    },
  });

  const insertText = useCallback(
    (prefix: string, suffix: string = "") => {
      const textarea = textareaRef.current;
      if (!textarea) return;

      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const selectedText = content.substring(start, end);
      const newContent =
        content.substring(0, start) +
        prefix +
        selectedText +
        suffix +
        content.substring(end);

      setContent(newContent);

      // Restore cursor position
      setTimeout(() => {
        textarea.focus();
        const newCursorPos = start + prefix.length + selectedText.length;
        textarea.setSelectionRange(newCursorPos, newCursorPos);
      }, 0);
    },
    [content]
  );

  const handleSave = () => {
    if (!title.trim()) {
      showToast("タイトルを入力してください", "error");
      return;
    }

    const data = {
      title: title.trim(),
      content_md: content,
      folder_id: folderId,
      tag_names: tags,
      is_pinned: isPinned,
      is_readonly: isReadonly,
      cover_file_id: coverFileId,
    };

    if (isNew) {
      createMutation.mutate(data);
    } else {
      updateMutation.mutate(data);
    }
  };

  const handleFileUpload = () => {
    fileInputRef.current?.click();
  };

  const handleOpenImageModal = () => {
    setShowImageModal(true);
  };

  const handleImageInsert = (markdown: string) => {
    insertText(markdown);
    setShowImageModal(false);
  };

  // Handle note link insertion from suggester
  const handleNoteLinkInsert = useCallback(
    (noteId: number, noteTitle: string) => {
      const textarea = textareaRef.current;
      if (!textarea) return;

      const cursorPos = textarea.selectionStart;
      const textBeforeCursor = content.substring(0, cursorPos);

      // Find the [# pattern to replace
      const triggerMatch = textBeforeCursor.match(/\[#([^\]\s]*)$/);
      if (triggerMatch) {
        const startPos = cursorPos - triggerMatch[0].length;
        const newContent =
          content.substring(0, startPos) +
          `[#${noteId}]` +
          content.substring(cursorPos);

        setContent(newContent);

        // Move cursor after the inserted link
        setTimeout(() => {
          const newCursorPos = startPos + `[#${noteId}]`.length;
          textarea.focus();
          textarea.setSelectionRange(newCursorPos, newCursorPos);
        }, 0);
      }
    },
    [content]
  );

  const handleTemplateSelect = (templateContent: string) => {
    setContent(templateContent);
    setShowTemplateModal(false);
  };

  const handleSaveAsTemplate = () => {
    setShowSaveTemplateModal(true);
    setShowMoreMenu(false);
  };

  const handleCoverUpload = () => {
    coverInputRef.current?.click();
  };

  const handleCoverChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith("image/")) {
        showToast("カバー画像は画像ファイルを選択してください", "error");
        return;
      }
      try {
        const data = await uploadFile(file);
        const url = await getFileDownloadUrl(data.id);
        setCoverFileId(data.id);
        setCoverFileUrl(url);
        showToast("カバー画像を設定しました", "success");
      } catch {
        showToast("カバー画像のアップロードに失敗しました", "error");
      }
    }
  };

  const handleRemoveCover = () => {
    setCoverFileId(null);
    setCoverFileUrl(null);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      uploadMutation.mutate(file);
    }
  };

  // Drag & drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = Array.from(e.dataTransfer.files);
    for (const file of files) {
      try {
        const data = await uploadFile(file);
        const url = await getFileDownloadUrl(data.id);
        const isImage = data.mime_type.startsWith("image/");
        const markdown = isImage
          ? `![${data.original_name}](${url})`
          : `[${data.original_name}](${url})`;
        insertText(markdown);
        setAttachedFiles((prev) => [...prev, data]);
        showToast(`${data.original_name} をアップロードしました`, "success");
      } catch {
        showToast(`${file.name} のアップロードに失敗しました`, "error");
      }
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "s") {
        e.preventDefault();
        handleSave();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleSave]);

  if (!isNew && isLoading) {
    return (
      <div className="note-edit-page loading">
        <div className="spinner" />
        <span>読み込み中...</span>
      </div>
    );
  }

  if (!isNew && note?.is_readonly) {
    return (
      <div className="note-edit-page">
        <div className="edit-lock-warning">
          <div className="lock-warning-icon">
            <Lock size={48} />
          </div>
          <h2>このノートは編集がロックされています</h2>
          <p>このノートは閲覧専用に設定されているため、編集できません。</p>
          <p className="lock-warning-hint">
            編集を行うには、ノートの閲覧専用設定を解除してください。
          </p>
          <div className="lock-warning-actions">
            <Link to={`/notes/${id}`} className="btn btn-primary">
              <Eye size={18} />
              ノートを表示
            </Link>
            <Link to="/notes" className="btn btn-secondary">
              ノート一覧へ戻る
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Show edit lock warning (another user is editing)
  if (lockStatus.showWarning) {
    return (
      <div className="note-edit-page">
        <div className="edit-lock-warning">
          <div className="lock-warning-icon warning">
            <AlertTriangle size={48} />
          </div>
          <h2>現在他のユーザーが編集中です</h2>
          <p>
            <strong>{lockStatus.lockedBy}</strong> さんがこのノートを編集しています。
          </p>
          <p className="lock-warning-hint">
            閲覧のみ行うか、ロックを無視して編集を続行することができます。
            続行した場合、変更が競合する可能性があります。
          </p>
          <div className="lock-warning-actions">
            <Link to={`/notes/${id}`} className="btn btn-primary">
              <Eye size={18} />
              閲覧のみ
            </Link>
            <button
              className="btn btn-warning"
              onClick={handleForceAcquireLock}
            >
              <AlertTriangle size={18} />
              ロックを無視して編集
            </button>
            <Link to="/notes" className="btn btn-secondary">
              ノート一覧へ戻る
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="note-edit-page">
      {/* Draft Recovery Modal */}
      {showDraftRecovery && (
        <div className="modal-overlay">
          <div className="modal draft-recovery-modal">
            <header className="modal-header">
              <h2>
                <FileText size={20} />
                未保存のドラフトがあります
              </h2>
            </header>
            <div className="modal-body">
              <p>前回編集中のドラフトが見つかりました。復元しますか？</p>
              {recoveredDraft && (
                <div className="draft-preview">
                  <strong>タイトル:</strong> {recoveredDraft.title || "(無題)"}
                  <br />
                  <strong>内容:</strong>{" "}
                  {recoveredDraft.content.substring(0, 100)}
                  {recoveredDraft.content.length > 100 ? "..." : ""}
                </div>
              )}
            </div>
            <footer className="modal-footer">
              <button className="btn btn-secondary" onClick={handleDiscardDraft}>
                破棄する
              </button>
              <button className="btn btn-primary" onClick={handleRecoverDraft}>
                復元する
              </button>
            </footer>
          </div>
        </div>
      )}

      {/* Header */}
      <header className="edit-header">
        <div className="edit-breadcrumb">
          <Link to="/notes">ノート</Link>
          <ChevronRight size={16} />
          <span>{isNew ? "新規作成" : "編集"}</span>
          {lastDraftSaved && (
            <span className="draft-saved-indicator" title="最終ドラフト保存時刻">
              (ドラフト保存: {lastDraftSaved.toLocaleTimeString()})
            </span>
          )}
        </div>

        <div className="edit-actions">
          {isNew && (
            <button
              className="btn btn-secondary"
              onClick={() => setShowTemplateModal(true)}
              title="テンプレートから作成"
            >
              <FileText size={18} />
              テンプレート
            </button>
          )}
          <button
            className={`btn btn-secondary ${showPreview ? "active" : ""}`}
            onClick={() => setShowPreview(!showPreview)}
            title={showPreview ? "編集モードに切り替え" : "プレビューモードに切り替え"}
          >
            {showPreview ? <EditIcon size={18} /> : <Eye size={18} />}
            {showPreview ? "編集" : "プレビュー"}
          </button>
          <button
            className="btn btn-primary"
            onClick={handleSave}
            disabled={createMutation.isPending || updateMutation.isPending}
          >
            <Save size={18} />
            保存
          </button>
          <div className="dropdown">
            <button
              className="btn btn-icon"
              onClick={() => setShowMoreMenu(!showMoreMenu)}
              title="その他のオプション"
            >
              <MoreVertical size={18} />
            </button>
            {showMoreMenu && (
              <div className="dropdown-menu">
                <button onClick={handleSaveAsTemplate}>
                  <FileText size={16} />
                  テンプレートとして保存
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="edit-layout">
        <div className="edit-sidebar">
          <div className="form-group">
            <label>フォルダ</label>
            <select
              value={folderId || ""}
              onChange={(e) =>
                setFolderId(e.target.value ? parseInt(e.target.value, 10) : null)
              }
            >
              <option value="">なし</option>
              {folders?.map((folder) => (
                <option key={folder.id} value={folder.id}>
                  {folder.name}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label>タグ</label>
            <TagInput tags={tags} onChange={setTags} noteId={id} />
          </div>

          <div className="form-group">
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={isPinned}
                onChange={(e) => setIsPinned(e.target.checked)}
              />
              ピン留め
            </label>
          </div>

          <div className="form-group">
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={isReadonly}
                onChange={(e) => setIsReadonly(e.target.checked)}
              />
              閲覧専用
            </label>
          </div>

          {/* Cover Image */}
          <div className="form-group">
            <label>カバー画像</label>
            {coverFileUrl ? (
              <div className="cover-preview">
                <img src={coverFileUrl} alt="カバー" />
                <div className="cover-actions">
                  <button
                    type="button"
                    className="btn btn-sm btn-secondary"
                    onClick={handleCoverUpload}
                  >
                    変更
                  </button>
                  <button
                    type="button"
                    className="btn btn-sm btn-danger"
                    onClick={handleRemoveCover}
                  >
                    <X size={14} />
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                className="cover-upload-btn"
                onClick={handleCoverUpload}
              >
                <ImagePlus size={20} />
                <span>カバー画像を追加</span>
              </button>
            )}
          </div>

          {/* Attached Files */}
          {attachedFiles.length > 0 && (
            <div className="form-group">
              <label>
                <Paperclip size={14} />
                添付ファイル ({attachedFiles.length})
              </label>
              <ul className="attached-files-list">
                {attachedFiles.map((file) => (
                  <li key={file.id} className="attached-file-item">
                    <File size={14} />
                    <span className="file-name" title={file.original_name}>
                      {file.original_name}
                    </span>
                    <span className="file-size">
                      {formatFileSize(file.size_bytes)}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <div className="edit-main">
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="タイトルを入力..."
            className="title-input"
          />

          {showPreview ? (
            <div className="preview-container">
              <MarkdownViewer content={content} />
            </div>
          ) : (
            <div
              ref={dropZoneRef}
              className={`editor-container ${isDragging ? "dragging" : ""}`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              <EditorToolbar onInsert={insertText} onUploadImage={handleOpenImageModal} />
              <div className="textarea-wrapper">
                <textarea
                  ref={textareaRef}
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Markdownで入力...&#10;&#10;ヒント: [# と入力するとノートリンクを挿入できます"
                  className="content-textarea"
                />
                <NoteLinkSuggester
                  textareaRef={textareaRef}
                  content={content}
                  onInsertLink={handleNoteLinkInsert}
                />
              </div>
              {isDragging && (
                <div className="drop-overlay">
                  <Upload size={48} />
                  <span>ファイルをドロップしてアップロード</span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Hidden file inputs */}
      <input
        ref={fileInputRef}
        type="file"
        onChange={handleFileChange}
        style={{ display: "none" }}
        accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt,.md"
      />
      <input
        ref={coverInputRef}
        type="file"
        onChange={handleCoverChange}
        style={{ display: "none" }}
        accept="image/*"
      />

      {/* Upload indicator */}
      {uploadMutation.isPending && (
        <div className="upload-indicator">
          <Upload size={16} />
          <span>アップロード中...</span>
        </div>
      )}

      {/* Image Insert Modal */}
      <ImageInsertModal
        isOpen={showImageModal}
        onClose={() => setShowImageModal(false)}
        onInsert={handleImageInsert}
      />

      {/* Template Select Modal */}
      <TemplateSelectModal
        isOpen={showTemplateModal}
        onClose={() => setShowTemplateModal(false)}
        onSelect={handleTemplateSelect}
      />

      {/* Save As Template Modal */}
      <SaveAsTemplateModal
        isOpen={showSaveTemplateModal}
        onClose={() => setShowSaveTemplateModal(false)}
        content={content}
        defaultName={title}
        onSave={() => showToast("テンプレートを保存しました", "success")}
      />
    </div>
  );
}
