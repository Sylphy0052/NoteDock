"""Service for application settings management."""

from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.models import AppSettings, SettingsKey
from app.schemas.settings import SettingsResponse, SettingsUpdate

# Default AI model
DEFAULT_AI_MODEL = "gemini-2.5-flash"


class SettingsService:
    """Service for managing application settings."""

    def __init__(self, db: Session):
        self.db = db

    def _get_setting(self, key: str) -> AppSettings | None:
        """Get a setting by key."""
        return self.db.query(AppSettings).filter(AppSettings.key == key).first()

    def _set_setting(
        self, key: str, value: str, description: str | None = None
    ) -> AppSettings:
        """Set a setting value, creating if it doesn't exist."""
        setting = self._get_setting(key)
        if setting:
            setting.value = value
            if description:
                setting.description = description
        else:
            setting = AppSettings(key=key, value=value, description=description)
            self.db.add(setting)
        self.db.commit()
        self.db.refresh(setting)
        return setting

    def get_all_settings(self) -> SettingsResponse:
        """Get all settings as a structured response."""
        discord_setting = self._get_setting(SettingsKey.DISCORD_NOTIFICATION_ENABLED)
        discord_enabled = (
            discord_setting.value.lower() == "true" if discord_setting else False
        )

        # Individual notification settings (default to True)
        notify_create_setting = self._get_setting(SettingsKey.DISCORD_NOTIFY_ON_CREATE)
        notify_on_create = (
            notify_create_setting.value.lower() == "true"
            if notify_create_setting
            else True
        )

        notify_update_setting = self._get_setting(SettingsKey.DISCORD_NOTIFY_ON_UPDATE)
        notify_on_update = (
            notify_update_setting.value.lower() == "true"
            if notify_update_setting
            else True
        )

        notify_comment_setting = self._get_setting(
            SettingsKey.DISCORD_NOTIFY_ON_COMMENT
        )
        notify_on_comment = (
            notify_comment_setting.value.lower() == "true"
            if notify_comment_setting
            else True
        )

        ai_model_setting = self._get_setting(SettingsKey.AI_MODEL)
        ai_model = ai_model_setting.value if ai_model_setting else DEFAULT_AI_MODEL

        return SettingsResponse(
            discord_notification_enabled=discord_enabled,
            discord_notify_on_create=notify_on_create,
            discord_notify_on_update=notify_on_update,
            discord_notify_on_comment=notify_on_comment,
            ai_model=ai_model,
        )

    def update_settings(self, data: SettingsUpdate) -> SettingsResponse:
        """Update settings."""
        if data.discord_notification_enabled is not None:
            self._set_setting(
                SettingsKey.DISCORD_NOTIFICATION_ENABLED,
                str(data.discord_notification_enabled).lower(),
                "Discord Webhook通知の有効/無効",
            )

        if data.discord_notify_on_create is not None:
            self._set_setting(
                SettingsKey.DISCORD_NOTIFY_ON_CREATE,
                str(data.discord_notify_on_create).lower(),
                "ノート作成時のDiscord通知",
            )

        if data.discord_notify_on_update is not None:
            self._set_setting(
                SettingsKey.DISCORD_NOTIFY_ON_UPDATE,
                str(data.discord_notify_on_update).lower(),
                "ノート更新時のDiscord通知",
            )

        if data.discord_notify_on_comment is not None:
            self._set_setting(
                SettingsKey.DISCORD_NOTIFY_ON_COMMENT,
                str(data.discord_notify_on_comment).lower(),
                "コメント投稿時のDiscord通知",
            )

        if data.ai_model is not None:
            self._set_setting(
                SettingsKey.AI_MODEL,
                data.ai_model,
                "AI機能で使用するモデル",
            )

        return self.get_all_settings()

    def is_discord_notification_enabled(self) -> bool:
        """Check if Discord notification is enabled."""
        setting = self._get_setting(SettingsKey.DISCORD_NOTIFICATION_ENABLED)
        return setting.value.lower() == "true" if setting else False

    def is_discord_notify_on_create_enabled(self) -> bool:
        """Check if Discord notification on note create is enabled."""
        if not self.is_discord_notification_enabled():
            return False
        setting = self._get_setting(SettingsKey.DISCORD_NOTIFY_ON_CREATE)
        return setting.value.lower() == "true" if setting else True

    def is_discord_notify_on_update_enabled(self) -> bool:
        """Check if Discord notification on note update is enabled."""
        if not self.is_discord_notification_enabled():
            return False
        setting = self._get_setting(SettingsKey.DISCORD_NOTIFY_ON_UPDATE)
        return setting.value.lower() == "true" if setting else True

    def is_discord_notify_on_comment_enabled(self) -> bool:
        """Check if Discord notification on comment is enabled."""
        if not self.is_discord_notification_enabled():
            return False
        setting = self._get_setting(SettingsKey.DISCORD_NOTIFY_ON_COMMENT)
        return setting.value.lower() == "true" if setting else True

    def get_ai_model(self) -> str:
        """Get the configured AI model."""
        setting = self._get_setting(SettingsKey.AI_MODEL)
        if setting:
            return setting.value
        # Fall back to environment default, then hardcoded default
        env_settings = get_settings()
        return env_settings.ask_default_model or DEFAULT_AI_MODEL
