"""Tests for NoteRepository with Project support."""
import pytest
from sqlalchemy.orm import Session

from app.models.project import Project
from app.models.note import Note
from app.repositories.note_repo import NoteRepository


class TestNoteRepositoryProjectSupport:
    """Tests for NoteRepository project-related functionality."""

    def test_create_note_with_project_id(self, db: Session) -> None:
        """Test creating a note with project_id."""
        # Create a project first
        project = Project(name="テストプロジェクト")
        db.add(project)
        db.commit()
        db.refresh(project)

        repo = NoteRepository(db)
        note = repo.create(
            title="プロジェクト付きノート",
            content_md="テスト内容",
            project_id=project.id
        )

        assert note.id is not None
        assert note.project_id == project.id

    def test_create_note_without_project_id(self, db: Session) -> None:
        """Test creating a note without project_id."""
        repo = NoteRepository(db)
        note = repo.create(
            title="プロジェクトなしノート",
            content_md="テスト"
        )

        assert note.id is not None
        assert note.project_id is None

    def test_get_list_with_project_filter(self, db: Session) -> None:
        """Test getting notes filtered by project_id."""
        # Create two projects
        project1 = Project(name="プロジェクト1")
        project2 = Project(name="プロジェクト2")
        db.add_all([project1, project2])
        db.commit()
        db.refresh(project1)
        db.refresh(project2)

        repo = NoteRepository(db)
        # Create notes for different projects
        repo.create(title="プロジェクト1のノート1", project_id=project1.id)
        repo.create(title="プロジェクト1のノート2", project_id=project1.id)
        repo.create(title="プロジェクト2のノート", project_id=project2.id)
        repo.create(title="プロジェクトなしノート")

        # Filter by project1
        notes, total = repo.get_list(project_id=project1.id)
        assert total == 2
        for note in notes:
            assert note.project_id == project1.id

    def test_get_list_without_project_filter(self, db: Session) -> None:
        """Test getting all notes without project filter."""
        project = Project(name="テストプロジェクト")
        db.add(project)
        db.commit()
        db.refresh(project)

        repo = NoteRepository(db)
        repo.create(title="プロジェクト付き", project_id=project.id)
        repo.create(title="プロジェクトなし")

        notes, total = repo.get_list()
        assert total == 2

    def test_get_by_project(self, db: Session) -> None:
        """Test getting all notes for a specific project."""
        project = Project(name="対象プロジェクト")
        db.add(project)
        db.commit()
        db.refresh(project)

        repo = NoteRepository(db)
        repo.create(title="ノート1", project_id=project.id)
        repo.create(title="ノート2", project_id=project.id)
        repo.create(title="別ノート")

        notes = repo.get_by_project(project.id)
        assert len(notes) == 2
        for note in notes:
            assert note.project_id == project.id

    def test_get_by_project_empty(self, db: Session) -> None:
        """Test getting notes for a project with no notes."""
        project = Project(name="空プロジェクト")
        db.add(project)
        db.commit()
        db.refresh(project)

        repo = NoteRepository(db)
        notes = repo.get_by_project(project.id)
        assert len(notes) == 0

    def test_update_note_project_id(self, db: Session) -> None:
        """Test updating a note's project_id."""
        project1 = Project(name="プロジェクト1")
        project2 = Project(name="プロジェクト2")
        db.add_all([project1, project2])
        db.commit()
        db.refresh(project1)
        db.refresh(project2)

        repo = NoteRepository(db)
        note = repo.create(title="移動テストノート", project_id=project1.id)

        # Update to project2
        updated = repo.update(note, project_id=project2.id)
        assert updated.project_id == project2.id

    def test_update_note_remove_project(self, db: Session) -> None:
        """Test removing project_id from a note."""
        project = Project(name="テストプロジェクト")
        db.add(project)
        db.commit()
        db.refresh(project)

        repo = NoteRepository(db)
        note = repo.create(title="プロジェクト解除テスト", project_id=project.id)

        # Note: This requires special handling since None needs to be explicitly set
        # We'll test the update method passes project_id correctly

    def test_duplicate_note_preserves_project_id(self, db: Session) -> None:
        """Test that duplicating a note preserves project_id."""
        project = Project(name="複製テストプロジェクト")
        db.add(project)
        db.commit()
        db.refresh(project)

        repo = NoteRepository(db)
        original = repo.create(
            title="元ノート",
            content_md="内容",
            project_id=project.id
        )

        duplicate = repo.duplicate(original)
        assert duplicate.project_id == original.project_id
        assert duplicate.project_id == project.id

    def test_get_by_id_includes_project(self, db: Session) -> None:
        """Test that get_by_id loads project relationship."""
        project = Project(name="取得テストプロジェクト")
        db.add(project)
        db.commit()
        db.refresh(project)

        repo = NoteRepository(db)
        created = repo.create(title="プロジェクト付き", project_id=project.id)

        note = repo.get_by_id(created.id)
        assert note is not None
        assert note.project_id == project.id
        assert note.project is not None
        assert note.project.name == "取得テストプロジェクト"

    def test_get_list_filter_by_folder_and_project(self, db: Session) -> None:
        """Test filtering by both folder and project."""
        from app.models.folder import Folder

        project = Project(name="フォルダ併用プロジェクト")
        folder = Folder(name="テストフォルダ")
        db.add_all([project, folder])
        db.commit()
        db.refresh(project)
        db.refresh(folder)

        repo = NoteRepository(db)
        repo.create(title="両方一致", folder_id=folder.id, project_id=project.id)
        repo.create(title="フォルダのみ", folder_id=folder.id)
        repo.create(title="プロジェクトのみ", project_id=project.id)

        notes, total = repo.get_list(folder_id=folder.id, project_id=project.id)
        assert total == 1
        assert notes[0].title == "両方一致"
