"""Settings API endpoints."""

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.schemas.settings import (
    AvailableModelsResponse,
    SettingsResponse,
    SettingsUpdate,
)
from app.services.settings_service import SettingsService

router = APIRouter(prefix="/v1/settings")


@router.get("", response_model=SettingsResponse)
def get_settings(db: Session = Depends(get_db)) -> SettingsResponse:
    """Get all application settings."""
    service = SettingsService(db)
    return service.get_all_settings()


@router.put("", response_model=SettingsResponse)
def update_settings(
    data: SettingsUpdate, db: Session = Depends(get_db)
) -> SettingsResponse:
    """Update application settings."""
    service = SettingsService(db)
    return service.update_settings(data)


@router.get("/models", response_model=AvailableModelsResponse)
def get_available_models(db: Session = Depends(get_db)) -> AvailableModelsResponse:
    """Get available AI models and current selection."""
    service = SettingsService(db)
    current_model = service.get_ai_model()
    return AvailableModelsResponse.from_current(current_model)
