"""Company API endpoints."""
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from typing import List

from app.db.session import get_db
from app.services.company_service import CompanyService
from app.schemas.company import (
    CompanyCreate,
    CompanyUpdate,
    CompanyResponse,
)
from app.schemas.common import MessageResponse


router = APIRouter()


def get_company_service(db: Session = Depends(get_db)) -> CompanyService:
    """Dependency to get CompanyService."""
    return CompanyService(db)


@router.get("/companies", response_model=List[CompanyResponse])
def get_companies(
    service: CompanyService = Depends(get_company_service),
) -> List[CompanyResponse]:
    """会社一覧を取得"""
    return service.get_all_companies_with_count()


@router.post("/companies", response_model=CompanyResponse, status_code=201)
def create_company(
    data: CompanyCreate,
    service: CompanyService = Depends(get_company_service),
) -> CompanyResponse:
    """会社を作成"""
    company = service.create_company(data)
    return service.get_company_response(company.id)


@router.get("/companies/search", response_model=List[CompanyResponse])
def search_companies(
    q: str = Query(..., min_length=1, description="検索キーワード"),
    service: CompanyService = Depends(get_company_service),
) -> List[CompanyResponse]:
    """会社を検索"""
    companies = service.search_companies(q)
    result = []
    for company in companies:
        result.append(service.get_company_response(company.id))
    return result


@router.get("/companies/{company_id}", response_model=CompanyResponse)
def get_company(
    company_id: int,
    service: CompanyService = Depends(get_company_service),
) -> CompanyResponse:
    """会社詳細を取得"""
    return service.get_company_response(company_id)


@router.put("/companies/{company_id}", response_model=CompanyResponse)
def update_company(
    company_id: int,
    data: CompanyUpdate,
    service: CompanyService = Depends(get_company_service),
) -> CompanyResponse:
    """会社を更新"""
    service.update_company(company_id, data)
    return service.get_company_response(company_id)


@router.delete("/companies/{company_id}", response_model=MessageResponse)
def delete_company(
    company_id: int,
    service: CompanyService = Depends(get_company_service),
) -> MessageResponse:
    """会社を削除"""
    service.delete_company(company_id)
    return MessageResponse(message="会社を削除しました")
