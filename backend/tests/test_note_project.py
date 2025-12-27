"""Tests for Note-Project relationship."""
import pytest
from sqlalchemy.orm import Session

from app.models.company import Company
from app.models.project import Project
from app.models.note import Note


class TestNoteProjectRelationship:
    """Tests for Note and Project relationship."""

    def test_create_note_without_project(self, db: Session) -> None:
        """Test creating a note without a project (backward compatibility)."""
        note = Note(title="プロジェクトなしノート", content_md="テスト内容")
        db.add(note)
        db.commit()
        db.refresh(note)

        assert note.id is not None
        assert note.title == "プロジェクトなしノート"
        assert note.project_id is None
        assert note.project is None

    def test_create_note_with_project(self, db: Session) -> None:
        """Test creating a note with a project."""
        project = Project(name="テストプロジェクト")
        db.add(project)
        db.commit()

        note = Note(
            title="プロジェクト付きノート",
            content_md="テスト内容",
            project_id=project.id
        )
        db.add(note)
        db.commit()
        db.refresh(note)

        assert note.id is not None
        assert note.project_id == project.id
        assert note.project is not None
        assert note.project.name == "テストプロジェクト"

    def test_project_notes_relationship(self, db: Session) -> None:
        """Test that project.notes contains related notes."""
        project = Project(name="ノートリレーションテスト")
        db.add(project)
        db.commit()

        note1 = Note(title="ノート1", content_md="内容1", project_id=project.id)
        note2 = Note(title="ノート2", content_md="内容2", project_id=project.id)
        db.add_all([note1, note2])
        db.commit()
        db.refresh(project)

        assert len(project.notes) == 2
        assert note1 in project.notes
        assert note2 in project.notes

    def test_delete_project_sets_note_project_null(self, db: Session) -> None:
        """Test that deleting a project sets note.project_id to NULL."""
        project = Project(name="削除テストプロジェクト")
        db.add(project)
        db.commit()

        note = Note(
            title="削除テストノート",
            content_md="内容",
            project_id=project.id
        )
        db.add(note)
        db.commit()
        note_id = note.id

        # Delete project
        db.delete(project)
        db.commit()

        # Refresh note
        db.expire_all()
        note = db.get(Note, note_id)
        assert note is not None
        assert note.project_id is None

    def test_note_with_folder_and_project(self, db: Session) -> None:
        """Test that note can have both folder and project (coexistence)."""
        from app.models.folder import Folder

        folder = Folder(name="テストフォルダ")
        project = Project(name="テストプロジェクト")
        db.add_all([folder, project])
        db.commit()

        note = Note(
            title="フォルダとプロジェクト両方",
            content_md="テスト内容",
            folder_id=folder.id,
            project_id=project.id
        )
        db.add(note)
        db.commit()
        db.refresh(note)

        assert note.folder_id == folder.id
        assert note.project_id == project.id
        assert note.folder.name == "テストフォルダ"
        assert note.project.name == "テストプロジェクト"
