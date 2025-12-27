"""Schemas for application settings."""

from pydantic import BaseModel

from app.schemas.ai import AVAILABLE_MODELS, ModelInfo


class SettingResponse(BaseModel):
    """Response schema for a single setting."""

    key: str
    value: str
    description: str | None = None

    class Config:
        from_attributes = True


class SettingsResponse(BaseModel):
    """Response schema for all settings."""

    discord_notification_enabled: bool = False
    discord_notify_on_create: bool = True
    discord_notify_on_update: bool = True
    discord_notify_on_comment: bool = True
    ai_model: str = "gemini-2.5-flash"  # Default AI model


class SettingsUpdate(BaseModel):
    """Request schema for updating settings."""

    discord_notification_enabled: bool | None = None
    discord_notify_on_create: bool | None = None
    discord_notify_on_update: bool | None = None
    discord_notify_on_comment: bool | None = None
    ai_model: str | None = None


class AvailableModelsResponse(BaseModel):
    """Response schema for available AI models."""

    models: list[ModelInfo]
    current_model: str

    @classmethod
    def from_current(cls, current_model: str) -> "AvailableModelsResponse":
        """Create response with available models."""
        models = [ModelInfo(**m) for m in AVAILABLE_MODELS]
        return cls(models=models, current_model=current_model)
