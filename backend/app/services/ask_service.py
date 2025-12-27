"""ASK API integration service."""

import json
import uuid
from typing import AsyncGenerator, Optional

import httpx

from app.core.config import get_settings
from app.core.logging import log_info, log_warning
from app.schemas.ai import (
    ChatFileResponse,
    ChatFileStatusResponse,
    FileStatus,
    ModelVariant,
    SASTokenResponse,
    StreamEvent,
)


class AskServiceError(Exception):
    """Base exception for ASK service errors."""

    pass


class AskAPIError(AskServiceError):
    """Error from ASK API."""

    def __init__(
        self, status_code: int, message: str, details: Optional[str] = None
    ):
        self.status_code = status_code
        self.message = message
        self.details = details
        super().__init__(f"ASK API Error ({status_code}): {message}")


class FileUploadError(AskServiceError):
    """Error during file upload."""

    pass


class FileProcessingError(AskServiceError):
    """Error during file processing."""

    pass


class AskService:
    """ASK API integration service.

    Note: ASK API has rate limiting of 1 request per second.
    Consider adding retry logic with exponential backoff for production use.
    """

    def __init__(self) -> None:
        self.settings = get_settings()
        self.base_url = self.settings.ask_api_url
        self.api_key = self.settings.ask_api_key
        self.project_id = self.settings.ask_project_id
        self.dr_project_id = self.settings.ask_dr_project_id
        self.default_model = self.settings.ask_default_model
        self.timeout = 60.0  # seconds

    def _is_enabled(self) -> bool:
        """Check if ASK API is configured and enabled."""
        return bool(
            self.settings.ask_enabled and self.api_key and self.project_id
        )

    def _get_headers(self) -> dict[str, str]:
        """Get common headers for ASK API requests."""
        return {
            "Authorization": f"Bearer {self.api_key}",
            "Accept": "application/json",
            "Content-Type": "application/json",
        }

    async def get_sas_token(
        self, chat_id: str, content_type: str
    ) -> SASTokenResponse:
        """
        Get SAS token for file upload to Azure Blob Storage.

        Args:
            chat_id: UUID of the chat session
            content_type: MIME type of the file

        Returns:
            SASTokenResponse with sasUrl and blobName

        Raises:
            AskAPIError: If API request fails
        """
        url = f"{self.base_url}/api/sas-tokens/"

        payload = {
            "chatId": chat_id,
            "contentType": content_type,
        }

        async with httpx.AsyncClient(timeout=self.timeout) as client:
            try:
                response = await client.post(
                    url,
                    headers=self._get_headers(),
                    json=payload,
                )

                if response.status_code != 200:
                    raise AskAPIError(
                        status_code=response.status_code,
                        message="Failed to get SAS token",
                        details=response.text,
                    )

                data = response.json()
                return SASTokenResponse(
                    account_name=data["accountName"],
                    container_name=data["containerName"],
                    blob_name=data["blobName"],
                    sas_token=data["sasToken"],
                    end_point=data["endPoint"],
                )

            except httpx.TimeoutException:
                raise AskAPIError(
                    status_code=408,
                    message="Request timed out while getting SAS token",
                )
            except httpx.RequestError as e:
                raise AskAPIError(
                    status_code=500,
                    message=f"Network error: {str(e)}",
                )

    async def upload_file_to_blob(
        self, sas_url: str, file_data: bytes, content_type: str
    ) -> None:
        """
        Upload file to Azure Blob Storage using SAS URL.

        Args:
            sas_url: Pre-signed SAS URL from get_sas_token
            file_data: File content as bytes
            content_type: MIME type of the file

        Raises:
            FileUploadError: If upload fails
        """
        headers = {
            "x-ms-blob-type": "BlockBlob",
            "Content-Type": content_type,
        }

        async with httpx.AsyncClient(timeout=self.timeout) as client:
            try:
                response = await client.put(
                    sas_url,
                    headers=headers,
                    content=file_data,
                )

                if response.status_code not in (200, 201):
                    msg = f"Failed to upload to blob: {response.status_code}"
                    raise FileUploadError(msg)

                log_info("File uploaded to Azure Blob Storage")

            except httpx.TimeoutException:
                raise FileUploadError("File upload timed out")
            except httpx.RequestError as e:
                raise FileUploadError(f"Network error during upload: {str(e)}")

    async def register_chat_file(
        self,
        blob_name: str,
        chat_id: str,
        content_type: str,
        original_filename: str,
    ) -> ChatFileResponse:
        """
        Register uploaded file with ASK API.

        Args:
            blob_name: Blob name from SAS token response
            chat_id: UUID of the chat session
            content_type: MIME type of the file
            original_filename: Original name of the file

        Returns:
            ChatFileResponse with fileId and status

        Raises:
            AskAPIError: If registration fails
        """
        url = f"{self.base_url}/api/files/"

        payload = {
            "blobName": blob_name,
            "chatId": chat_id,
            "contentType": content_type,
            "originalFileName": original_filename,
        }

        async with httpx.AsyncClient(timeout=self.timeout) as client:
            try:
                response = await client.post(
                    url,
                    headers=self._get_headers(),
                    json=payload,
                )

                if response.status_code not in (200, 201):
                    raise AskAPIError(
                        status_code=response.status_code,
                        message="Failed to register chat file",
                        details=response.text,
                    )

                data = response.json()
                return ChatFileResponse(
                    file_id=data["fileId"],
                    status=FileStatus(data.get("status", "PROCESSING")),
                )

            except httpx.TimeoutException:
                raise AskAPIError(
                    status_code=408,
                    message="Request timed out while registering file",
                )
            except httpx.RequestError as e:
                raise AskAPIError(
                    status_code=500,
                    message=f"Network error: {str(e)}",
                )

    async def check_file_status(self, file_id: str) -> ChatFileStatusResponse:
        """
        Check the processing status of an uploaded file.

        Args:
            file_id: ID of the file to check

        Returns:
            ChatFileStatusResponse with status

        Raises:
            AskAPIError: If status check fails
        """
        url = f"{self.base_url}/api/files/{file_id}/"

        async with httpx.AsyncClient(timeout=self.timeout) as client:
            try:
                response = await client.get(
                    url,
                    headers=self._get_headers(),
                )

                if response.status_code != 200:
                    raise AskAPIError(
                        status_code=response.status_code,
                        message="Failed to check file status",
                        details=response.text,
                    )

                data = response.json()
                return ChatFileStatusResponse(
                    file_id=file_id,
                    status=FileStatus(data.get("status", "PROCESSING")),
                    error_message=data.get("errorMessage"),
                )

            except httpx.TimeoutException:
                raise AskAPIError(
                    status_code=408,
                    message="Request timed out while checking file status",
                )
            except httpx.RequestError as e:
                raise AskAPIError(
                    status_code=500,
                    message=f"Network error: {str(e)}",
                )

    async def wait_for_file_ready(
        self,
        file_id: str,
        timeout_seconds: int = 60,
        poll_interval: float = 2.0,
    ) -> bool:
        """
        Wait for file to be ready for use.

        Args:
            file_id: ID of the file to wait for
            timeout_seconds: Maximum time to wait
            poll_interval: Time between status checks

        Returns:
            True if file is ready, False if timeout

        Raises:
            FileProcessingError: If file processing fails
        """
        import asyncio

        elapsed = 0.0

        while elapsed < timeout_seconds:
            status_response = await self.check_file_status(file_id)

            if status_response.status == FileStatus.DONE:
                log_info(f"File {file_id} is ready")
                return True

            if status_response.status == FileStatus.ERROR:
                raise FileProcessingError(
                    f"File processing failed: {status_response.error_message}"
                )

            await asyncio.sleep(poll_interval)
            elapsed += poll_interval

        log_warning(
            f"File {file_id} processing timed out after {timeout_seconds}s"
        )
        return False

    async def upload_file(
        self,
        file_data: bytes,
        filename: str,
        content_type: str,
        chat_id: Optional[str] = None,
    ) -> str:
        """
        Upload a file for use in chat.

        This is a convenience method that combines:
        1. Get SAS token
        2. Upload to blob storage
        3. Register with ASK API
        4. Wait for processing

        Args:
            file_data: File content as bytes
            filename: Original filename
            content_type: MIME type
            chat_id: Optional chat ID (generated if not provided)

        Returns:
            file_id for use in chat requests

        Raises:
            Various exceptions if any step fails
        """
        if chat_id is None:
            chat_id = str(uuid.uuid4())

        # Step 1: Get SAS token
        sas_response = await self.get_sas_token(chat_id, content_type)

        # Step 2: Upload to blob storage
        await self.upload_file_to_blob(
            sas_response.sas_url, file_data, content_type
        )

        # Step 3: Register with ASK API
        file_response = await self.register_chat_file(
            blob_name=sas_response.blob_name,
            chat_id=chat_id,
            content_type=content_type,
            original_filename=filename,
        )

        # Step 4: Wait for file to be ready
        await self.wait_for_file_ready(file_response.file_id)

        return file_response.file_id

    async def chat(
        self,
        user_input: str,
        chat_id: Optional[str] = None,
        template: str = "",
        model_variant: Optional[ModelVariant] = None,
        chat_file_ids: Optional[list[str]] = None,
        parent_id: Optional[str] = None,
        project_id: Optional[int] = None,
    ) -> AsyncGenerator[StreamEvent, None]:
        """
        Send a chat message and stream the response.

        Args:
            user_input: User's message/prompt
            chat_id: Chat session ID (generated if not provided)
            template: System prompt template
            model_variant: AI model to use
            chat_file_ids: IDs of attached files
            parent_id: Parent message ID for multi-turn conversations
            project_id: Optional project ID (defaults to self.project_id)

        Yields:
            StreamEvent objects as they arrive

        Raises:
            AskAPIError: If chat request fails
        """
        if not self._is_enabled():
            raise AskServiceError("ASK API is not configured or enabled")

        if chat_id is None:
            chat_id = str(uuid.uuid4())

        if model_variant is None:
            model_variant = ModelVariant(self.default_model)

        # Use provided project_id or default to self.project_id
        effective_project_id = project_id if project_id else self.project_id

        url = f"{self.base_url}/api/chat/?requireMessageId=True"

        payload = {
            "action": "new",
            "projectId": effective_project_id,
            "chatId": chat_id,
            "userInput": user_input,
            "template": template,
            "modelVariant": model_variant.value,
            "dataSourceItems": [],
            "chatFileIds": chat_file_ids or [],
            "parentId": parent_id,
            "isAttachedFile": bool(chat_file_ids),
            "useWebSearch": False,
            "isFollowUp": bool(parent_id),
        }

        async with httpx.AsyncClient(timeout=None) as client:
            try:
                async with client.stream(
                    "POST",
                    url,
                    headers=self._get_headers(),
                    json=payload,
                ) as response:
                    if response.status_code != 200:
                        content = await response.aread()
                        raise AskAPIError(
                            status_code=response.status_code,
                            message="Chat request failed",
                            details=content.decode("utf-8"),
                        )

                    async for line in response.aiter_lines():
                        if line.strip():
                            try:
                                event_data = json.loads(line)
                                yield StreamEvent(**event_data)
                            except json.JSONDecodeError:
                                log_warning(
                                    f"Failed to parse stream line: {line}"
                                )
                            except Exception as e:
                                log_warning(
                                    f"Error processing stream event: {e}"
                                )

            except httpx.TimeoutException:
                raise AskAPIError(
                    status_code=408,
                    message="Chat request timed out",
                )
            except httpx.RequestError as e:
                raise AskAPIError(
                    status_code=500,
                    message=f"Network error during chat: {str(e)}",
                )

    async def chat_simple(
        self,
        user_input: str,
        chat_id: Optional[str] = None,
        template: str = "",
        model_variant: Optional[ModelVariant] = None,
        chat_file_ids: Optional[list[str]] = None,
        parent_id: Optional[str] = None,
    ) -> tuple[str, Optional[str]]:
        """
        Send a chat message and return the complete response.

        This is a convenience method that collects the streaming response.

        Args:
            Same as chat()

        Returns:
            Tuple of (response_text, bot_message_id)
        """
        full_message = ""
        bot_message_id = None

        async for event in self.chat(
            user_input=user_input,
            chat_id=chat_id,
            template=template,
            model_variant=model_variant,
            chat_file_ids=chat_file_ids,
            parent_id=parent_id,
        ):
            if event.type == "add_message_token" and event.token:
                full_message += event.token
            elif event.type == "replace_message" and event.message:
                full_message = event.message
            elif event.type == "add_bot_message_id" and event.id:
                bot_message_id = event.id

        return full_message, bot_message_id


# Singleton instance
_ask_service: Optional[AskService] = None


def get_ask_service() -> AskService:
    """Get ASK service singleton."""
    global _ask_service
    if _ask_service is None:
        _ask_service = AskService()
    return _ask_service
