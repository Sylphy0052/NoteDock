import { useState, useRef } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Download, Upload, FileArchive, AlertCircle, CheckCircle, X } from "lucide-react";
import { Modal } from "./Modal";
import { useToast } from "./Toast";
import { exportNotes, importNotes } from "../../api/importExport";
import type { ImportResult } from "../../api/types";

interface ImportExportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ImportExportModal({ isOpen, onClose }: ImportExportModalProps) {
  const [activeTab, setActiveTab] = useState<"export" | "import">("export");
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { showToast } = useToast();
  const queryClient = useQueryClient();

  // Export mutation
  const exportMutation = useMutation({
    mutationFn: exportNotes,
    onSuccess: (blob) => {
      // Create download link
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      const date = new Date().toISOString().split("T")[0];
      a.href = url;
      a.download = `notedock-export-${date}.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      showToast("エクスポートが完了しました", "success");
    },
    onError: () => {
      showToast("エクスポートに失敗しました", "error");
    },
  });

  // Import mutation
  const importMutation = useMutation({
    mutationFn: importNotes,
    onSuccess: (result) => {
      setImportResult(result);
      queryClient.invalidateQueries({ queryKey: ["notes"] });
      queryClient.invalidateQueries({ queryKey: ["folders"] });
      queryClient.invalidateQueries({ queryKey: ["tags"] });
      if (result.errors.length === 0) {
        showToast("インポートが完了しました", "success");
      } else {
        showToast("インポートが完了しました（一部エラーあり）", "warning");
      }
    },
    onError: () => {
      showToast("インポートに失敗しました", "error");
      setImporting(false);
    },
  });

  const handleExport = () => {
    exportMutation.mutate();
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith(".zip")) {
      showToast("ZIPファイルを選択してください", "error");
      return;
    }

    setImporting(true);
    setImportResult(null);
    importMutation.mutate(file);

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleClose = () => {
    setImportResult(null);
    setImporting(false);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="インポート / エクスポート"
      size="md"
    >
      <div className="import-export-modal">
        {/* Tabs */}
        <div className="ie-tabs">
          <button
            className={`ie-tab ${activeTab === "export" ? "active" : ""}`}
            onClick={() => setActiveTab("export")}
          >
            <Download size={16} />
            エクスポート
          </button>
          <button
            className={`ie-tab ${activeTab === "import" ? "active" : ""}`}
            onClick={() => setActiveTab("import")}
          >
            <Upload size={16} />
            インポート
          </button>
        </div>

        {/* Content */}
        <div className="ie-content">
          {activeTab === "export" ? (
            <div className="ie-export">
              <div className="ie-icon">
                <FileArchive size={48} />
              </div>
              <h3>ノートをエクスポート</h3>
              <p>
                すべてのノート、添付ファイル、フォルダ構造をZIPファイルとしてダウンロードします。
              </p>
              <ul className="ie-features">
                <li>Markdownファイル（frontmatter付き）</li>
                <li>添付ファイル</li>
                <li>フォルダ構造</li>
                <li>タグ情報</li>
              </ul>
              <button
                className="btn btn-primary btn-lg"
                onClick={handleExport}
                disabled={exportMutation.isPending}
              >
                {exportMutation.isPending ? (
                  <>
                    <div className="spinner" />
                    エクスポート中...
                  </>
                ) : (
                  <>
                    <Download size={18} />
                    ZIPをダウンロード
                  </>
                )}
              </button>
            </div>
          ) : (
            <div className="ie-import">
              {importResult ? (
                <div className="ie-result">
                  <div className="ie-result-icon">
                    {importResult.errors.length === 0 ? (
                      <CheckCircle size={48} className="success" />
                    ) : (
                      <AlertCircle size={48} className="warning" />
                    )}
                  </div>
                  <h3>インポート完了</h3>
                  <div className="ie-result-stats">
                    <div className="ie-stat">
                      <span className="ie-stat-value">{importResult.imported_notes}</span>
                      <span className="ie-stat-label">ノート</span>
                    </div>
                    <div className="ie-stat">
                      <span className="ie-stat-value">{importResult.imported_files}</span>
                      <span className="ie-stat-label">ファイル</span>
                    </div>
                  </div>
                  {importResult.errors.length > 0 && (
                    <div className="ie-errors">
                      <h4>エラー ({importResult.errors.length}件)</h4>
                      <ul>
                        {importResult.errors.slice(0, 5).map((error, i) => (
                          <li key={i}>{error}</li>
                        ))}
                        {importResult.errors.length > 5 && (
                          <li>...他 {importResult.errors.length - 5}件</li>
                        )}
                      </ul>
                    </div>
                  )}
                  <button
                    className="btn btn-secondary"
                    onClick={() => setImportResult(null)}
                  >
                    別のファイルをインポート
                  </button>
                </div>
              ) : (
                <>
                  <div className="ie-icon">
                    <Upload size={48} />
                  </div>
                  <h3>ノートをインポート</h3>
                  <p>
                    NoteDockからエクスポートしたZIPファイル、またはMarkdownファイルを含むZIPファイルをインポートします。
                  </p>
                  <ul className="ie-features">
                    <li>Markdownファイル（frontmatter対応）</li>
                    <li>添付ファイル（files/フォルダ）</li>
                    <li>フォルダ構造の復元</li>
                  </ul>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".zip"
                    onChange={handleFileChange}
                    style={{ display: "none" }}
                  />
                  <button
                    className="btn btn-primary btn-lg"
                    onClick={handleImportClick}
                    disabled={importing}
                  >
                    {importing ? (
                      <>
                        <div className="spinner" />
                        インポート中...
                      </>
                    ) : (
                      <>
                        <Upload size={18} />
                        ZIPファイルを選択
                      </>
                    )}
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}
