import { useState, useEffect } from "react";
import { X, FileText, Trash2, Star, User, Loader2 } from "lucide-react";
import {
  getTemplates,
  deleteTemplate,
  type Template,
} from "../../api/templates";

interface TemplateSelectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (content: string) => void;
}

export function TemplateSelectModal({
  isOpen,
  onClose,
  onSelect,
}: TemplateSelectModalProps) {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [filter, setFilter] = useState<"all" | "system" | "user">("all");
  const [deleting, setDeleting] = useState<number | null>(null);

  // Fetch templates when modal opens
  useEffect(() => {
    if (isOpen) {
      fetchTemplates();
    }
  }, [isOpen]);

  const fetchTemplates = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await getTemplates();
      setTemplates(response.items);
    } catch (err) {
      setError("テンプレートの取得に失敗しました");
      console.error("Failed to fetch templates:", err);
    } finally {
      setLoading(false);
    }
  };

  const filteredTemplates = templates.filter((t) => {
    if (filter === "all") return true;
    if (filter === "system") return t.is_system;
    if (filter === "user") return !t.is_system;
    return true;
  });

  const selectedTemplate = templates.find((t) => t.id === selectedId);

  const handleSelect = () => {
    if (selectedTemplate) {
      onSelect(selectedTemplate.content);
      onClose();
    }
  };

  const handleDelete = async (templateId: number) => {
    if (!confirm("このテンプレートを削除しますか？")) {
      return;
    }

    setDeleting(templateId);
    try {
      await deleteTemplate(templateId);
      setTemplates((prev) => prev.filter((t) => t.id !== templateId));
      if (selectedId === templateId) {
        setSelectedId(null);
      }
    } catch (err) {
      console.error("Failed to delete template:", err);
      alert("テンプレートの削除に失敗しました");
    } finally {
      setDeleting(null);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal template-select-modal"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="modal-header">
          <h2>
            <FileText size={20} />
            テンプレートを選択
          </h2>
          <button className="btn btn-icon" onClick={onClose}>
            <X size={20} />
          </button>
        </header>

        <div className="modal-body">
          {/* Filter tabs */}
          <div className="template-filter-tabs">
            <button
              className={`tab ${filter === "all" ? "active" : ""}`}
              onClick={() => setFilter("all")}
            >
              すべて
            </button>
            <button
              className={`tab ${filter === "system" ? "active" : ""}`}
              onClick={() => setFilter("system")}
            >
              <Star size={14} />
              システム
            </button>
            <button
              className={`tab ${filter === "user" ? "active" : ""}`}
              onClick={() => setFilter("user")}
            >
              <User size={14} />
              マイテンプレート
            </button>
          </div>

          {error && <div className="form-error">{error}</div>}

          {loading ? (
            <div className="template-loading">
              <Loader2 size={24} className="animate-spin" />
              <span>読み込み中...</span>
            </div>
          ) : (
            <div className="template-list-container">
              {/* Template list */}
              <div className="template-list">
                {filteredTemplates.length === 0 ? (
                  <div className="template-empty">
                    {filter === "user"
                      ? "ユーザー作成のテンプレートはありません"
                      : "テンプレートがありません"}
                  </div>
                ) : (
                  filteredTemplates.map((template) => (
                    <div
                      key={template.id}
                      className={`template-item ${selectedId === template.id ? "selected" : ""}`}
                      onClick={() => setSelectedId(template.id)}
                    >
                      <div className="template-item-icon">
                        {template.is_system ? (
                          <Star size={16} />
                        ) : (
                          <User size={16} />
                        )}
                      </div>
                      <div className="template-item-content">
                        <div className="template-item-name">{template.name}</div>
                        <div className="template-item-description">
                          {template.description}
                        </div>
                      </div>
                      {!template.is_system && (
                        <button
                          className="btn btn-icon btn-sm template-delete-btn"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(template.id);
                          }}
                          disabled={deleting === template.id}
                          title="削除"
                        >
                          {deleting === template.id ? (
                            <Loader2 size={14} className="animate-spin" />
                          ) : (
                            <Trash2 size={14} />
                          )}
                        </button>
                      )}
                    </div>
                  ))
                )}
              </div>

              {/* Preview panel */}
              {selectedTemplate && (
                <div className="template-preview-panel">
                  <div className="template-preview-header">
                    <h3>{selectedTemplate.name}</h3>
                    <button
                      className={`btn btn-sm ${showPreview ? "btn-primary" : "btn-secondary"}`}
                      onClick={() => setShowPreview(!showPreview)}
                    >
                      {showPreview ? "Markdown" : "プレビュー"}
                    </button>
                  </div>
                  <div className="template-preview-content">
                    {showPreview ? (
                      <div className="template-preview-markdown">
                        {/* Simple preview - just show formatted text */}
                        <pre>{selectedTemplate.content || "(空白)"}</pre>
                      </div>
                    ) : (
                      <pre className="template-preview-raw">
                        {selectedTemplate.content || "(空白)"}
                      </pre>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <footer className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>
            キャンセル
          </button>
          <button
            className="btn btn-primary"
            onClick={handleSelect}
            disabled={!selectedId || loading}
          >
            このテンプレートを使用
          </button>
        </footer>
      </div>
    </div>
  );
}
