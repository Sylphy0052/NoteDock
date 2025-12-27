"""Discord Webhook notification service."""

import httpx
from typing import Optional

from app.core.config import get_settings
from app.core.logging import log_info, log_warning, log_error


class DiscordService:
    """Discord Webhook notification service."""

    def __init__(self) -> None:
        self.settings = get_settings()
        self.webhook_url = self.settings.discord_webhook_url

    def _is_enabled(self) -> bool:
        """Check if Discord webhook is configured."""
        return bool(self.webhook_url)

    async def _send_webhook(
        self,
        title: str,
        description: str,
        color: int = 0x5865F2,
        url: Optional[str] = None,
        fields: Optional[list[dict]] = None,
    ) -> bool:
        """
        Send a webhook message to Discord.

        Args:
            title: Embed title
            description: Embed description
            color: Embed color (hex)
            url: Optional URL for the embed
            fields: Optional list of field dicts with name, value, inline

        Returns:
            True if successful, False otherwise
        """
        if not self._is_enabled():
            log_info("Discord webhook not configured, skipping notification")
            return False

        embed = {
            "title": title,
            "description": description,
            "color": color,
        }

        if url:
            embed["url"] = url

        if fields:
            embed["fields"] = fields

        payload = {
            "username": "NoteDock",
            "embeds": [embed],
        }

        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                response = await client.post(
                    self.webhook_url,
                    json=payload,
                )
                if response.status_code in (200, 204):
                    log_info(f"Discord notification sent: {title}")
                    return True
                else:
                    log_warning(
                        f"Discord webhook returned {response.status_code}: {response.text}"
                    )
                    return False
        except httpx.TimeoutException:
            log_warning("Discord webhook request timed out")
            return False
        except Exception as e:
            log_error(f"Failed to send Discord notification: {e}")
            return False

    async def notify_note_created(
        self,
        note_id: int,
        title: str,
        base_url: Optional[str] = None,
    ) -> bool:
        """
        Send notification for new note creation.

        Args:
            note_id: ID of the created note
            title: Title of the note
            base_url: Base URL of the application
        """
        if base_url is None:
            base_url = self.settings.frontend_base_url

        return await self._send_webhook(
            title="📝 新しいノートが作成されました",
            description=f"**{title}**",
            color=0x57F287,  # Green
            url=f"{base_url}/notes/{note_id}",
            fields=[
                {"name": "ノートID", "value": f"#{note_id}", "inline": True},
            ],
        )

    async def notify_note_updated(
        self,
        note_id: int,
        title: str,
        base_url: Optional[str] = None,
    ) -> bool:
        """
        Send notification for note update.

        Args:
            note_id: ID of the updated note
            title: Title of the note
            base_url: Base URL of the application
        """
        if base_url is None:
            base_url = self.settings.frontend_base_url

        return await self._send_webhook(
            title="✏️ ノートが更新されました",
            description=f"**{title}**",
            color=0xFEE75C,  # Yellow
            url=f"{base_url}/notes/{note_id}",
            fields=[
                {"name": "ノートID", "value": f"#{note_id}", "inline": True},
            ],
        )

    async def notify_comment_posted(
        self,
        note_id: int,
        note_title: str,
        display_name: str,
        comment_preview: str,
        base_url: Optional[str] = None,
    ) -> bool:
        """
        Send notification for new comment.

        Args:
            note_id: ID of the note
            note_title: Title of the note
            display_name: Name of the commenter
            comment_preview: First part of the comment
            base_url: Base URL of the application
        """
        if base_url is None:
            base_url = self.settings.frontend_base_url

        # Truncate comment preview if too long
        if len(comment_preview) > 100:
            comment_preview = comment_preview[:97] + "..."

        return await self._send_webhook(
            title="💬 新しいコメントが投稿されました",
            description=f"**{note_title}**\n\n> {comment_preview}",
            color=0x5865F2,  # Blurple
            url=f"{base_url}/notes/{note_id}#comments",
            fields=[
                {"name": "投稿者", "value": display_name, "inline": True},
                {"name": "ノートID", "value": f"#{note_id}", "inline": True},
            ],
        )


# Singleton instance
_discord_service: Optional[DiscordService] = None


def get_discord_service() -> DiscordService:
    """Get Discord service singleton."""
    global _discord_service
    if _discord_service is None:
        _discord_service = DiscordService()
    return _discord_service
