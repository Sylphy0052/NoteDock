import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useSearchParams, Link } from "react-router-dom";
import { Plus, Search, Filter, X } from "lucide-react";
import { getNotes } from "../api/notes";
import { getTags } from "../api/tags";
import { getFolders } from "../api/folders";
import { NoteCard } from "../components/notes";
import { Pagination, TextInput } from "../components/common";

export default function NotesListPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchQuery, setSearchQuery] = useState(searchParams.get("q") || "");
  const [showFilters, setShowFilters] = useState(false);

  const page = parseInt(searchParams.get("page") || "1", 10);
  const pageSize = 12;
  const tagFilter = searchParams.get("tag") || undefined;
  const folderFilter = searchParams.get("folder_id")
    ? parseInt(searchParams.get("folder_id")!, 10)
    : undefined;
  const query = searchParams.get("q") || undefined;

  // Fetch notes
  const { data, isLoading } = useQuery({
    queryKey: ["notes", { page, pageSize, query, tagFilter, folderFilter }],
    queryFn: () =>
      getNotes({
        page,
        page_size: pageSize,
        q: query,
        tag: tagFilter,
        folder_id: folderFilter,
      }),
  });

  // Fetch tags for filter
  const { data: tags } = useQuery({
    queryKey: ["tags"],
    queryFn: getTags,
  });

  // Fetch folders for filter
  const { data: folders } = useQuery({
    queryKey: ["folders"],
    queryFn: getFolders,
  });

  const notes = data?.items || [];
  const total = data?.total || 0;
  const totalPages = Math.ceil(total / pageSize);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const newParams = new URLSearchParams(searchParams);
    if (searchQuery) {
      newParams.set("q", searchQuery);
    } else {
      newParams.delete("q");
    }
    newParams.set("page", "1");
    setSearchParams(newParams);
  };

  const handleTagFilter = (tagName: string | null) => {
    const newParams = new URLSearchParams(searchParams);
    if (tagName) {
      newParams.set("tag", tagName);
    } else {
      newParams.delete("tag");
    }
    newParams.set("page", "1");
    setSearchParams(newParams);
  };

  const handleFolderFilter = (folderId: number | null) => {
    const newParams = new URLSearchParams(searchParams);
    if (folderId) {
      newParams.set("folder_id", folderId.toString());
    } else {
      newParams.delete("folder_id");
    }
    newParams.set("page", "1");
    setSearchParams(newParams);
  };

  const handlePageChange = (newPage: number) => {
    const newParams = new URLSearchParams(searchParams);
    newParams.set("page", newPage.toString());
    setSearchParams(newParams);
  };

  const clearFilters = () => {
    setSearchQuery("");
    setSearchParams({});
  };

  const hasActiveFilters = query || tagFilter || folderFilter;

  return (
    <div className="notes-list-page">
      <div className="page-header">
        <h1>ノート一覧</h1>
        <Link to="/notes/new" className="btn btn-primary">
          <Plus size={18} />
          新規ノート
        </Link>
      </div>

      <div className="notes-toolbar">
        <form onSubmit={handleSearch} className="search-form">
          <TextInput
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="ノートを検索..."
            leftIcon={<Search size={18} />}
          />
          <button type="submit" className="btn btn-secondary">
            検索
          </button>
        </form>
        <button
          className={`btn btn-icon ${showFilters ? "active" : ""}`}
          onClick={() => setShowFilters(!showFilters)}
        >
          <Filter size={18} />
        </button>
      </div>

      {showFilters && (
        <div className="filters-panel">
          <div className="filter-group">
            <label>タグ</label>
            <select
              value={tagFilter || ""}
              onChange={(e) => handleTagFilter(e.target.value || null)}
            >
              <option value="">すべてのタグ</option>
              {tags?.map((tag) => (
                <option key={tag.id} value={tag.name}>
                  {tag.name}
                </option>
              ))}
            </select>
          </div>
          <div className="filter-group">
            <label>フォルダ</label>
            <select
              value={folderFilter || ""}
              onChange={(e) =>
                handleFolderFilter(e.target.value ? parseInt(e.target.value, 10) : null)
              }
            >
              <option value="">すべてのフォルダ</option>
              {folders?.map((folder) => (
                <option key={folder.id} value={folder.id}>
                  {folder.name}
                </option>
              ))}
            </select>
          </div>
          {hasActiveFilters && (
            <button className="btn btn-text" onClick={clearFilters}>
              <X size={16} />
              フィルターをクリア
            </button>
          )}
        </div>
      )}

      {hasActiveFilters && (
        <div className="active-filters">
          {query && (
            <span className="filter-tag">
              検索: {query}
              <button onClick={() => {
                setSearchQuery("");
                const newParams = new URLSearchParams(searchParams);
                newParams.delete("q");
                setSearchParams(newParams);
              }}>
                <X size={14} />
              </button>
            </span>
          )}
          {tagFilter && (
            <span className="filter-tag">
              タグ: {tagFilter}
              <button onClick={() => handleTagFilter(null)}>
                <X size={14} />
              </button>
            </span>
          )}
          {folderFilter && (
            <span className="filter-tag">
              フォルダ: {folders?.find((f) => f.id === folderFilter)?.name}
              <button onClick={() => handleFolderFilter(null)}>
                <X size={14} />
              </button>
            </span>
          )}
        </div>
      )}

      <div className="notes-content">
        {isLoading ? (
          <div className="loading-placeholder">
            <div className="spinner" />
            <span>読み込み中...</span>
          </div>
        ) : notes.length > 0 ? (
          <>
            <div className="notes-info">
              <span>{total}件のノート</span>
            </div>
            <div className="note-grid">
              {notes.map((note) => (
                <NoteCard key={note.id} note={note} />
              ))}
            </div>
            {totalPages > 1 && (
              <Pagination
                currentPage={page}
                totalPages={totalPages}
                onPageChange={handlePageChange}
              />
            )}
          </>
        ) : (
          <div className="empty-state">
            <p>
              {hasActiveFilters
                ? "条件に一致するノートが見つかりませんでした"
                : "ノートがありません"}
            </p>
            {!hasActiveFilters && (
              <Link to="/notes/new" className="btn btn-primary">
                最初のノートを作成
              </Link>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
