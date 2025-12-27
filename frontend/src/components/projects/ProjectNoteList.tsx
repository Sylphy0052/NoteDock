import { FileText, Plus } from 'lucide-react'
import { useProjectNotes } from '../../hooks'
import type { Project } from '../../api/types'
import NoteCard from '../notes/NoteCard'

interface ProjectNoteListProps {
  project: Project
  onCreateNote?: () => void
}

export function ProjectNoteList({ project, onCreateNote }: ProjectNoteListProps) {
  const { data, isLoading, error } = useProjectNotes(project.id)

  if (isLoading) {
    return (
      <div className="project-note-list loading">
        <div className="loading-spinner">読み込み中...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="project-note-list error">
        <p>ノートの読み込みに失敗しました</p>
      </div>
    )
  }

  const notes = data?.items ?? []

  return (
    <div className="project-note-list">
      <div className="project-note-list-header">
        <h3>
          <FileText size={18} />
          関連ノート
          <span className="note-count">({data?.total ?? 0})</span>
        </h3>
        <button className="btn btn-primary btn-sm" onClick={onCreateNote}>
          <Plus size={16} />
          ノートを作成
        </button>
      </div>

      {notes.length === 0 ? (
        <div className="project-note-list-empty">
          <p>このプロジェクトにはノートがありません</p>
          <button className="btn btn-primary" onClick={onCreateNote}>
            <Plus size={16} />
            最初のノートを作成
          </button>
        </div>
      ) : (
        <div className="project-note-grid">
          {notes.map((note) => (
            <NoteCard key={note.id} note={note} />
          ))}
        </div>
      )}
    </div>
  )
}
