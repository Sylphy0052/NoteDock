"""Pydantic schemas for ASK AI API integration."""

from enum import Enum
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, Field, field_validator


class ModelVariant(str, Enum):
    """Available AI model variants (verified with ASK API)."""

    # OpenAI GPT models
    GPT_4O = "gpt-4o"
    GPT_4O_MINI = "gpt-4o-mini"
    GPT_4_1 = "gpt-4.1"
    GPT_5 = "gpt-5"
    GPT_5_THINKING = "gpt-5-thinking"
    GPT_5_1 = "gpt-5.1"
    GPT_5_1_THINKING = "gpt-5.1-thinking"
    GPT_5_2 = "gpt-5.2"
    GPT_5_2_THINKING = "gpt-5.2-thinking"

    # OpenAI o-series (reasoning models)
    O3_MINI = "o3-mini"
    O3_MINI_HIGH = "o3-mini-high"
    O4_MINI = "o4-mini"
    O4_MINI_HIGH = "o4-mini-high"

    # Anthropic Claude models
    CLAUDE_4_SONNET = "claude-4-sonnet"
    CLAUDE_4_SONNET_THINKING = "claude-4-sonnet-thinking"
    CLAUDE_45_SONNET = "claude-45-sonnet"
    CLAUDE_45_SONNET_THINKING = "claude-45-sonnet-thinking"

    # Google Gemini models
    GEMINI_2_0_FLASH = "gemini-2.0-flash-001"
    GEMINI_2_0_FLASH_WEB_SEARCH = "gemini-2.0-flash-001-web-search"
    GEMINI_2_5_FLASH = "gemini-2.5-flash"
    GEMINI_2_5_FLASH_LITE = "gemini-2.5-flash-lite"
    GEMINI_2_5_FLASH_WEB_SEARCH = "gemini-2.5-flash-web-search"
    GEMINI_3_FLASH = "gemini-3-flash"


class ModelSpeed(str, Enum):
    """Model response speed category."""

    FAST = "fast"  # < 2.0s
    MEDIUM = "medium"  # < 5.0s
    SLOW = "slow"  # >= 5.0s


# Model metadata for UI display
AVAILABLE_MODELS: list[dict] = [
    # Fast models (< 2.0s)
    {"id": "gpt-4.1", "name": "GPT-4.1", "speed": "fast", "provider": "OpenAI"},
    {"id": "gpt-5.2", "name": "GPT-5.2", "speed": "fast", "provider": "OpenAI"},
    {
        "id": "gemini-2.5-flash-lite",
        "name": "Gemini 2.5 Flash Lite",
        "speed": "fast",
        "provider": "Google",
    },
    {
        "id": "gemini-2.0-flash-001",
        "name": "Gemini 2.0 Flash",
        "speed": "fast",
        "provider": "Google",
    },
    {
        "id": "gpt-5.1-thinking",
        "name": "GPT-5.1 Thinking",
        "speed": "fast",
        "provider": "OpenAI",
    },
    {
        "id": "gemini-2.5-flash",
        "name": "Gemini 2.5 Flash",
        "speed": "fast",
        "provider": "Google",
    },
    {"id": "gpt-5.1", "name": "GPT-5.1", "speed": "fast", "provider": "OpenAI"},
    {"id": "gpt-4o", "name": "GPT-4o", "speed": "fast", "provider": "OpenAI"},
    {"id": "o3-mini", "name": "o3 mini", "speed": "fast", "provider": "OpenAI"},
    {"id": "o4-mini-high", "name": "o4 mini high", "speed": "fast", "provider": "OpenAI"},
    {"id": "o4-mini", "name": "o4 mini", "speed": "fast", "provider": "OpenAI"},
    # Medium models (2.0-5.0s)
    {
        "id": "gpt-5.2-thinking",
        "name": "GPT-5.2 Thinking",
        "speed": "medium",
        "provider": "OpenAI",
    },
    {"id": "gpt-5", "name": "GPT-5", "speed": "medium", "provider": "OpenAI"},
    {"id": "gpt-4o-mini", "name": "GPT-4o mini", "speed": "medium", "provider": "OpenAI"},
    # Anthropic Claude models
    {
        "id": "claude-4-sonnet",
        "name": "Claude 4 Sonnet",
        "speed": "fast",
        "provider": "Anthropic",
    },
    {
        "id": "claude-4-sonnet-thinking",
        "name": "Claude 4 Sonnet Thinking",
        "speed": "medium",
        "provider": "Anthropic",
    },
    {
        "id": "claude-45-sonnet",
        "name": "Claude Sonnet 4.5",
        "speed": "medium",
        "provider": "Anthropic",
    },
    {
        "id": "claude-45-sonnet-thinking",
        "name": "Claude Sonnet 4.5 Thinking",
        "speed": "medium",
        "provider": "Anthropic",
    },
    # Google Gemini Web Search models
    {
        "id": "gemini-2.0-flash-001-web-search",
        "name": "Gemini 2.0 Flash Web Search",
        "speed": "fast",
        "provider": "Google",
    },
    {
        "id": "gemini-2.5-flash-web-search",
        "name": "Gemini 2.5 Flash Web Search",
        "speed": "fast",
        "provider": "Google",
    },
    {
        "id": "gemini-3-flash",
        "name": "Gemini 3 Flash",
        "speed": "fast",
        "provider": "Google",
    },
    # Slow models (>= 5.0s)
    {"id": "o3-mini-high", "name": "o3 mini high", "speed": "slow", "provider": "OpenAI"},
    {
        "id": "gpt-5-thinking",
        "name": "GPT-5 Thinking",
        "speed": "medium",
        "provider": "OpenAI",
    },
]


class ModelInfo(BaseModel):
    """Model information for API response."""

    id: str
    name: str
    speed: ModelSpeed
    provider: str


class FileStatus(str, Enum):
    """File processing status."""

    PROCESSING = "PROCESSING"
    DONE = "DONE"
    ERROR = "ERROR"


# === ASK API Request/Response Schemas ===


class SASTokenRequest(BaseModel):
    """Request body for SAS token generation."""

    chat_id: str = Field(..., alias="chatId")
    content_type: str = Field(..., alias="contentType")

    model_config = {"populate_by_name": True}


class SASTokenResponse(BaseModel):
    """Response from SAS token endpoint."""

    account_name: str = Field(..., alias="accountName")
    container_name: str = Field(..., alias="containerName")
    blob_name: str = Field(..., alias="blobName")
    sas_token: str = Field(..., alias="sasToken")
    end_point: str = Field(..., alias="endPoint")

    model_config = {"populate_by_name": True}

    @property
    def sas_url(self) -> str:
        """Construct full SAS URL for blob upload."""
        base = f"{self.end_point}{self.container_name}/{self.blob_name}"
        return f"{base}?{self.sas_token}"


class ChatFileRegisterRequest(BaseModel):
    """Request body for registering a chat file."""

    blob_name: str = Field(..., alias="blobName")
    chat_id: str = Field(..., alias="chatId")
    content_type: str = Field(..., alias="contentType")
    original_file_name: str = Field(..., alias="originalFileName")

    model_config = {"populate_by_name": True}


class ChatFileResponse(BaseModel):
    """Response from chat file registration."""

    file_id: str = Field(..., alias="fileId")
    status: FileStatus

    model_config = {"populate_by_name": True}


class ChatFileStatusResponse(BaseModel):
    """Response from file status check."""

    file_id: str = Field(..., alias="fileId")
    status: FileStatus
    error_message: Optional[str] = Field(None, alias="errorMessage")

    model_config = {"populate_by_name": True}


class DataSourceItem(BaseModel):
    """Data source item for chat request."""

    type: str = "file"
    id: int


class ChatRequest(BaseModel):
    """Request body for ASK API chat endpoint."""

    action: str = "new"
    project_id: int = Field(..., alias="projectId")
    chat_id: str = Field(..., alias="chatId")
    user_input: str = Field(..., alias="userInput")
    template: str = ""
    model_variant: ModelVariant = Field(
        default=ModelVariant.GPT_4O_MINI, alias="modelVariant"
    )
    data_source_items: list[DataSourceItem] = Field(
        default_factory=list, alias="dataSourceItems"
    )
    chat_file_ids: list[str] = Field(default_factory=list, alias="chatFileIds")
    parent_id: Optional[str] = Field(None, alias="parentId")
    is_attached_file: bool = Field(False, alias="isAttachedFile")
    use_web_search: bool = Field(False, alias="useWebSearch")
    is_follow_up: bool = Field(False, alias="isFollowUp")

    model_config = {"populate_by_name": True}


# === Stream Response Schemas ===


class StreamEventType(str, Enum):
    """Types of streaming events from ASK API."""

    ADD_PROGRESS_MESSAGE = "add_progress_message"
    ADD_MESSAGE_TOKEN = "add_message_token"
    ADD_USED_SOURCES = "add_used_sources"
    ADD_CITATION_MARKERS = "add_citation_markers"
    REPLACE_MESSAGE = "replace_message"
    ADD_BOT_MESSAGE_ID = "add_bot_message_id"
    ADD_OUTPUT = "add_output"


class SourceMetadata(BaseModel):
    """Metadata for a source reference."""

    source: str
    source_type: Optional[str] = Field(None, alias="sourceType")
    line: Optional[int] = None
    file_id: Optional[int] = Field(None, alias="fileId")
    file_url: Optional[str] = Field(None, alias="fileUrl")

    model_config = {"populate_by_name": True}


class BotResponseSource(BaseModel):
    """Source information in bot response."""

    content_id: Optional[str] = Field(None, alias="contentID")
    page_content: str = Field(..., alias="pageContent")
    metadata: SourceMetadata

    model_config = {"populate_by_name": True}


class CitationMarker(BaseModel):
    """Citation marker in response."""

    start: int
    end: int
    content_ids: list[str] = Field(..., alias="contentIDs")

    model_config = {"populate_by_name": True}


class StreamEvent(BaseModel):
    """A single event from the streaming response."""

    type: str
    message: Optional[str] = None
    token: Optional[str] = None
    sources: Optional[list[BotResponseSource]] = None
    citation_markers: Optional[list[CitationMarker]] = Field(
        None, alias="citationMarkers"
    )
    id: Optional[str] = None

    model_config = {"populate_by_name": True}

    @field_validator("id", mode="before")
    @classmethod
    def convert_id_to_string(cls, v: object) -> Optional[str]:
        """Convert id to string if it's an integer."""
        if v is None:
            return None
        return str(v)


# === Application-level Schemas ===


class AIGenerateRequest(BaseModel):
    """Request for AI content generation."""

    prompt: str
    template: Optional[str] = None
    file_ids: list[str] = Field(default_factory=list, alias="fileIds")
    model_variant: ModelVariant = Field(
        default=ModelVariant.GPT_4O_MINI, alias="modelVariant"
    )
    chat_id: Optional[str] = Field(default=None, alias="chatId")
    parent_id: Optional[str] = Field(default=None, alias="parentId")

    model_config = {"populate_by_name": True}


class AISummarizeRequest(BaseModel):
    """Request for AI summarization."""

    note_id: int = Field(..., alias="noteId")
    additional_file_ids: list[str] = Field(
        default_factory=list, alias="additionalFileIds"
    )
    length: str = "medium"  # short, medium, long
    style: str = "paragraph"  # bullet, paragraph
    focus: Optional[str] = None

    model_config = {"populate_by_name": True}


class AIAskRequest(BaseModel):
    """Request for AI Q&A."""

    note_id: int = Field(..., alias="noteId")
    question: str
    file_ids: list[str] = Field(default_factory=list, alias="fileIds")
    chat_id: Optional[UUID] = Field(None, alias="chatId")
    parent_id: Optional[str] = Field(None, alias="parentId")

    model_config = {"populate_by_name": True}


class AIFolderSummarizeRequest(BaseModel):
    """Request for AI folder summarization."""

    folder_id: int = Field(..., alias="folderId")
    additional_file_ids: list[str] = Field(
        default_factory=list, alias="additionalFileIds"
    )
    length: str = "medium"  # short, medium, long
    style: str = "paragraph"  # bullet, paragraph
    focus: Optional[str] = None

    model_config = {"populate_by_name": True}


class AIFolderAskRequest(BaseModel):
    """Request for AI Q&A on folder content."""

    folder_id: int = Field(..., alias="folderId")
    question: str
    file_ids: list[str] = Field(default_factory=list, alias="fileIds")
    chat_id: Optional[UUID] = Field(None, alias="chatId")
    parent_id: Optional[str] = Field(None, alias="parentId")

    model_config = {"populate_by_name": True}


class AIProjectAskRequest(BaseModel):
    """Request for AI Q&A on project content."""

    project_id: int = Field(..., alias="projectId")
    question: str
    file_ids: list[str] = Field(default_factory=list, alias="fileIds")
    chat_id: Optional[UUID] = Field(None, alias="chatId")
    parent_id: Optional[str] = Field(None, alias="parentId")

    model_config = {"populate_by_name": True}


class AIAssistRequest(BaseModel):
    """Request for AI editing assistance."""

    content: str
    mode: str  # improve, simplify, expand, translate, custom, weekly_report
    custom_instructions: Optional[str] = Field(
        None, alias="customInstructions"
    )
    file_ids: list[str] = Field(default_factory=list, alias="fileIds")
    target_language: Optional[str] = Field(None, alias="targetLanguage")
    context: Optional[str] = Field(
        None, description="Additional context for weekly_report mode (project/note information)"
    )

    model_config = {"populate_by_name": True}


class AIResponse(BaseModel):
    """Response from AI operations."""

    content: str
    sources: list[BotResponseSource] = Field(default_factory=list)
    message_id: Optional[str] = Field(None, alias="messageId")

    model_config = {"populate_by_name": True}


# === AI Tag Suggestion Schemas ===


class AITagSuggestRequest(BaseModel):
    """Request for AI tag suggestion."""

    title: str = Field(..., min_length=1, description="ノートタイトル")
    content: str = Field(..., min_length=1, description="ノート本文")
    max_suggestions: int = Field(
        default=5, ge=1, le=10, alias="maxSuggestions", description="最大提案数"
    )

    model_config = {"populate_by_name": True}


class TagSuggestion(BaseModel):
    """A single tag suggestion from AI."""

    name: str = Field(..., max_length=100, description="タグ名")
    reason: str = Field(..., description="提案理由")
    is_existing: bool = Field(..., alias="isExisting", description="既存タグかどうか")

    model_config = {"populate_by_name": True}


class AITagSuggestResponse(BaseModel):
    """Response containing AI tag suggestions."""

    suggestions: list[TagSuggestion] = Field(..., description="提案タグリスト")

    model_config = {"populate_by_name": True}
