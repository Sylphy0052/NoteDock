"""Weekly report aggregation service.

Aggregates weekly reports from individual team members and creates
achievement notes per project.
"""

from dataclasses import dataclass, field
from datetime import timedelta
from typing import Dict, List, Optional, Tuple

from sqlalchemy.orm import Session

from app.core.logging import log_error, log_info, log_warning
from app.db.base import now_jst
from app.models import Folder, Note, Project
from app.repositories.folder_repo import FolderRepository
from app.repositories.note_repo import NoteRepository
from app.repositories.project_repo import ProjectRepository
from app.services.ask_service import AskServiceError, get_ask_service
from app.utils.weekly_report_parser import (
    ProjectSection,
    get_week_label_from_date,
    parse_weekly_report,
)


@dataclass
class AggregationResult:
    """Result of weekly report aggregation."""

    processed_notes: int = 0
    projects_updated: int = 0
    achievement_notes_created: int = 0
    errors: List[str] = field(default_factory=list)


class WeeklyReportService:
    """Service for aggregating weekly reports."""

    def __init__(self, db: Session):
        self.db = db
        self.folder_repo = FolderRepository(db)
        self.note_repo = NoteRepository(db)
        self.project_repo = ProjectRepository(db)

    def find_weekly_report_folder_ids(self) -> List[int]:
        """Find all folder IDs that belong to weekly report folders.

        Searches for root folders containing "週報" in their name
        and returns all descendant folder IDs.

        Returns:
            List of folder IDs belonging to weekly report folders.
        """
        root_folders = self.folder_repo.get_root_folders()
        folder_ids: List[int] = []

        for root in root_folders:
            if "週報" in root.name:
                descendant_ids = self.folder_repo.get_all_descendant_ids(root.id)
                folder_ids.extend(descendant_ids)

        return folder_ids

    def get_weekly_notes(
        self,
        folder_ids: List[int],
        days: int = 7,
    ) -> List[Note]:
        """Get notes created within the past N days from specified folders.

        Args:
            folder_ids: List of folder IDs to search in.
            days: Number of days to look back.

        Returns:
            List of notes created within the time window.
        """
        cutoff = now_jst() - timedelta(days=days)
        return self.note_repo.get_by_folder_ids_with_date_filter(
            folder_ids=folder_ids,
            created_after=cutoff,
        )

    def find_project(
        self,
        company_name: str,
        project_name: str,
    ) -> Optional[Project]:
        """Find a project by company and project name.

        First tries exact match with company name, then falls back to
        searching by project name only.

        Args:
            company_name: Company name from the weekly report.
            project_name: Project name from the weekly report.

        Returns:
            Project if found, None otherwise.
        """
        # Try exact match with company name
        project = self.project_repo.find_by_company_and_name(
            company_name, project_name
        )
        if project:
            return project

        # Fall back to project name only search
        projects = self.project_repo.search_by_name(project_name)
        if len(projects) == 1:
            return projects[0]

        return None

    def get_linked_note_contents(
        self,
        note_ids: List[int],
    ) -> Dict[int, str]:
        """Get content of linked notes.

        Args:
            note_ids: List of note IDs to fetch.

        Returns:
            Dictionary mapping note ID to formatted content.
        """
        contents: Dict[int, str] = {}
        for note_id in note_ids:
            try:
                note = self.note_repo.get_by_id(note_id)
                if note:
                    # Truncate long content
                    content = note.content_md[:1000]
                    if len(note.content_md) > 1000:
                        content += "..."
                    contents[note_id] = (
                        f"### 参照: #{note_id} {note.title}\n{content}"
                    )
            except Exception as e:
                log_warning(f"Failed to get linked note {note_id}: {e}")
        return contents

    def group_sections_by_project(
        self,
        all_sections: List[ProjectSection],
    ) -> Dict[int, List[ProjectSection]]:
        """Group project sections by project ID.

        Args:
            all_sections: List of all parsed project sections.

        Returns:
            Dictionary mapping project ID to list of sections.
        """
        grouped: Dict[int, List[ProjectSection]] = {}

        for section in all_sections:
            project = None

            # First, try direct project ID if available (e.g., @P1 format)
            if section.project_id is not None:
                project = self.project_repo.get_by_id(section.project_id)
                if not project:
                    log_warning(f"Project not found by ID: {section.project_id}")

            # Fall back to company/project name search
            if project is None and section.company_name and section.project_name:
                project = self.find_project(
                    section.company_name,
                    section.project_name,
                )
                if not project:
                    log_warning(
                        f"Project not found: {section.company_name}/{section.project_name}"
                    )

            if project:
                if project.id not in grouped:
                    grouped[project.id] = []
                grouped[project.id].append(section)

        return grouped

    def get_week_label(self) -> str:
        """Generate a label for the current week.

        Returns:
            String like "2025年1月第4週"
        """
        return get_week_label_from_date(now_jst())

    async def summarize_project(
        self,
        project: Project,
        sections: List[ProjectSection],
        linked_contents: Dict[int, str],
    ) -> str:
        """Summarize project sections using AI.

        Args:
            project: The project being summarized.
            sections: List of project sections to summarize.
            linked_contents: Dictionary of linked note contents.

        Returns:
            AI-generated summary text.
        """
        # Format sections with linked content
        formatted_sections = []
        for section in sections:
            author_label = section.author or "不明"
            content = f"### {author_label} の報告\n{section.content}"

            # Add linked note contents
            if section.note_links:
                for link_id in section.note_links:
                    if link_id in linked_contents:
                        content += f"\n\n{linked_contents[link_id]}"

            formatted_sections.append(content)

        combined = "\n\n---\n\n".join(formatted_sections)

        template = f"""あなたは週報を集約するアシスタントです。
以下は「{project.name}」プロジェクトに関する複数メンバーの週報です。

これらの内容を以下のMarkdown形式でまとめてください:

### 実施内容
- 主要な作業・成果を箇条書きで

### 進捗状況
- プロジェクト全体の進行状況

### 課題・メモ
- 共有事項や課題点（あれば）

注意:
- 各メンバーの貢献を適切に反映
- 具体的な内容を維持しつつ簡潔に
- 重複を避けて統合
- 「実施内容」「進捗状況」「課題・メモ」のみ出力（前後の挨拶不要）
"""

        try:
            ask_service = get_ask_service()
            response, _ = await ask_service.chat_simple(
                user_input=combined,
                template=template,
            )
            return response
        except AskServiceError as e:
            log_error(f"AI summarization failed for {project.name}: {e}")
            # Fallback: return combined content without AI processing
            return combined

    def get_or_create_achievement_note(
        self,
        project: Project,
    ) -> Tuple[Note, bool]:
        """Get or create an achievement note for a project.

        Args:
            project: The project to get/create achievement note for.

        Returns:
            Tuple of (note, is_new) where is_new is True if newly created.
        """
        title = f"{project.name} 週報実績"

        # Search for existing achievement note
        notes = self.project_repo.get_notes(project.id)
        for note in notes:
            if note.title == title:
                return note, False

        # Create new achievement note
        note = self.note_repo.create(
            title=title,
            content_md="# 週報実績\n\n",
            project_id=project.id,
            is_hidden_from_home=True,
        )
        return note, True

    def prepend_summary_to_note(
        self,
        note: Note,
        summary: str,
    ) -> Note:
        """Prepend weekly summary to achievement note.

        Adds the summary at the top (after the header), preserving
        existing content.

        Args:
            note: The achievement note to update.
            summary: The summary to prepend.

        Returns:
            Updated note.
        """
        header = "# 週報実績\n\n"
        week_label = self.get_week_label()

        existing = note.content_md
        if existing.startswith(header):
            existing = existing[len(header) :]

        new_entry = f"## {week_label}\n\n{summary}\n\n---\n\n"
        new_content = header + new_entry + existing

        return self.note_repo.update(note, content_md=new_content)

    async def run_aggregation(self) -> AggregationResult:
        """Run the weekly report aggregation process.

        Returns:
            AggregationResult with statistics about the run.
        """
        result = AggregationResult()

        # 1. Find weekly report folders
        folder_ids = self.find_weekly_report_folder_ids()
        if not folder_ids:
            log_warning("No weekly report folders found")
            return result

        log_info(f"Found {len(folder_ids)} weekly report folder(s)")

        # 2. Get notes from the past week
        notes = self.get_weekly_notes(folder_ids)
        if not notes:
            log_info("No weekly report notes found in the past 7 days")
            return result

        result.processed_notes = len(notes)
        log_info(f"Found {len(notes)} weekly report note(s)")

        # 3. Parse all notes into project sections
        all_sections: List[ProjectSection] = []
        all_link_ids: set = set()

        for note in notes:
            sections = parse_weekly_report(
                content=note.content_md,
                author=note.created_by,
                note_id=note.id,
            )
            all_sections.extend(sections)
            for section in sections:
                if section.note_links:
                    all_link_ids.update(section.note_links)

        log_info(f"Parsed {len(all_sections)} project section(s)")

        # 4. Get linked note contents
        linked_contents = self.get_linked_note_contents(list(all_link_ids))
        log_info(f"Retrieved {len(linked_contents)} linked note(s)")

        # 5. Group sections by project
        grouped = self.group_sections_by_project(all_sections)

        # 6. Process each project
        for project_id, sections in grouped.items():
            try:
                project = self.project_repo.get_by_id(project_id)
                if not project:
                    continue

                # Summarize with AI
                summary = await self.summarize_project(
                    project, sections, linked_contents
                )

                # Get or create achievement note
                note, is_new = self.get_or_create_achievement_note(project)
                if is_new:
                    result.achievement_notes_created += 1

                # Prepend summary
                self.prepend_summary_to_note(note, summary)
                result.projects_updated += 1

                log_info(f"Updated achievement note for project: {project.name}")

            except Exception as e:
                error_msg = f"Failed to process project {project_id}: {e}"
                log_error(error_msg)
                result.errors.append(error_msg)

        return result


async def run_weekly_report_job(db: Session) -> dict:
    """Entry point for the weekly report aggregation job.

    Args:
        db: Database session.

    Returns:
        Dictionary with job statistics.
    """
    service = WeeklyReportService(db)
    result = await service.run_aggregation()

    return {
        "processed_notes": result.processed_notes,
        "projects_updated": result.projects_updated,
        "achievement_notes_created": result.achievement_notes_created,
        "errors": result.errors,
    }
