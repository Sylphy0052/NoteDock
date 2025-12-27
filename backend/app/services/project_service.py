"""Service for Project operations."""
from sqlalchemy.orm import Session
from typing import List, Optional, AsyncGenerator

from app.models.project import Project
from app.models.note import Note
from app.repositories.project_repo import ProjectRepository
from app.repositories.company_repo import CompanyRepository
from app.schemas.project import (
    ProjectCreate,
    ProjectUpdate,
    ProjectResponse,
    ProjectSummary,
)
from app.schemas.company import CompanyResponse
from app.schemas.ai import StreamEvent
from app.core.errors import NotFoundError
from app.services.ask_service import get_ask_service, AskServiceError


class ProjectService:
    """Service for project business logic."""

    def __init__(self, db: Session):
        self.db = db
        self.project_repo = ProjectRepository(db)
        self.company_repo = CompanyRepository(db)

    def create_project(self, data: ProjectCreate) -> Project:
        """Create a new project.

        Args:
            data: Project creation data.

        Returns:
            Created project.
        """
        return self.project_repo.create(
            name=data.name,
            company_id=data.company_id
        )

    def get_project(self, project_id: int) -> Project:
        """Get a project by ID.

        Args:
            project_id: Project ID.

        Returns:
            Project instance.

        Raises:
            NotFoundError: If project not found.
        """
        project = self.project_repo.get_by_id(project_id)
        if not project:
            raise NotFoundError("プロジェクト", project_id)
        return project

    def get_all_projects(self) -> List[Project]:
        """Get all projects ordered by name.

        Returns:
            List of projects.
        """
        return self.project_repo.get_all()

    def get_projects_by_company(self, company_id: int) -> List[Project]:
        """Get all projects for a company.

        Args:
            company_id: Company ID.

        Returns:
            List of projects for the company.
        """
        return self.project_repo.get_by_company(company_id)

    def update_project(self, project_id: int, data: ProjectUpdate) -> Project:
        """Update a project.

        Args:
            project_id: Project ID.
            data: Update data.

        Returns:
            Updated project.

        Raises:
            NotFoundError: If project not found.
        """
        project = self.get_project(project_id)
        update_data = data.model_dump(exclude_unset=True)
        return self.project_repo.update(project, **update_data)

    def delete_project(self, project_id: int) -> None:
        """Delete a project.

        Args:
            project_id: Project ID.

        Raises:
            NotFoundError: If project not found.
        """
        project = self.get_project(project_id)
        self.project_repo.delete(project)

    def search_projects(self, query: str) -> List[Project]:
        """Search projects by name.

        Args:
            query: Search query.

        Returns:
            List of matching projects.
        """
        return self.project_repo.search_by_name(query)

    def get_project_response(self, project_id: int) -> ProjectResponse:
        """Get project response with note count.

        Args:
            project_id: Project ID.

        Returns:
            ProjectResponse with note_count.

        Raises:
            NotFoundError: If project not found.
        """
        project = self.get_project(project_id)
        note_count = self.project_repo.get_note_count(project_id)

        company_response = None
        if project.company_id:
            company = self.company_repo.get_by_id(project.company_id)
            if company:
                company_project_count = self.company_repo.get_project_count(company.id)
                company_response = CompanyResponse(
                    id=company.id,
                    name=company.name,
                    created_at=company.created_at,
                    updated_at=company.updated_at,
                    project_count=company_project_count
                )

        return ProjectResponse(
            id=project.id,
            name=project.name,
            company_id=project.company_id,
            company=company_response,
            created_at=project.created_at,
            updated_at=project.updated_at,
            note_count=note_count
        )

    def get_all_projects_with_count(self) -> List[ProjectResponse]:
        """Get all projects with note counts.

        Returns:
            List of ProjectResponse with note_count.
        """
        projects = self.project_repo.get_all()
        result = []
        for project in projects:
            note_count = self.project_repo.get_note_count(project.id)

            company_response = None
            if project.company_id:
                company = self.company_repo.get_by_id(project.company_id)
                if company:
                    company_project_count = self.company_repo.get_project_count(
                        company.id
                    )
                    company_response = CompanyResponse(
                        id=company.id,
                        name=company.name,
                        created_at=company.created_at,
                        updated_at=company.updated_at,
                        project_count=company_project_count
                    )

            result.append(ProjectResponse(
                id=project.id,
                name=project.name,
                company_id=project.company_id,
                company=company_response,
                created_at=project.created_at,
                updated_at=project.updated_at,
                note_count=note_count
            ))
        return result

    def get_project_summary(self, project_id: int) -> ProjectSummary:
        """Get project summary for hover preview.

        Args:
            project_id: Project ID.

        Returns:
            ProjectSummary with basic project info.

        Raises:
            NotFoundError: If project not found.
        """
        project = self.get_project(project_id)

        company_name = None
        if project.company_id:
            company = self.company_repo.get_by_id(project.company_id)
            if company:
                company_name = company.name

        return ProjectSummary(
            id=project.id,
            name=project.name,
            company_name=company_name
        )

    def get_project_notes(self, project_id: int) -> List[Note]:
        """Get all notes for a project.

        Args:
            project_id: Project ID.

        Returns:
            List of notes for the project.

        Raises:
            NotFoundError: If project not found.
        """
        # Verify project exists
        self.get_project(project_id)
        return self.project_repo.get_notes(project_id)

    def build_ai_context(self, project_id: int, max_notes: int = 50) -> str:
        """Build AI context from project notes.

        Collects content from all notes in the project and formats
        it as context for the AI to use when answering questions.

        Args:
            project_id: Project ID.
            max_notes: Maximum number of notes to include (default 50).

        Returns:
            Formatted context string containing note contents.

        Raises:
            NotFoundError: If project not found.
        """
        project = self.get_project(project_id)
        notes = self.project_repo.get_notes(project_id)

        # Limit number of notes
        notes = notes[:max_notes]

        if not notes:
            return f"プロジェクト「{project.name}」にはまだノートがありません。"

        # Build context from notes
        context_parts = [
            f"以下は「{project.name}」プロジェクトのノート内容です。",
            f"ノート数: {len(notes)}件",
            "",
            "---",
            ""
        ]

        for note in notes:
            context_parts.append(f"## {note.title}")
            context_parts.append("")
            context_parts.append(note.content_md or "(内容なし)")
            context_parts.append("")
            context_parts.append("---")
            context_parts.append("")

        return "\n".join(context_parts)

    async def ask_project(
        self,
        project_id: int,
        question: str,
        chat_id: Optional[str] = None,
    ) -> AsyncGenerator[StreamEvent, None]:
        """Ask a question about the project using AI.

        Uses the project's notes as context for the AI to answer
        questions about the project.

        Args:
            project_id: Project ID.
            question: User's question.
            chat_id: Optional chat session ID.

        Yields:
            StreamEvent objects as they arrive from the AI.

        Raises:
            NotFoundError: If project not found.
            AskServiceError: If AI service is not available.
        """
        project = self.get_project(project_id)
        context = self.build_ai_context(project_id)

        # Build the prompt with context
        template = f"""あなたは「{project.name}」プロジェクトのナレッジアシスタントです。
以下のプロジェクト関連ノートの内容を基に、ユーザーの質問に回答してください。
回答は正確かつ簡潔に行い、ノートに記載されていない情報については推測であることを明示してください。

{context}"""

        ask_service = get_ask_service()

        async for event in ask_service.chat(
            user_input=question,
            chat_id=chat_id,
            template=template,
        ):
            yield event

    async def ask_project_simple(
        self,
        project_id: int,
        question: str,
        chat_id: Optional[str] = None,
    ) -> tuple[str, Optional[str]]:
        """Ask a question about the project and get the complete response.

        Convenience method that collects the streaming response.

        Args:
            project_id: Project ID.
            question: User's question.
            chat_id: Optional chat session ID.

        Returns:
            Tuple of (response_text, bot_message_id).

        Raises:
            NotFoundError: If project not found.
            AskServiceError: If AI service is not available.
        """
        full_message = ""
        bot_message_id = None

        async for event in self.ask_project(project_id, question, chat_id):
            if event.type == "add_message_token" and event.token:
                full_message += event.token
            elif event.type == "replace_message" and event.message:
                full_message = event.message
            elif event.type == "add_bot_message_id" and event.id:
                bot_message_id = event.id

        return full_message, bot_message_id
