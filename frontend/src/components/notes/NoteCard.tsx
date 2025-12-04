import { Link } from "react-router-dom";
import { Pin, Lock, Tag } from "lucide-react";
import type { NoteSummary } from "../../api/types";
import clsx from "clsx";

interface NoteCardProps {
  note: NoteSummary;
  className?: string;
}

export default function NoteCard({ note, className }: NoteCardProps) {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("ja-JP", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <Link to={`/notes/${note.id}`} className={clsx("note-card", className)}>
      {note.cover_file_url && (
        <div className="note-card-cover">
          <img src={note.cover_file_url} alt="" />
        </div>
      )}

      <div className="note-card-content">
        <div className="note-card-header">
          <h3 className="note-card-title">{note.title}</h3>
          <div className="note-card-badges">
            {note.is_pinned && (
              <span className="badge badge-pin" title="ピン留め">
                <Pin size={14} />
              </span>
            )}
            {note.is_readonly && (
              <span className="badge badge-readonly" title="閲覧専用">
                <Lock size={14} />
              </span>
            )}
          </div>
        </div>

        {note.tags.length > 0 && (
          <div className="note-card-tags">
            <Tag size={12} />
            {note.tags.slice(0, 3).map((tag) => (
              <span key={tag.id} className="tag">
                {tag.name}
              </span>
            ))}
            {note.tags.length > 3 && (
              <span className="tag-more">+{note.tags.length - 3}</span>
            )}
          </div>
        )}

        <div className="note-card-footer">
          <span className="note-card-date">{formatDate(note.updated_at)}</span>
        </div>
      </div>
    </Link>
  );
}
