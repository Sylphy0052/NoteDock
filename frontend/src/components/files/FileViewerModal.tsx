import { useState, useEffect } from "react";
import { X, Download, ZoomIn, ZoomOut, RotateCw, ChevronLeft, ChevronRight } from "lucide-react";
import { Modal } from "../common";
import { getFileDownloadUrl } from "../../api/files";

interface FileViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  file: {
    id: number;
    original_name: string;
    mime_type: string;
  } | null;
  files?: Array<{
    id: number;
    original_name: string;
    mime_type: string;
  }>;
}

export function FileViewerModal({
  isOpen,
  onClose,
  file,
  files = [],
}: FileViewerModalProps) {
  const [fileUrl, setFileUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [currentIndex, setCurrentIndex] = useState(0);

  const currentFile = files.length > 0 ? files[currentIndex] : file;

  useEffect(() => {
    if (isOpen && currentFile) {
      setLoading(true);
      getFileDownloadUrl(currentFile.id)
        .then((url) => {
          setFileUrl(url);
          setLoading(false);
        })
        .catch(() => {
          setFileUrl(null);
          setLoading(false);
        });

      // Reset view settings
      setZoom(1);
      setRotation(0);
    }
  }, [isOpen, currentFile]);

  useEffect(() => {
    if (file && files.length > 0) {
      const index = files.findIndex((f) => f.id === file.id);
      if (index !== -1) {
        setCurrentIndex(index);
      }
    }
  }, [file, files]);

  const handleDownload = async () => {
    if (!currentFile) return;
    const url = await getFileDownloadUrl(currentFile.id);
    const a = document.createElement("a");
    a.href = url;
    a.download = currentFile.original_name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleZoomIn = () => setZoom((z) => Math.min(z * 1.25, 4));
  const handleZoomOut = () => setZoom((z) => Math.max(z / 1.25, 0.25));
  const handleRotate = () => setRotation((r) => (r + 90) % 360);

  const handlePrev = () => {
    if (files.length > 1) {
      setCurrentIndex((i) => (i - 1 + files.length) % files.length);
    }
  };

  const handleNext = () => {
    if (files.length > 1) {
      setCurrentIndex((i) => (i + 1) % files.length);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    switch (e.key) {
      case "ArrowLeft":
        handlePrev();
        break;
      case "ArrowRight":
        handleNext();
        break;
      case "Escape":
        onClose();
        break;
      case "+":
      case "=":
        handleZoomIn();
        break;
      case "-":
        handleZoomOut();
        break;
    }
  };

  const renderContent = () => {
    if (loading) {
      return (
        <div className="viewer-loading">
          <div className="spinner" />
          <span>読み込み中...</span>
        </div>
      );
    }

    if (!currentFile || !fileUrl) {
      return (
        <div className="viewer-error">
          ファイルを読み込めませんでした
        </div>
      );
    }

    const mimeType = currentFile.mime_type;

    // Image viewer
    if (mimeType.startsWith("image/")) {
      return (
        <div className="viewer-image-container">
          <img
            src={fileUrl}
            alt={currentFile.original_name}
            style={{
              transform: `scale(${zoom}) rotate(${rotation}deg)`,
              transition: "transform 0.2s",
            }}
          />
        </div>
      );
    }

    // PDF viewer
    if (mimeType === "application/pdf") {
      return (
        <iframe
          src={`${fileUrl}#toolbar=0`}
          title={currentFile.original_name}
          className="viewer-pdf"
        />
      );
    }

    // Text viewer
    if (mimeType.startsWith("text/") || mimeType === "application/json") {
      return (
        <iframe
          src={fileUrl}
          title={currentFile.original_name}
          className="viewer-text"
        />
      );
    }

    // Unsupported file - download only
    return (
      <div className="viewer-unsupported">
        <p>このファイル形式はプレビューできません</p>
        <button className="btn btn-primary" onClick={handleDownload}>
          <Download size={16} />
          ダウンロード
        </button>
      </div>
    );
  };

  const isImage = currentFile?.mime_type.startsWith("image/");

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title=""
      size="full"
    >
      <div className="file-viewer" onKeyDown={handleKeyDown} tabIndex={0}>
        {/* Header */}
        <div className="viewer-header">
          <span className="viewer-filename">
            {currentFile?.original_name}
            {files.length > 1 && (
              <span className="viewer-count">
                {currentIndex + 1} / {files.length}
              </span>
            )}
          </span>
          <div className="viewer-actions">
            {isImage && (
              <>
                <button
                  className="btn btn-icon"
                  onClick={handleZoomOut}
                  title="縮小"
                >
                  <ZoomOut size={18} />
                </button>
                <span className="zoom-level">{Math.round(zoom * 100)}%</span>
                <button
                  className="btn btn-icon"
                  onClick={handleZoomIn}
                  title="拡大"
                >
                  <ZoomIn size={18} />
                </button>
                <button
                  className="btn btn-icon"
                  onClick={handleRotate}
                  title="回転"
                >
                  <RotateCw size={18} />
                </button>
              </>
            )}
            <button
              className="btn btn-icon"
              onClick={handleDownload}
              title="ダウンロード"
            >
              <Download size={18} />
            </button>
            <button
              className="btn btn-icon"
              onClick={onClose}
              title="閉じる"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="viewer-content">
          {files.length > 1 && (
            <button
              className="viewer-nav viewer-nav-prev"
              onClick={handlePrev}
            >
              <ChevronLeft size={32} />
            </button>
          )}

          {renderContent()}

          {files.length > 1 && (
            <button
              className="viewer-nav viewer-nav-next"
              onClick={handleNext}
            >
              <ChevronRight size={32} />
            </button>
          )}
        </div>
      </div>
    </Modal>
  );
}
