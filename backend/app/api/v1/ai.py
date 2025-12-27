"""AI API endpoints using HEROZ ASK API."""

import json
from typing import AsyncGenerator, Optional

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models import Note
from app.repositories.folder_repo import FolderRepository
from app.repositories.note_repo import NoteRepository
from app.repositories.tag_repo import TagRepository
from app.schemas.ai import (
    AIAskRequest,
    AIAssistRequest,
    AIFolderAskRequest,
    AIFolderSummarizeRequest,
    AIGenerateRequest,
    AIProjectAskRequest,
    AISummarizeRequest,
    AITagSuggestRequest,
    AITagSuggestResponse,
    ModelVariant,
    TagSuggestion,
)
from app.services.ask_service import (
    AskAPIError,
    AskServiceError,
    FileProcessingError,
    FileUploadError,
    get_ask_service,
)
from app.services.note_service import NoteService
from app.services.project_service import ProjectService

router = APIRouter(prefix="/ai", tags=["ai"])


# === Request/Response Schemas ===


class AIStatusResponse(BaseModel):
    """Response for AI status check."""

    enabled: bool
    default_model: str = Field(..., alias="defaultModel")

    model_config = {"populate_by_name": True}


class FileUploadResponse(BaseModel):
    """Response for file upload."""

    file_id: str = Field(..., alias="fileId")

    model_config = {"populate_by_name": True}


# === Helper Functions ===


def get_note_service(db: Session = Depends(get_db)) -> NoteService:
    """Get NoteService dependency."""
    return NoteService(db)


def get_folder_repo(db: Session = Depends(get_db)) -> FolderRepository:
    """Get FolderRepository dependency."""
    return FolderRepository(db)


def get_note_repo(db: Session = Depends(get_db)) -> NoteRepository:
    """Get NoteRepository dependency."""
    return NoteRepository(db)


def get_tag_repo(db: Session = Depends(get_db)) -> TagRepository:
    """Get TagRepository dependency."""
    return TagRepository(db)


def get_project_service(db: Session = Depends(get_db)) -> ProjectService:
    """Get ProjectService dependency."""
    return ProjectService(db)


def build_folder_content(notes: list[Note], folder_name: str) -> str:
    """Build combined content from multiple notes for AI processing.

    Args:
        notes: List of notes to combine.
        folder_name: Name of the folder for context.

    Returns:
        Combined content string with note titles and content.
    """
    if not notes:
        return ""

    parts = [f"# フォルダ「{folder_name}」内のノート一覧\n"]
    parts.append(f"（{len(notes)}件のノート）\n\n")

    for i, note in enumerate(notes, 1):
        parts.append(f"---\n## ノート {i}: {note.title}\n")
        parts.append(f"{note.content_md}\n\n")

    return "".join(parts)


async def stream_chat_response(
    user_input: str,
    chat_id: Optional[str] = None,
    template: str = "",
    model_variant: Optional[ModelVariant] = None,
    chat_file_ids: Optional[list[str]] = None,
    parent_id: Optional[str] = None,
    project_id: Optional[int] = None,
) -> AsyncGenerator[str, None]:
    """Stream chat response as NDJSON.

    Args:
        user_input: User's input prompt
        chat_id: Optional chat session ID
        template: System prompt template
        model_variant: AI model to use
        chat_file_ids: IDs of attached files
        parent_id: Parent message ID for multi-turn
        project_id: Optional project ID (for DeepResearch etc.)
    """
    ask_service = get_ask_service()

    try:
        async for event in ask_service.chat(
            user_input=user_input,
            chat_id=chat_id,
            template=template,
            model_variant=model_variant,
            chat_file_ids=chat_file_ids,
            parent_id=parent_id,
            project_id=project_id,
        ):
            yield json.dumps(event.model_dump(by_alias=True)) + "\n"
    except AskAPIError as e:
        error_event = {"type": "error", "message": e.message}
        yield json.dumps(error_event) + "\n"
    except AskServiceError as e:
        error_event = {"type": "error", "message": str(e)}
        yield json.dumps(error_event) + "\n"


# === Endpoints ===


@router.get("/status", response_model=AIStatusResponse)
async def get_ai_status() -> AIStatusResponse:
    """Check if AI features are enabled."""
    ask_service = get_ask_service()
    return AIStatusResponse(
        enabled=ask_service._is_enabled(),
        defaultModel=ask_service.default_model,
    )


@router.post("/generate")
async def generate_content(
    request: AIGenerateRequest,
) -> StreamingResponse:
    """
    Generate content from a prompt.

    Streams the response as NDJSON.
    """
    ask_service = get_ask_service()

    if not ask_service._is_enabled():
        raise HTTPException(
            status_code=503, detail="AI service is not enabled"
        )

    template = request.template or ""

    return StreamingResponse(
        stream_chat_response(
            user_input=request.prompt,
            template=template,
            model_variant=request.model_variant,
            chat_file_ids=request.file_ids,
        ),
        media_type="application/x-ndjson",
    )


@router.post("/deep-research")
async def deep_research(
    request: AIGenerateRequest,
) -> StreamingResponse:
    """
    Generate content using DeepResearch project.

    Uses the DeepResearch project ID for enhanced research capabilities.
    Streams the response as NDJSON.
    """
    ask_service = get_ask_service()

    if not ask_service._is_enabled():
        raise HTTPException(
            status_code=503, detail="AI service is not enabled"
        )

    if not ask_service.dr_project_id:
        raise HTTPException(
            status_code=503,
            detail="DeepResearch is not configured"
        )

    template = request.template or ""

    return StreamingResponse(
        stream_chat_response(
            user_input=request.prompt,
            chat_id=request.chat_id,
            template=template,
            model_variant=request.model_variant,
            chat_file_ids=request.file_ids,
            parent_id=request.parent_id,
            project_id=ask_service.dr_project_id,
        ),
        media_type="application/x-ndjson",
    )


@router.post("/summarize")
async def summarize_note(
    request: AISummarizeRequest,
    note_service: NoteService = Depends(get_note_service),
) -> StreamingResponse:
    """
    Summarize a note's content.

    Streams the response as NDJSON.
    """
    ask_service = get_ask_service()

    if not ask_service._is_enabled():
        raise HTTPException(
            status_code=503, detail="AI service is not enabled"
        )

    # Get note content
    note = note_service.get_note(request.note_id)

    # Build summarization prompt
    length_instructions = {
        "short": "1-2文で簡潔に",
        "medium": "3-5文程度で",
        "long": "詳細に（7-10文程度で）",
    }
    style_instructions = {
        "bullet": "箇条書き形式で",
        "paragraph": "段落形式で",
    }

    length_inst = length_instructions.get(request.length, "3-5文程度で")
    style_inst = style_instructions.get(request.style, "段落形式で")

    focus_part = ""
    if request.focus:
        focus_part = f"特に「{request.focus}」に焦点を当てて"

    template = f"""以下の記事を{length_inst}{style_inst}要約してください。
{focus_part}

重要なポイントを漏らさず、読者が記事の核心を理解できるようにしてください。"""

    return StreamingResponse(
        stream_chat_response(
            user_input=note.content_md,
            template=template,
            chat_file_ids=request.additional_file_ids,
        ),
        media_type="application/x-ndjson",
    )


@router.post("/ask")
async def ask_question(
    request: AIAskRequest,
    note_service: NoteService = Depends(get_note_service),
) -> StreamingResponse:
    """
    Ask a question about a note's content.

    Supports multi-turn conversation via chatId and parentId.
    Streams the response as NDJSON.
    """
    ask_service = get_ask_service()

    if not ask_service._is_enabled():
        raise HTTPException(
            status_code=503, detail="AI service is not enabled"
        )

    # Get note content
    note = note_service.get_note(request.note_id)

    template = f"""以下の記事を参照して、ユーザーの質問に回答してください。

---記事内容---
{note.content_md}
---記事内容終わり---

回答は明確で具体的にしてください。記事に記載されていない情報については、
その旨を伝えてください。"""

    chat_id = str(request.chat_id) if request.chat_id else None

    return StreamingResponse(
        stream_chat_response(
            user_input=request.question,
            chat_id=chat_id,
            template=template,
            chat_file_ids=request.file_ids,
            parent_id=request.parent_id,
        ),
        media_type="application/x-ndjson",
    )


@router.post("/assist")
async def assist_content(
    request: AIAssistRequest,
) -> StreamingResponse:
    """
    Assist with content editing.

    Supports modes: improve, simplify, expand, translate, custom.
    Streams the response as NDJSON.
    """
    ask_service = get_ask_service()

    if not ask_service._is_enabled():
        raise HTTPException(
            status_code=503, detail="AI service is not enabled"
        )

    # Build template based on mode
    target_lang = request.target_language or "英語"
    custom_inst = request.custom_instructions or "以下のテキストを改善してください。"

    mode_templates = {
        "improve": """以下のテキストを改善してください。
- 文法や表現の誤りを修正
- 読みやすさを向上
- より自然な表現に

元のテキストの意図は保持してください。""",
        "simplify": """以下のテキストを簡潔にしてください。
- 冗長な表現を削除
- 要点を明確に
- 文章を短く

元の意味は保持してください。""",
        "expand": """以下のテキストを展開・詳細化してください。
- より詳しい説明を追加
- 具体例を追加
- 背景情報を補足

元の文脈と整合性を保ってください。""",
        "translate": f"""以下のテキストを{target_lang}に翻訳してください。
- 自然な表現を使用
- 元の意味を正確に伝える
- 文化的なニュアンスも考慮""",
        "custom": custom_inst,
        "weekly_report": """以下の週報メモと参照情報を元に、週報形式の要約を作成してください。

## 出力形式
以下のセクション構成でMarkdown形式で出力してください。各項目は箇条書きでまとめてください。

---

## 週報要約

### 実施内容
- 完了した作業・タスクを箇条書きで記載

### 進捗状況
- 各案件・プロジェクトの現在の進行状況

### 課題・困っていること
- 発生した問題や懸念事項（なければ「特になし」）

### 来週の予定
- 次週に予定している作業・タスク

## 注意事項
- 入力テキストに含まれるプロジェクト名やノート内容を参照して、具体的な内容を記載してください
- 簡潔かつ要点を押さえた記述にしてください
- 元の入力テキストはそのまま保持し、上記の要約のみを出力してください""",
    }

    template = mode_templates.get(request.mode, mode_templates["improve"])

    # Build user input with context for weekly_report mode
    user_input = request.content
    if request.mode == "weekly_report" and request.context:
        user_input = f"""## 週報メモ
{request.content}

## 参照情報
{request.context}"""

    return StreamingResponse(
        stream_chat_response(
            user_input=user_input,
            template=template,
            chat_file_ids=request.file_ids,
        ),
        media_type="application/x-ndjson",
    )


@router.post("/upload-file", response_model=FileUploadResponse)
async def upload_file_for_ai(
    file: UploadFile = File(...),
    chat_id: str = Form(...),
) -> FileUploadResponse:
    """
    Upload a file for use in AI chat.

    The file will be uploaded to ASK API's blob storage and processed.
    Returns the file_id to use in subsequent chat requests.
    """
    ask_service = get_ask_service()

    if not ask_service._is_enabled():
        raise HTTPException(
            status_code=503, detail="AI service is not enabled"
        )

    # Validate file
    if not file.filename:
        raise HTTPException(status_code=400, detail="Filename is required")

    # Read file content
    file_data = await file.read()

    # Determine content type
    content_type = file.content_type or "application/octet-stream"

    try:
        file_id = await ask_service.upload_file(
            file_data=file_data,
            filename=file.filename,
            content_type=content_type,
            chat_id=chat_id,
        )
        return FileUploadResponse(fileId=file_id)
    except FileUploadError as e:
        msg = f"File upload failed: {str(e)}"
        raise HTTPException(status_code=500, detail=msg)
    except FileProcessingError as e:
        msg = f"File processing failed: {str(e)}"
        raise HTTPException(status_code=500, detail=msg)
    except AskAPIError as e:
        raise HTTPException(status_code=e.status_code, detail=e.message)


@router.post("/folder/summarize")
async def summarize_folder(
    request: AIFolderSummarizeRequest,
    folder_repo: FolderRepository = Depends(get_folder_repo),
    note_repo: NoteRepository = Depends(get_note_repo),
) -> StreamingResponse:
    """Summarize all notes in a folder (including subfolders).

    Streams the response as NDJSON.
    """
    ask_service = get_ask_service()

    if not ask_service._is_enabled():
        raise HTTPException(
            status_code=503, detail="AI service is not enabled"
        )

    # Get folder
    folder = folder_repo.get_by_id(request.folder_id)
    if not folder:
        raise HTTPException(status_code=404, detail="フォルダが見つかりません")

    # Get all descendant folder IDs (including the folder itself)
    folder_ids = folder_repo.get_all_descendant_ids(request.folder_id)

    # Get all notes from these folders
    notes = note_repo.get_by_folder_ids(folder_ids)

    if not notes:
        raise HTTPException(
            status_code=400,
            detail="このフォルダにはノートがありません"
        )

    # Build combined content
    combined_content = build_folder_content(notes, folder.name)

    # Build summarization prompt
    length_instructions = {
        "short": "1-2段落で簡潔に",
        "medium": "3-5段落程度で",
        "long": "詳細に（セクション分けして）",
    }
    style_instructions = {
        "bullet": "箇条書き形式で",
        "paragraph": "段落形式で",
    }

    length_inst = length_instructions.get(request.length, "3-5段落程度で")
    style_inst = style_instructions.get(request.style, "段落形式で")

    focus_part = ""
    if request.focus:
        focus_part = f"特に「{request.focus}」に焦点を当てて"

    template = f"""以下はフォルダ内の複数のノートの内容です。
これらのノート全体を{length_inst}{style_inst}要約してください。
{focus_part}

各ノートの重要なポイントを統合し、フォルダ全体の概要が分かるようにしてください。
共通テーマや関連性があれば、それも含めてください。"""

    return StreamingResponse(
        stream_chat_response(
            user_input=combined_content,
            template=template,
            chat_file_ids=request.additional_file_ids,
        ),
        media_type="application/x-ndjson",
    )


@router.post("/folder/ask")
async def ask_folder_question(
    request: AIFolderAskRequest,
    folder_repo: FolderRepository = Depends(get_folder_repo),
    note_repo: NoteRepository = Depends(get_note_repo),
) -> StreamingResponse:
    """Ask a question about all notes in a folder (including subfolders).

    Supports multi-turn conversation via chatId and parentId.
    Streams the response as NDJSON.
    """
    ask_service = get_ask_service()

    if not ask_service._is_enabled():
        raise HTTPException(
            status_code=503, detail="AI service is not enabled"
        )

    # Get folder
    folder = folder_repo.get_by_id(request.folder_id)
    if not folder:
        raise HTTPException(status_code=404, detail="フォルダが見つかりません")

    # Get all descendant folder IDs (including the folder itself)
    folder_ids = folder_repo.get_all_descendant_ids(request.folder_id)

    # Get all notes from these folders
    notes = note_repo.get_by_folder_ids(folder_ids)

    if not notes:
        raise HTTPException(
            status_code=400,
            detail="このフォルダにはノートがありません"
        )

    # Build combined content
    combined_content = build_folder_content(notes, folder.name)

    template = f"""以下はフォルダ内の複数のノートの内容です。
これらのノートを参照して、ユーザーの質問に回答してください。

---フォルダ内容---
{combined_content}
---フォルダ内容終わり---

回答は明確で具体的にしてください。
どのノートから情報を得たかを示すと親切です。
ノートに記載されていない情報については、その旨を伝えてください。"""

    chat_id = str(request.chat_id) if request.chat_id else None

    return StreamingResponse(
        stream_chat_response(
            user_input=request.question,
            chat_id=chat_id,
            template=template,
            chat_file_ids=request.file_ids,
            parent_id=request.parent_id,
        ),
        media_type="application/x-ndjson",
    )


@router.post("/suggest-tags", response_model=AITagSuggestResponse)
async def suggest_tags(
    request: AITagSuggestRequest,
    tag_repo: TagRepository = Depends(get_tag_repo),
) -> AITagSuggestResponse:
    """
    Suggest tags for a note based on its content.

    Analyzes the note title and content using AI to suggest relevant tags.
    Prioritizes existing tags and proposes new ones when appropriate.
    """
    ask_service = get_ask_service()

    if not ask_service._is_enabled():
        raise HTTPException(
            status_code=503, detail="AI service is not enabled"
        )

    # Get existing tags
    existing_tags = tag_repo.get_all()
    existing_tag_names = [tag.name for tag in existing_tags]
    existing_tags_str = ", ".join(existing_tag_names) if existing_tag_names else "なし"

    # Build prompt for tag suggestion
    template = f"""あなたはナレッジベースのタグ付けを支援するアシスタントです。

以下のノート内容を分析し、適切なタグを{request.max_suggestions}個提案してください。

【既存タグリスト】
{existing_tags_str}

【指示】
1. 既存タグリストから優先的に選択してください
2. 既存タグに適切なものがない場合のみ、新規タグを提案してください
3. タグ名は簡潔で、検索しやすいものにしてください（100文字以内）
4. 各タグについて、なぜそのタグが適切かを簡潔に説明してください

【出力形式】
以下のJSON形式のみで出力してください（余計な説明は不要）:
{{"tags": [{{"name": "タグ名", "reason": "選択理由"}}]}}"""

    user_input = f"""【ノートタイトル】
{request.title}

【ノート本文】
{request.content}"""

    try:
        # Call AI API (non-streaming)
        response_text, _ = await ask_service.chat_simple(
            user_input=user_input,
            template=template,
        )

        # Parse JSON response
        suggestions = _parse_tag_suggestions(response_text, existing_tag_names)

        return AITagSuggestResponse(suggestions=suggestions)

    except AskAPIError as e:
        raise HTTPException(status_code=e.status_code, detail=e.message)
    except AskServiceError as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/project/ask")
async def ask_project_question(
    request: AIProjectAskRequest,
    project_service: ProjectService = Depends(get_project_service),
) -> StreamingResponse:
    """Ask a question about all notes in a project.

    Uses the project's notes as context for the AI to answer questions.
    Supports multi-turn conversation via chatId and parentId.
    Streams the response as NDJSON.
    """
    ask_service = get_ask_service()

    if not ask_service._is_enabled():
        raise HTTPException(
            status_code=503, detail="AI service is not enabled"
        )

    # Verify project exists and build context
    project = project_service.get_project(request.project_id)
    context = project_service.build_ai_context(request.project_id)

    template = f"""あなたは「{project.name}」プロジェクトのナレッジアシスタントです。
以下のプロジェクト関連ノートの内容を基に、ユーザーの質問に回答してください。
回答は正確かつ簡潔に行い、ノートに記載されていない情報については推測であることを明示してください。

{context}"""

    chat_id = str(request.chat_id) if request.chat_id else None

    return StreamingResponse(
        stream_chat_response(
            user_input=request.question,
            chat_id=chat_id,
            template=template,
            chat_file_ids=request.file_ids,
            parent_id=request.parent_id,
        ),
        media_type="application/x-ndjson",
    )


def _parse_tag_suggestions(
    response_text: str, existing_tag_names: list[str]
) -> list[TagSuggestion]:
    """Parse AI response and create TagSuggestion objects."""
    import re

    # Try to extract JSON from response
    json_match = re.search(r'\{[\s\S]*\}', response_text)
    if not json_match:
        return []

    try:
        data = json.loads(json_match.group())
        tags_data = data.get("tags", [])

        suggestions = []
        for tag in tags_data:
            name = tag.get("name", "").strip()
            reason = tag.get("reason", "")

            if name:
                is_existing = name in existing_tag_names
                suggestions.append(
                    TagSuggestion(
                        name=name,
                        reason=reason,
                        is_existing=is_existing,
                    )
                )

        return suggestions

    except json.JSONDecodeError:
        return []
