"""API endpoints for templates."""

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.services.template_service import TemplateService
from app.schemas.template import (
    TemplateCreate,
    TemplateUpdate,
    TemplateResponse,
    TemplateListResponse,
)
from app.schemas.common import MessageResponse


router = APIRouter()


def get_template_service(db: Session = Depends(get_db)) -> TemplateService:
    return TemplateService(db)


@router.get("/templates", response_model=TemplateListResponse)
def get_templates(
    service: TemplateService = Depends(get_template_service),
) -> TemplateListResponse:
    """テンプレート一覧を取得"""
    templates = service.get_all()
    return TemplateListResponse(
        items=[
            TemplateResponse(
                id=t.id,
                name=t.name,
                description=t.description,
                content=t.content,
                is_system=t.is_system,
                created_at=t.created_at,
                updated_at=t.updated_at,
            )
            for t in templates
        ],
        total=len(templates),
    )


@router.get("/templates/{template_id}", response_model=TemplateResponse)
def get_template(
    template_id: int,
    service: TemplateService = Depends(get_template_service),
) -> TemplateResponse:
    """テンプレートを取得"""
    template = service.get_by_id(template_id)
    return TemplateResponse(
        id=template.id,
        name=template.name,
        description=template.description,
        content=template.content,
        is_system=template.is_system,
        created_at=template.created_at,
        updated_at=template.updated_at,
    )


@router.post("/templates", response_model=TemplateResponse, status_code=201)
def create_template(
    data: TemplateCreate,
    service: TemplateService = Depends(get_template_service),
) -> TemplateResponse:
    """ユーザーテンプレートを作成"""
    template = service.create(data)
    return TemplateResponse(
        id=template.id,
        name=template.name,
        description=template.description,
        content=template.content,
        is_system=template.is_system,
        created_at=template.created_at,
        updated_at=template.updated_at,
    )


@router.put("/templates/{template_id}", response_model=TemplateResponse)
def update_template(
    template_id: int,
    data: TemplateUpdate,
    service: TemplateService = Depends(get_template_service),
) -> TemplateResponse:
    """テンプレートを更新"""
    template = service.update(template_id, data)
    return TemplateResponse(
        id=template.id,
        name=template.name,
        description=template.description,
        content=template.content,
        is_system=template.is_system,
        created_at=template.created_at,
        updated_at=template.updated_at,
    )


@router.delete("/templates/{template_id}", response_model=MessageResponse)
def delete_template(
    template_id: int,
    service: TemplateService = Depends(get_template_service),
) -> MessageResponse:
    """テンプレートを削除"""
    service.delete(template_id)
    return MessageResponse(message="テンプレートを削除しました")
