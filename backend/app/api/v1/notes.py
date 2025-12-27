import urllib.parse
from datetime import datetime
from typing import Any, List, Optional

from fastapi import (
    APIRouter,
    BackgroundTasks,
    Depends,
    HTTPException,
    Query,
    Request,
    Response,
)
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.schemas.common import MessageResponse
from app.schemas.note import (
    FileResponse,
    FolderResponse,
    NoteCreate,
    NoteHiddenFromHomeUpdate,
    NoteListResponse,
    NotePinUpdate,
    NoteReadonlyUpdate,
    NoteResponse,
    NoteSummary,
    NoteSummaryHover,
    NoteUpdate,
    TagResponse,
)
from app.schemas.project import ProjectResponse
from app.schemas.company import CompanyResponse
from app.services.activity_log_service import ActivityLogService
from app.services.discord_service import get_discord_service
from app.services.file_service import FileService
from app.services.import_export_service import ImportExportService
from app.services.linkmap_service import LinkmapService
from app.services.note_service import NoteService
from app.services.settings_service import SettingsService
from app.utils.markdown import extract_toc, generate_summary

router = APIRouter()


def get_note_service(db: Session = Depends(get_db)) -> NoteService:
    return NoteService(db)


def get_activity_log_service(db: Session = Depends(get_db)) -> ActivityLogService:
    return ActivityLogService(db)


def get_linkmap_service(db: Session = Depends(get_db)) -> LinkmapService:
    return LinkmapService(db)


def get_file_service(db: Session = Depends(get_db)) -> FileService:
    return FileService(db)


def get_import_export_service(db: Session = Depends(get_db)) -> ImportExportService:
    """Dependency to get ImportExportService instance."""
    return ImportExportService(db)


def get_client_ip(request: Request) -> str:
    """Get client IP address from request."""
    forwarded = request.headers.get("X-Forwarded-For")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else "unknown"


def note_to_summary(note: Any) -> NoteSummary:
    """Convert Note model to NoteSummary schema."""
    return NoteSummary(
        id=note.id,
        title=note.title,
        updated_at=note.updated_at,
        tags=[TagResponse(id=t.id, name=t.name) for t in note.tags],
        folder_id=note.folder_id,
        folder_name=note.folder.name if note.folder else None,
        project_id=note.project_id,
        project_name=note.project.name if note.project else None,
        is_pinned=note.is_pinned,
        is_readonly=note.is_readonly,
        is_hidden_from_home=note.is_hidden_from_home,
        cover_file_url=(
            f"/api/files/{note.cover_file_id}/preview"
            if note.cover_file_id
            else None
        ),
        created_by=note.created_by,
        view_count=note.view_count,
    )


def _build_project_response(project: Any) -> Optional[ProjectResponse]:
    """Build ProjectResponse from project model."""
    if not project:
        return None

    company_response = None
    if project.company:
        company_response = CompanyResponse(
            id=project.company.id,
            name=project.company.name,
            created_at=project.company.created_at,
            updated_at=project.company.updated_at,
            project_count=0,  # Not needed for nested response
        )

    return ProjectResponse(
        id=project.id,
        name=project.name,
        company_id=project.company_id,
        company=company_response,
        created_at=project.created_at,
        updated_at=project.updated_at,
        note_count=0,  # Not needed for nested response
    )


def note_to_response(note: Any) -> NoteResponse:
    """Convert Note model to NoteResponse schema."""
    return NoteResponse(
        id=note.id,
        title=note.title,
        content_md=note.content_md,
        folder_id=note.folder_id,
        folder=(
            FolderResponse(
                id=note.folder.id,
                name=note.folder.name,
                parent_id=note.folder.parent_id,
            )
            if note.folder
            else None
        ),
        project_id=note.project_id,
        project=_build_project_response(note.project),
        is_pinned=note.is_pinned,
        is_readonly=note.is_readonly,
        is_hidden_from_home=note.is_hidden_from_home,
        cover_file_id=note.cover_file_id,
        cover_file_url=(
            f"/api/files/{note.cover_file_id}/preview"
            if note.cover_file_id
            else None
        ),
        created_at=note.created_at,
        updated_at=note.updated_at,
        deleted_at=note.deleted_at,
        created_by=note.created_by,
        updated_by=note.updated_by,
        view_count=note.view_count,
        tags=[TagResponse(id=t.id, name=t.name) for t in note.tags],
        files=[
            FileResponse(
                id=f.id,
                original_name=f.original_name,
                mime_type=f.mime_type,
                size_bytes=f.size_bytes,
            )
            for f in note.files
        ],
    )


@router.get("/notes", response_model=NoteListResponse)
def get_notes(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    q: Optional[str] = Query(None, description="検索キーワード"),
    tag: Optional[str] = Query(None, description="タグでフィルタ"),
    folder_id: Optional[int] = Query(None, description="フォルダIDでフィルタ"),
    project_id: Optional[int] = Query(None, description="プロジェクトIDでフィルタ"),
    is_pinned: Optional[bool] = Query(None, description="ピン留め状態でフィルタ"),
    is_hidden_from_home: Optional[bool] = Query(
        None, description="ホーム非表示状態でフィルタ"
    ),
    sort_by_pinned: bool = Query(True, description="ピン留めを優先してソート"),
    sort_by: str = Query(
        "updated_at", description="ソート項目 (updated_at, created_at)"
    ),
    service: NoteService = Depends(get_note_service),
) -> NoteListResponse:
    """ノート一覧を取得"""
    notes, total = service.get_notes(
        page=page,
        page_size=page_size,
        q=q,
        tag=tag,
        folder_id=folder_id,
        project_id=project_id,
        is_pinned=is_pinned,
        is_hidden_from_home=is_hidden_from_home,
        sort_by_pinned=sort_by_pinned,
        sort_by=sort_by,
    )
    return NoteListResponse(
        items=[note_to_summary(note) for note in notes],
        total=total,
        page=page,
        page_size=page_size,
    )


@router.get("/notes/{note_id}", response_model=NoteResponse)
def get_note(
    note_id: int,
    service: NoteService = Depends(get_note_service),
) -> NoteResponse:
    """ノート詳細を取得"""
    note = service.get_note(note_id)
    # Increment view count
    service.increment_view_count(note_id)
    return note_to_response(note)


@router.post("/notes", response_model=NoteResponse, status_code=201)
async def create_note(
    data: NoteCreate,
    request: Request,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    service: NoteService = Depends(get_note_service),
    log_service: ActivityLogService = Depends(get_activity_log_service),
    linkmap_service: LinkmapService = Depends(get_linkmap_service),
) -> NoteResponse:
    """ノートを作成"""
    note = service.create_note(data)

    # Update note links for linkmap
    if data.content_md:
        linkmap_service.update_note_links(note.id, data.content_md)

    # Log activity
    log_service.log_note_created(
        note_id=note.id,
        ip_address=get_client_ip(request),
    )

    # Discord notification (background task) - check settings first
    settings_service = SettingsService(db)
    if settings_service.is_discord_notify_on_create_enabled():
        discord_service = get_discord_service()

        async def send_notification() -> None:
            await discord_service.notify_note_created(note.id, note.title)

        background_tasks.add_task(send_notification)

    return note_to_response(note)


@router.put("/notes/{note_id}", response_model=NoteResponse)
async def update_note(
    note_id: int,
    data: NoteUpdate,
    request: Request,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    service: NoteService = Depends(get_note_service),
    log_service: ActivityLogService = Depends(get_activity_log_service),
    linkmap_service: LinkmapService = Depends(get_linkmap_service),
) -> NoteResponse:
    """ノートを更新"""
    note = service.update_note(note_id, data)

    # Update note links for linkmap
    if data.content_md is not None:
        linkmap_service.update_note_links(note.id, data.content_md)

    # Log activity
    log_service.log_note_updated(
        note_id=note.id,
        ip_address=get_client_ip(request),
    )

    # Discord notification (background task) - check settings first
    settings_service = SettingsService(db)
    if settings_service.is_discord_notify_on_update_enabled():
        discord_service = get_discord_service()

        async def send_notification() -> None:
            await discord_service.notify_note_updated(note.id, note.title)

        background_tasks.add_task(send_notification)

    return note_to_response(note)


@router.delete("/notes/{note_id}", response_model=MessageResponse)
def delete_note(
    note_id: int,
    request: Request,
    service: NoteService = Depends(get_note_service),
    log_service: ActivityLogService = Depends(get_activity_log_service),
) -> MessageResponse:
    """ノートをゴミ箱に移動"""
    service.delete_note(note_id)

    # Log activity
    log_service.log_note_deleted(
        note_id=note_id,
        ip_address=get_client_ip(request),
    )

    return MessageResponse(message="ノートをゴミ箱に移動しました")


@router.post("/notes/{note_id}/restore", response_model=NoteResponse)
def restore_note(
    note_id: int,
    request: Request,
    service: NoteService = Depends(get_note_service),
    log_service: ActivityLogService = Depends(get_activity_log_service),
) -> NoteResponse:
    """ノートをゴミ箱から復元"""
    note = service.restore_note(note_id)

    # Log activity
    log_service.log_note_restored(
        note_id=note.id,
        ip_address=get_client_ip(request),
    )

    return note_to_response(note)


@router.delete("/notes/{note_id}/permanent", response_model=MessageResponse)
def permanent_delete_note(
    note_id: int,
    service: NoteService = Depends(get_note_service),
) -> MessageResponse:
    """ノートを完全に削除"""
    service.hard_delete_note(note_id)
    return MessageResponse(message="ノートを完全に削除しました")


@router.post("/notes/{note_id}/duplicate", response_model=NoteResponse, status_code=201)
def duplicate_note(
    note_id: int,
    request: Request,
    service: NoteService = Depends(get_note_service),
    log_service: ActivityLogService = Depends(get_activity_log_service),
) -> NoteResponse:
    """ノートを複製"""
    note = service.duplicate_note(note_id)

    # Log activity
    log_service.log_note_duplicated(
        note_id=note.id,
        ip_address=get_client_ip(request),
    )

    return note_to_response(note)


@router.patch("/notes/{note_id}/pin", response_model=NoteResponse)
def toggle_note_pin(
    note_id: int,
    data: NotePinUpdate,
    service: NoteService = Depends(get_note_service),
) -> NoteResponse:
    """ノートのピン留め状態を変更"""
    note = service.toggle_pin(note_id, data.is_pinned)
    return note_to_response(note)


@router.patch("/notes/{note_id}/readonly", response_model=NoteResponse)
def toggle_note_readonly(
    note_id: int,
    data: NoteReadonlyUpdate,
    service: NoteService = Depends(get_note_service),
) -> NoteResponse:
    """ノートの閲覧専用状態を変更"""
    note = service.toggle_readonly(note_id, data.is_readonly)
    return note_to_response(note)


@router.patch("/notes/{note_id}/hidden-from-home", response_model=NoteResponse)
def toggle_note_hidden_from_home(
    note_id: int,
    data: NoteHiddenFromHomeUpdate,
    service: NoteService = Depends(get_note_service),
) -> NoteResponse:
    """ノートのホーム非表示状態を変更"""
    note = service.toggle_hidden_from_home(note_id, data.is_hidden_from_home)
    return note_to_response(note)


# Trash endpoints
@router.get("/trash", response_model=NoteListResponse)
def get_trash(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    service: NoteService = Depends(get_note_service),
) -> NoteListResponse:
    """ゴミ箱のノート一覧を取得"""
    notes, total = service.get_notes(
        page=page,
        page_size=page_size,
        include_deleted=True,
    )
    return NoteListResponse(
        items=[note_to_summary(note) for note in notes],
        total=total,
        page=page,
        page_size=page_size,
    )


# TOC & Summary endpoints
class TocItem(BaseModel):
    id: str
    text: str


@router.get("/notes/{note_id}/toc", response_model=List[TocItem])
def get_note_toc(
    note_id: int,
    service: NoteService = Depends(get_note_service),
) -> List[TocItem]:
    """ノートの目次（h2見出し）を取得"""
    note = service.get_note(note_id)
    toc_items = extract_toc(note.content_md)
    return [TocItem(id=item.id, text=item.text) for item in toc_items]


@router.get("/notes/{note_id}/summary", response_model=NoteSummaryHover)
def get_note_summary(
    note_id: int,
    service: NoteService = Depends(get_note_service),
) -> NoteSummaryHover:
    """ノートのサマリーを取得（ホバープレビュー用）"""
    note = service.get_note(note_id)
    summary = generate_summary(note.content_md)
    return NoteSummaryHover(
        id=note.id,
        title=note.title,
        summary=summary,
        updated_at=note.updated_at,
    )


# Export endpoint
@router.get("/notes/{note_id}/export/md")
def export_note_as_markdown(
    note_id: int,
    service: ImportExportService = Depends(get_import_export_service),
) -> Response:
    """
    Export a single note as a Markdown file.

    Returns the note content as a .md file download with frontmatter.
    The filename is derived from the note title.

    Args:
        note_id: ID of the note to export.
        service: ImportExportService instance.

    Returns:
        Response with Markdown content and appropriate headers.

    Raises:
        HTTPException: 404 if note not found or deleted.
    """
    try:
        md_content, filename = service.export_single_note_as_markdown(note_id)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))

    # RFC 5987形式でUTF-8ファイル名をエンコード
    encoded_filename = urllib.parse.quote(filename, safe="")

    # ASCII safe filename for older clients
    ascii_filename = filename.encode("ascii", "replace").decode("ascii")

    return Response(
        content=md_content.encode("utf-8"),
        media_type="text/markdown; charset=utf-8",
        headers={
            "Content-Disposition": (
                f'attachment; filename="{ascii_filename}"; '
                f"filename*=UTF-8''{encoded_filename}"
            )
        },
    )


# Version endpoints
class NoteVersionResponse(BaseModel):
    id: int
    version_no: int
    title: str
    content_md: str
    created_at: datetime

    class Config:
        from_attributes = True


class NoteVersionBrief(BaseModel):
    id: int
    version_no: int
    title: str
    created_at: datetime

    class Config:
        from_attributes = True


@router.get("/notes/{note_id}/versions", response_model=List[NoteVersionBrief])
def get_note_versions(
    note_id: int,
    service: NoteService = Depends(get_note_service),
) -> List[NoteVersionBrief]:
    """ノートのバージョン履歴を取得"""
    versions = service.get_versions(note_id)
    return [
        NoteVersionBrief(
            id=v.id,
            version_no=v.version_no,
            title=v.title,
            created_at=v.created_at,
        )
        for v in versions
    ]


@router.get(
    "/notes/{note_id}/versions/{version_no}", response_model=NoteVersionResponse
)
def get_note_version(
    note_id: int,
    version_no: int,
    service: NoteService = Depends(get_note_service),
) -> NoteVersionResponse:
    """特定バージョンの内容を取得"""
    version = service.get_version(note_id, version_no)
    return NoteVersionResponse(
        id=version.id,
        version_no=version.version_no,
        title=version.title,
        content_md=version.content_md,
        created_at=version.created_at,
    )


@router.post(
    "/notes/{note_id}/versions/{version_no}/restore", response_model=NoteResponse
)
def restore_note_version(
    note_id: int,
    version_no: int,
    request: Request,
    service: NoteService = Depends(get_note_service),
    log_service: ActivityLogService = Depends(get_activity_log_service),
) -> NoteResponse:
    """特定バージョンに復元"""
    note = service.restore_version(note_id, version_no)

    # Log activity
    log_service.log_version_restored(
        note_id=note.id,
        ip_address=get_client_ip(request),
    )

    return note_to_response(note)


# ============================================
# Edit Lock Endpoints
# ============================================


class EditLockRequest(BaseModel):
    """Request body for edit lock operations."""

    locked_by: str
    force: bool = False


class EditLockResponse(BaseModel):
    """Response for edit lock operations."""

    success: bool
    message: str
    locked_by: Optional[str] = None


class EditLockStatusResponse(BaseModel):
    """Response for edit lock status check."""

    is_locked: bool
    locked_by: Optional[str] = None
    locked_at: Optional[datetime] = None


@router.get("/notes/{note_id}/lock", response_model=EditLockStatusResponse)
def check_edit_lock(
    note_id: int,
    service: NoteService = Depends(get_note_service),
) -> EditLockStatusResponse:
    """編集ロック状態を確認"""
    result = service.check_edit_lock(note_id)
    return EditLockStatusResponse(
        is_locked=result["is_locked"],
        locked_by=result["locked_by"],
        locked_at=result["locked_at"],
    )


@router.post("/notes/{note_id}/lock", response_model=EditLockResponse)
def acquire_edit_lock(
    note_id: int,
    data: EditLockRequest,
    service: NoteService = Depends(get_note_service),
) -> EditLockResponse:
    """編集ロックを取得"""
    result = service.acquire_edit_lock(
        note_id=note_id,
        locked_by=data.locked_by,
        force=data.force,
    )
    return EditLockResponse(
        success=result["success"],
        message=result["message"],
        locked_by=result.get("locked_by"),
    )


@router.delete("/notes/{note_id}/lock", response_model=EditLockResponse)
def release_edit_lock(
    note_id: int,
    locked_by: str = Query(..., description="ロック所有者の表示名"),
    service: NoteService = Depends(get_note_service),
) -> EditLockResponse:
    """編集ロックを解除"""
    result = service.release_edit_lock(note_id=note_id, locked_by=locked_by)
    return EditLockResponse(
        success=result["success"],
        message=result["message"],
    )


@router.patch("/notes/{note_id}/lock/refresh", response_model=EditLockResponse)
def refresh_edit_lock(
    note_id: int,
    data: EditLockRequest,
    service: NoteService = Depends(get_note_service),
) -> EditLockResponse:
    """編集ロックを更新（タイムアウト延長）"""
    result = service.refresh_edit_lock(note_id=note_id, locked_by=data.locked_by)
    return EditLockResponse(
        success=result["success"],
        message=result["message"],
    )


# ============================================
# File Attachment Endpoints
# ============================================


@router.post("/notes/{note_id}/files/{file_id}", response_model=MessageResponse)
def attach_file_to_note(
    note_id: int,
    file_id: int,
    file_service: FileService = Depends(get_file_service),
) -> MessageResponse:
    """ファイルをノートに添付"""
    file_service.attach_file_to_note(file_id, note_id)
    return MessageResponse(message="ファイルを添付しました")


@router.delete("/notes/{note_id}/files/{file_id}", response_model=MessageResponse)
def detach_file_from_note(
    note_id: int,
    file_id: int,
    file_service: FileService = Depends(get_file_service),
) -> MessageResponse:
    """ノートからファイルの添付を解除"""
    file_service.detach_file_from_note(file_id, note_id)
    return MessageResponse(message="ファイルの添付を解除しました")
