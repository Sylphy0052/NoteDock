"""Activity Log Service for recording operations."""

from typing import Optional

from sqlalchemy.orm import Session

from app.models.activity_log import ActivityLog, EventType


class ActivityLogService:
    """Service for recording activity logs."""

    def __init__(self, db: Session):
        self.db = db

    def log(
        self,
        event_type: str,
        note_id: Optional[int] = None,
        file_id: Optional[int] = None,
        comment_id: Optional[int] = None,
        display_name: Optional[str] = None,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None,
    ) -> ActivityLog:
        """
        Record an activity log entry.

        Args:
            event_type: Type of event (use EventType constants)
            note_id: Related note ID (optional)
            file_id: Related file ID (optional)
            comment_id: Related comment ID (optional)
            display_name: User's display name (optional)
            ip_address: Client IP address (optional)
            user_agent: Client user agent (optional)

        Returns:
            Created ActivityLog instance
        """
        log_entry = ActivityLog(
            event_type=event_type,
            note_id=note_id,
            file_id=file_id,
            comment_id=comment_id,
            display_name=display_name,
            ip_address=ip_address,
            user_agent=user_agent,
        )
        self.db.add(log_entry)
        self.db.commit()
        self.db.refresh(log_entry)
        return log_entry

    # Convenience methods for common events

    def log_note_created(
        self,
        note_id: int,
        display_name: Optional[str] = None,
        ip_address: Optional[str] = None,
    ) -> ActivityLog:
        """Log note creation."""
        return self.log(
            event_type=EventType.NOTE_CREATED,
            note_id=note_id,
            display_name=display_name,
            ip_address=ip_address,
        )

    def log_note_updated(
        self,
        note_id: int,
        display_name: Optional[str] = None,
        ip_address: Optional[str] = None,
    ) -> ActivityLog:
        """Log note update."""
        return self.log(
            event_type=EventType.NOTE_UPDATED,
            note_id=note_id,
            display_name=display_name,
            ip_address=ip_address,
        )

    def log_note_deleted(
        self,
        note_id: int,
        display_name: Optional[str] = None,
        ip_address: Optional[str] = None,
    ) -> ActivityLog:
        """Log note deletion (soft delete)."""
        return self.log(
            event_type=EventType.NOTE_DELETED,
            note_id=note_id,
            display_name=display_name,
            ip_address=ip_address,
        )

    def log_note_restored(
        self,
        note_id: int,
        display_name: Optional[str] = None,
        ip_address: Optional[str] = None,
    ) -> ActivityLog:
        """Log note restoration from trash."""
        return self.log(
            event_type=EventType.NOTE_RESTORED,
            note_id=note_id,
            display_name=display_name,
            ip_address=ip_address,
        )

    def log_note_duplicated(
        self,
        note_id: int,
        display_name: Optional[str] = None,
        ip_address: Optional[str] = None,
    ) -> ActivityLog:
        """Log note duplication."""
        return self.log(
            event_type=EventType.NOTE_DUPLICATED,
            note_id=note_id,
            display_name=display_name,
            ip_address=ip_address,
        )

    def log_version_restored(
        self,
        note_id: int,
        display_name: Optional[str] = None,
        ip_address: Optional[str] = None,
    ) -> ActivityLog:
        """Log version restoration."""
        return self.log(
            event_type=EventType.VERSION_RESTORED,
            note_id=note_id,
            display_name=display_name,
            ip_address=ip_address,
        )

    def log_file_uploaded(
        self,
        file_id: int,
        note_id: Optional[int] = None,
        display_name: Optional[str] = None,
        ip_address: Optional[str] = None,
    ) -> ActivityLog:
        """Log file upload."""
        return self.log(
            event_type=EventType.FILE_UPLOADED,
            file_id=file_id,
            note_id=note_id,
            display_name=display_name,
            ip_address=ip_address,
        )

    def log_file_deleted(
        self,
        file_id: int,
        note_id: Optional[int] = None,
        display_name: Optional[str] = None,
        ip_address: Optional[str] = None,
    ) -> ActivityLog:
        """Log file deletion."""
        return self.log(
            event_type=EventType.FILE_DELETED,
            file_id=file_id,
            note_id=note_id,
            display_name=display_name,
            ip_address=ip_address,
        )

    def log_comment_created(
        self,
        comment_id: int,
        note_id: int,
        display_name: Optional[str] = None,
        ip_address: Optional[str] = None,
    ) -> ActivityLog:
        """Log comment creation."""
        return self.log(
            event_type=EventType.COMMENT_CREATED,
            comment_id=comment_id,
            note_id=note_id,
            display_name=display_name,
            ip_address=ip_address,
        )

    def log_comment_updated(
        self,
        comment_id: int,
        note_id: int,
        display_name: Optional[str] = None,
        ip_address: Optional[str] = None,
    ) -> ActivityLog:
        """Log comment update."""
        return self.log(
            event_type=EventType.COMMENT_UPDATED,
            comment_id=comment_id,
            note_id=note_id,
            display_name=display_name,
            ip_address=ip_address,
        )

    def log_comment_deleted(
        self,
        comment_id: int,
        note_id: int,
        display_name: Optional[str] = None,
        ip_address: Optional[str] = None,
    ) -> ActivityLog:
        """Log comment deletion."""
        return self.log(
            event_type=EventType.COMMENT_DELETED,
            comment_id=comment_id,
            note_id=note_id,
            display_name=display_name,
            ip_address=ip_address,
        )
