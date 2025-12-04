import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useSearchParams } from "react-router-dom";
import { Folder, FolderOpen, ChevronRight, ChevronDown } from "lucide-react";
import { getFolders } from "../../api/folders";
import type { Folder as FolderType } from "../../api/types";

interface FolderItemProps {
  folder: FolderType;
  level: number;
  selectedFolderId: number | null;
  onSelect: (folderId: number) => void;
}

function FolderItem({ folder, level, selectedFolderId, onSelect }: FolderItemProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const hasChildren = folder.children && folder.children.length > 0;
  const isSelected = selectedFolderId === folder.id;

  const toggleExpand = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsExpanded(!isExpanded);
  };

  return (
    <li className="folder-tree-item">
      <button
        className={`folder-tree-button ${isSelected ? "active" : ""}`}
        style={{ paddingLeft: `${level * 16 + 8}px` }}
        onClick={() => onSelect(folder.id)}
      >
        {hasChildren && (
          <span className="folder-expand" onClick={toggleExpand}>
            {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          </span>
        )}
        {!hasChildren && <span className="folder-expand-placeholder" />}
        {isExpanded || isSelected ? (
          <FolderOpen size={16} />
        ) : (
          <Folder size={16} />
        )}
        <span className="folder-name">{folder.name}</span>
      </button>
      {hasChildren && isExpanded && (
        <ul className="folder-tree-children">
          {folder.children!.map((child) => (
            <FolderItem
              key={child.id}
              folder={child}
              level={level + 1}
              selectedFolderId={selectedFolderId}
              onSelect={onSelect}
            />
          ))}
        </ul>
      )}
    </li>
  );
}

interface FolderTreeProps {
  onFolderSelect?: (folderId: number | null) => void;
}

export function FolderTree({ onFolderSelect }: FolderTreeProps) {
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedFolderId = searchParams.get("folder_id")
    ? parseInt(searchParams.get("folder_id")!, 10)
    : null;

  const { data: folders, isLoading } = useQuery({
    queryKey: ["folders"],
    queryFn: getFolders,
  });

  const handleSelect = (folderId: number) => {
    const newParams = new URLSearchParams(searchParams);
    if (selectedFolderId === folderId) {
      newParams.delete("folder_id");
      onFolderSelect?.(null);
    } else {
      newParams.set("folder_id", folderId.toString());
      onFolderSelect?.(folderId);
    }
    newParams.set("page", "1");
    setSearchParams(newParams);
  };

  if (isLoading) {
    return (
      <div className="folder-tree-loading">
        <div className="spinner" />
      </div>
    );
  }

  if (!folders || folders.length === 0) {
    return (
      <div className="folder-tree-empty">
        <Folder size={20} />
        <span>フォルダなし</span>
      </div>
    );
  }

  // Build tree structure (only show root level, children are nested)
  const rootFolders = folders.filter((f) => f.parent_id === null);

  return (
    <nav className="folder-tree">
      <ul className="folder-tree-list">
        {rootFolders.map((folder) => (
          <FolderItem
            key={folder.id}
            folder={folder}
            level={0}
            selectedFolderId={selectedFolderId}
            onSelect={handleSelect}
          />
        ))}
      </ul>
    </nav>
  );
}
