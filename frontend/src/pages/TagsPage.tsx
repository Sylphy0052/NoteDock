import { useQuery } from '@tanstack/react-query'
import { Link, useSearchParams } from 'react-router-dom'
import { Tag, Hash } from 'lucide-react'
import { getTags } from '../api/tags'
import { getNotes } from '../api/notes'
import { NoteCard } from '../components/notes'
import { Pagination } from '../components/common'

export default function TagsPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const selectedTag = searchParams.get('tag')
  const page = parseInt(searchParams.get('page') || '1', 10)
  const pageSize = 12

  // Fetch all tags
  const { data: tags, isLoading: tagsLoading } = useQuery({
    queryKey: ['tags'],
    queryFn: getTags,
  })

  // Fetch notes for selected tag
  const { data: notesData, isLoading: notesLoading } = useQuery({
    queryKey: ['notes', { tag: selectedTag, page, pageSize }],
    queryFn: () => getNotes({ tag: selectedTag!, page, page_size: pageSize }),
    enabled: !!selectedTag,
  })

  const handleTagClick = (tagName: string) => {
    const newParams = new URLSearchParams()
    newParams.set('tag', tagName)
    newParams.set('page', '1')
    setSearchParams(newParams)
  }

  const handlePageChange = (newPage: number) => {
    const newParams = new URLSearchParams(searchParams)
    newParams.set('page', newPage.toString())
    setSearchParams(newParams)
  }

  const handleClearTag = () => {
    setSearchParams({})
  }

  const notes = notesData?.items || []
  const total = notesData?.total || 0
  const totalPages = Math.ceil(total / pageSize)

  return (
    <div className="tags-page">
      <header className="page-header">
        <h1>
          <Tag size={24} />
          タグ
        </h1>
      </header>

      <div className="tags-layout">
        {/* Tag list sidebar */}
        <aside className="tags-sidebar">
          <h2>すべてのタグ</h2>
          {tagsLoading ? (
            <div className="loading-placeholder">
              <div className="spinner" />
            </div>
          ) : tags && tags.length > 0 ? (
            <ul className="tag-list">
              {tags.map((tag) => (
                <li key={tag.id}>
                  <button
                    className={`tag-item ${selectedTag === tag.name ? 'active' : ''}`}
                    onClick={() => handleTagClick(tag.name)}
                  >
                    <Hash size={14} />
                    <span>{tag.name}</span>
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="no-tags">タグがありません</p>
          )}
        </aside>

        {/* Notes content */}
        <main className="tags-content">
          {selectedTag ? (
            <>
              <div className="tags-content-header">
                <h2>
                  <Hash size={20} />
                  {selectedTag}
                </h2>
                <button className="btn btn-ghost btn-sm" onClick={handleClearTag}>
                  クリア
                </button>
              </div>

              {notesLoading ? (
                <div className="loading-placeholder">
                  <div className="spinner" />
                  <span>読み込み中...</span>
                </div>
              ) : notes.length > 0 ? (
                <>
                  <p className="notes-count">{total}件のノート</p>
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
                  <p>このタグのノートはありません</p>
                </div>
              )}
            </>
          ) : (
            <div className="tags-intro">
              <Tag size={48} />
              <h2>タグを選択してください</h2>
              <p>左のリストからタグを選択すると、関連するノートが表示されます</p>
            </div>
          )}
        </main>
      </div>
    </div>
  )
}
