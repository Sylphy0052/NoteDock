import { useState } from "react";
import { X, FileText, Trash2, Star, User } from "lucide-react";
import {
  getAllTemplates,
  deleteUserTemplate,
  type Template,
} from "../../utils/templates";

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
  const [templates, setTemplates] = useState<Template[]>(() => getAllTemplates());
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [filter, setFilter] = useState<"all" | "system" | "user">("all");

  const filteredTemplates = templates.filter((t) => {
    if (filter === "all") return true;
    if (filter === "system") return t.isSystem;
    if (filter === "user") return !t.isSystem;
    return true;
  });

  const selectedTemplate = templates.find((t) => t.id === selectedId);

  const handleSelect = () => {
    if (selectedTemplate) {
      onSelect(selectedTemplate.content);
      onClose();
    }
  };

  const handleDelete = (templateId: string) => {
    if (confirm("このテンプレートを削除しますか？")) {
      deleteUserTemplate(templateId);
      setTemplates(getAllTemplates());
      if (selectedId === templateId) {
        setSelectedId(null);
      }
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
                      {template.isSystem ? (
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
                    {!template.isSystem && (
                      <button
                        className="btn btn-icon btn-sm template-delete-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(template.id);
                        }}
                        title="削除"
                      >
                        <Trash2 size={14} />
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
        </div>

        <footer className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>
            キャンセル
          </button>
          <button
            className="btn btn-primary"
            onClick={handleSelect}
            disabled={!selectedId}
          >
            このテンプレートを使用
          </button>
        </footer>
      </div>
    </div>
  );
}
