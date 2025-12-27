"""Project API endpoints."""
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from typing import List, Optional

from app.db.session import get_db
from app.services.project_service import ProjectService
from app.schemas.project import (
    ProjectCreate,
    ProjectUpdate,
    ProjectResponse,
    ProjectSummary,
)
from app.schemas.common import MessageResponse

router = APIRouter()


def get_project_service(db: Session = Depends(get_db)) -> ProjectService:
    """Dependency to get ProjectService instance."""
    return ProjectService(db)


@router.get("/projects", response_model=List[ProjectResponse])
def get_projects(
    company_id: Optional[int] = Query(None, description="Filter by company ID"),
    service: ProjectService = Depends(get_project_service)
) -> List[ProjectResponse]:
    """Get all projects, optionally filtered by company.

    Args:
        company_id: Optional company ID to filter by.
        service: Project service instance.

    Returns:
        List of projects with note counts.
    """
    if company_id is not None:
        projects = service.get_projects_by_company(company_id)
        result = []
        for project in projects:
            result.append(service.get_project_response(project.id))
        return result
    return service.get_all_projects_with_count()


@router.post("/projects", response_model=ProjectResponse, status_code=201)
def create_project(
    data: ProjectCreate,
    service: ProjectService = Depends(get_project_service)
) -> ProjectResponse:
    """Create a new project.

    Args:
        data: Project creation data.
        service: Project service instance.

    Returns:
        Created project with note count.
    """
    project = service.create_project(data)
    return service.get_project_response(project.id)


@router.get("/projects/search", response_model=List[ProjectResponse])
def search_projects(
    q: str = Query(..., min_length=1, description="Search query"),
    service: ProjectService = Depends(get_project_service)
) -> List[ProjectResponse]:
    """Search projects by name.

    Args:
        q: Search query string.
        service: Project service instance.

    Returns:
        List of matching projects.
    """
    projects = service.search_projects(q)
    result = []
    for project in projects:
        result.append(service.get_project_response(project.id))
    return result


@router.get("/projects/{project_id}", response_model=ProjectResponse)
def get_project(
    project_id: int,
    service: ProjectService = Depends(get_project_service)
) -> ProjectResponse:
    """Get a project by ID.

    Args:
        project_id: Project ID.
        service: Project service instance.

    Returns:
        Project with note count.
    """
    return service.get_project_response(project_id)


@router.get("/projects/{project_id}/summary", response_model=ProjectSummary)
def get_project_summary(
    project_id: int,
    service: ProjectService = Depends(get_project_service)
) -> ProjectSummary:
    """Get project summary for hover preview.

    Args:
        project_id: Project ID.
        service: Project service instance.

    Returns:
        Project summary with basic info.
    """
    return service.get_project_summary(project_id)


@router.put("/projects/{project_id}", response_model=ProjectResponse)
def update_project(
    project_id: int,
    data: ProjectUpdate,
    service: ProjectService = Depends(get_project_service)
) -> ProjectResponse:
    """Update a project.

    Args:
        project_id: Project ID.
        data: Update data.
        service: Project service instance.

    Returns:
        Updated project with note count.
    """
    service.update_project(project_id, data)
    return service.get_project_response(project_id)


@router.delete("/projects/{project_id}", response_model=MessageResponse)
def delete_project(
    project_id: int,
    service: ProjectService = Depends(get_project_service)
) -> MessageResponse:
    """Delete a project.

    Args:
        project_id: Project ID.
        service: Project service instance.

    Returns:
        Success message.
    """
    service.delete_project(project_id)
    return MessageResponse(message="プロジェクトを削除しました")
