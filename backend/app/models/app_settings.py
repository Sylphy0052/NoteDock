"""Application settings model - key-value store for app configuration."""

from sqlalchemy import String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base, TimestampMixin


class AppSettings(Base, TimestampMixin):
    """Application settings stored as key-value pairs."""

    __tablename__ = "app_settings"

    key: Mapped[str] = mapped_column(String(100), primary_key=True)
    value: Mapped[str] = mapped_column(Text, nullable=False, default="")
    description: Mapped[str] = mapped_column(String(500), nullable=True)


# Default settings keys
class SettingsKey:
    """Constants for settings keys."""

    DISCORD_NOTIFICATION_ENABLED = "discord_notification_enabled"
    DISCORD_NOTIFY_ON_CREATE = "discord_notify_on_create"
    DISCORD_NOTIFY_ON_UPDATE = "discord_notify_on_update"
    DISCORD_NOTIFY_ON_COMMENT = "discord_notify_on_comment"
    AI_MODEL = "ai_model"
