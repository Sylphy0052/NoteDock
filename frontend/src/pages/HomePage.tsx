import { useQuery } from '@tanstack/react-query'
import { Pin, Clock, RefreshCw, Plus, FilePlus } from 'lucide-react'
import { Link } from 'react-router-dom'
import { getNotes } from '../api/notes'
import { NoteCard } from '../components/notes'
import { NoteListSkeleton } from '../components/common/Skeleton'
import { useStaggeredAnimation } from '../hooks/useStaggeredAnimation'
import type { NoteSummary } from '../api/types'

interface NoteSectionProps {
  title: string
  icon: React.ReactNode
  notes: NoteSummary[]
  isLoading: boolean
  emptyMessage: string
}

function NoteSection({ title, icon, notes, isLoading, emptyMessage }: NoteSectionProps) {
  const { className: animationClass } = useStaggeredAnimation(notes.length)

  return (
    <section className="home-section">
      <div className="section-header">
        <h2 className="section-title">
          {icon}
          {title}
        </h2>
        <Link to="/notes" className="section-link">
          すべて表示
        </Link>
      </div>
      <div className="section-content">
        {isLoading ? (
          <NoteListSkeleton count={3} />
        ) : notes.length > 0 ? (
          <div className="note-grid">
            {notes.map((note) => (
              <NoteCard key={note.id} note={note} className={animationClass} />
            ))}
          </div>
        ) : (
          <div className="empty-state">
            <p>{emptyMessage}</p>
          </div>
        )}
      </div>
    </section>
  )
}

export default function HomePage() {
  // Fetch pinned notes (excluding hidden from home)
  const { data: pinnedData, isLoading: pinnedLoading } = useQuery({
    queryKey: ['notes', 'pinned'],
    queryFn: () => getNotes({ is_pinned: true, is_hidden_from_home: false, page_size: 6 }),
  })

  // Fetch recently updated notes (excluding hidden from home)
  const { data: recentData, isLoading: recentLoading } = useQuery({
    queryKey: ['notes', 'recent'],
    queryFn: () => getNotes({ page_size: 6, sort_by_pinned: false, is_hidden_from_home: false }),
  })

  // Fetch recently created notes (excluding hidden from home)
  const { data: createdData, isLoading: createdLoading } = useQuery({
    queryKey: ['notes', 'created'],
    queryFn: () =>
      getNotes({ page_size: 6, sort_by_pinned: false, sort_by: 'created_at', is_hidden_from_home: false }),
  })

  const pinnedNotes = pinnedData?.items || []
  const recentNotes = recentData?.items || []
  const createdNotes = createdData?.items || []

  return (
    <div className="home-page">
      <div className="home-header">
        <h1>ホーム</h1>
        <Link to="/notes/new" className="btn btn-primary">
          <Plus size={18} />
          新規ノート
        </Link>
      </div>

      <NoteSection
        title="ピン留め"
        icon={<Pin size={20} />}
        notes={pinnedNotes}
        isLoading={pinnedLoading}
        emptyMessage="ピン留めされたノートはありません"
      />

      <NoteSection
        title="最近作成"
        icon={<FilePlus size={20} />}
        notes={createdNotes}
        isLoading={createdLoading}
        emptyMessage="ノートがありません"
      />

      <NoteSection
        title="最近更新"
        icon={<Clock size={20} />}
        notes={recentNotes}
        isLoading={recentLoading}
        emptyMessage="ノートがありません"
      />

      <section className="home-section">
        <div className="section-header">
          <h2 className="section-title">
            <RefreshCw size={20} />
            クイックアクション
          </h2>
        </div>
        <div className="quick-actions">
          <Link to="/notes/new" className="quick-action-card">
            <Plus size={24} />
            <span>新規ノート作成</span>
          </Link>
          <Link to="/notes" className="quick-action-card">
            <Clock size={24} />
            <span>ノート一覧</span>
          </Link>
          <Link to="/linkmap" className="quick-action-card">
            <RefreshCw size={24} />
            <span>リンクマップ</span>
          </Link>
          <Link to="/trash" className="quick-action-card">
            <RefreshCw size={24} />
            <span>ゴミ箱</span>
          </Link>
        </div>
      </section>
    </div>
  )
}
