import json
import uuid as uuid_module
from typing import List, Optional, Any
from uuid import UUID

from fastapi import APIRouter, Depends, Query, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.schemas.common import MessageResponse
from app.schemas.drawing import (
    DrawingCreate,
    DrawingUpdate,
    DrawingResponse,
    DrawingSummary,
    DrawingListResponse,
    ShareCreate,
    ShareResponse,
    ShareAccessRequest,
    SharedDrawingResponse,
    CommentCreate,
    CommentUpdate,
    CommentResponse,
    HistoryResponse,
    RollbackRequest,
)
from app.services.drawing_service import DrawingService
from app.services.ask_service import get_ask_service, AskServiceError


router = APIRouter()


def get_drawing_service(db: Session = Depends(get_db)) -> DrawingService:
    return DrawingService(db)


def drawing_to_summary(drawing) -> DrawingSummary:
    """Convert Drawing model to DrawingSummary schema."""
    return DrawingSummary(
        id=drawing.id,
        name=drawing.name,
        description=drawing.description,
        canvas_width=drawing.canvas_width,
        canvas_height=drawing.canvas_height,
        is_public=drawing.is_public,
        owner_name=drawing.owner_name,
        shape_count=len(drawing.shapes) if drawing.shapes else 0,
        created_at=drawing.created_at,
        updated_at=drawing.updated_at,
    )


def drawing_to_response(drawing) -> DrawingResponse:
    """Convert Drawing model to DrawingResponse schema."""
    return DrawingResponse(
        id=drawing.id,
        name=drawing.name,
        description=drawing.description,
        shapes=drawing.shapes or [],
        canvas_width=drawing.canvas_width,
        canvas_height=drawing.canvas_height,
        is_public=drawing.is_public,
        owner_id=drawing.owner_id,
        owner_name=drawing.owner_name,
        version=drawing.version,
        created_at=drawing.created_at,
        updated_at=drawing.updated_at,
    )


def share_to_response(share) -> ShareResponse:
    """Convert DrawingShare model to ShareResponse schema."""
    return ShareResponse(
        id=share.id,
        drawing_id=share.drawing_id,
        share_token=share.share_token,
        permission=share.permission,
        has_password=share.password_hash is not None,
        expires_at=share.expires_at,
        access_count=share.access_count,
        created_at=share.created_at,
    )


def comment_to_response(comment) -> CommentResponse:
    """Convert DrawingComment model to CommentResponse schema."""
    return CommentResponse(
        id=comment.id,
        drawing_id=comment.drawing_id,
        content=comment.content,
        shape_id=comment.shape_id,
        position_x=comment.position_x,
        position_y=comment.position_y,
        author_name=comment.author_name,
        author_color=comment.author_color,
        resolved=comment.resolved,
        created_at=comment.created_at,
        updated_at=comment.updated_at,
    )


def history_to_response(history) -> HistoryResponse:
    """Convert DrawingHistory model to HistoryResponse schema."""
    return HistoryResponse(
        id=history.id,
        drawing_id=history.drawing_id,
        action_type=history.action_type,
        action_data=history.action_data,
        actor_name=history.actor_name,
        actor_color=history.actor_color,
        version=history.version,
        created_at=history.created_at,
    )


# === Drawing CRUD ===

@router.get("", response_model=DrawingListResponse)
def list_drawings(
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    q: Optional[str] = Query(None),
    is_public: Optional[bool] = Query(None),
    service: DrawingService = Depends(get_drawing_service),
):
    """Get paginated list of drawings."""
    drawings, total = service.get_drawings(
        page=page,
        page_size=per_page,
        q=q,
        is_public=is_public,
    )

    pages = (total + per_page - 1) // per_page if per_page > 0 else 0

    return DrawingListResponse(
        items=[drawing_to_summary(d) for d in drawings],
        total=total,
        page=page,
        per_page=per_page,
        pages=pages,
    )


@router.post("", response_model=DrawingResponse, status_code=201)
def create_drawing(
    data: DrawingCreate,
    service: DrawingService = Depends(get_drawing_service),
):
    """Create a new drawing."""
    drawing = service.create_drawing(data)
    return drawing_to_response(drawing)


@router.get("/{drawing_id}", response_model=DrawingResponse)
def get_drawing(
    drawing_id: UUID,
    service: DrawingService = Depends(get_drawing_service),
):
    """Get a drawing by ID."""
    drawing = service.get_drawing(drawing_id)
    return drawing_to_response(drawing)


@router.put("/{drawing_id}", response_model=DrawingResponse)
def update_drawing(
    drawing_id: UUID,
    data: DrawingUpdate,
    service: DrawingService = Depends(get_drawing_service),
):
    """Update a drawing."""
    drawing = service.update_drawing(drawing_id, data)
    return drawing_to_response(drawing)


@router.delete("/{drawing_id}", response_model=MessageResponse)
def delete_drawing(
    drawing_id: UUID,
    service: DrawingService = Depends(get_drawing_service),
):
    """Delete a drawing."""
    service.delete_drawing(drawing_id)
    return MessageResponse(message="描画を削除しました")


# === Share Operations ===

@router.post("/{drawing_id}/share", response_model=ShareResponse, status_code=201)
def create_share(
    drawing_id: UUID,
    data: ShareCreate,
    service: DrawingService = Depends(get_drawing_service),
):
    """Create a share link for a drawing."""
    share = service.create_share(drawing_id, data)
    return share_to_response(share)


@router.get("/{drawing_id}/shares", response_model=List[ShareResponse])
def list_shares(
    drawing_id: UUID,
    service: DrawingService = Depends(get_drawing_service),
):
    """Get all share links for a drawing."""
    shares = service.get_shares(drawing_id)
    return [share_to_response(s) for s in shares]


@router.get("/shared/{token}", response_model=SharedDrawingResponse)
def access_shared_drawing(
    token: str,
    password: Optional[str] = Query(None),
    service: DrawingService = Depends(get_drawing_service),
):
    """Access a shared drawing by token."""
    share = service.get_share_by_token(token, password)
    drawing = share.drawing

    return SharedDrawingResponse(
        drawing=drawing_to_response(drawing),
        permission=share.permission,
        can_edit=share.can_edit,
    )


# === Comment Operations ===

@router.get("/{drawing_id}/comments", response_model=List[CommentResponse])
def list_comments(
    drawing_id: UUID,
    include_resolved: bool = Query(True),
    service: DrawingService = Depends(get_drawing_service),
):
    """Get all comments for a drawing."""
    comments = service.get_comments(drawing_id, include_resolved)
    return [comment_to_response(c) for c in comments]


@router.post(
    "/{drawing_id}/comments",
    response_model=CommentResponse,
    status_code=201
)
def create_comment(
    drawing_id: UUID,
    data: CommentCreate,
    service: DrawingService = Depends(get_drawing_service),
):
    """Create a comment on a drawing."""
    comment = service.create_comment(drawing_id, data)
    return comment_to_response(comment)


@router.put(
    "/{drawing_id}/comments/{comment_id}",
    response_model=CommentResponse
)
def update_comment(
    drawing_id: UUID,
    comment_id: UUID,
    data: CommentUpdate,
    service: DrawingService = Depends(get_drawing_service),
):
    """Update a comment."""
    comment = service.update_comment(drawing_id, comment_id, data)
    return comment_to_response(comment)


@router.delete(
    "/{drawing_id}/comments/{comment_id}",
    response_model=MessageResponse
)
def delete_comment(
    drawing_id: UUID,
    comment_id: UUID,
    service: DrawingService = Depends(get_drawing_service),
):
    """Delete a comment."""
    service.delete_comment(drawing_id, comment_id)
    return MessageResponse(message="コメントを削除しました")


# === History Operations ===

@router.get("/{drawing_id}/history", response_model=List[HistoryResponse])
def list_history(
    drawing_id: UUID,
    limit: int = Query(100, ge=1, le=500),
    service: DrawingService = Depends(get_drawing_service),
):
    """Get history for a drawing."""
    history = service.get_history(drawing_id, limit)
    return [history_to_response(h) for h in history]


@router.post("/{drawing_id}/rollback", response_model=DrawingResponse)
def rollback_drawing(
    drawing_id: UUID,
    data: RollbackRequest,
    service: DrawingService = Depends(get_drawing_service),
):
    """Rollback a drawing to a specific version."""
    drawing = service.rollback_to_version(drawing_id, data.version)
    return drawing_to_response(drawing)


# === AI Drawing Assistance ===

class AIShapeSuggestionRequest(BaseModel):
    """Request for AI shape suggestion."""
    prompt: str = Field(..., description="Description of shapes to generate")
    canvas_width: int = Field(default=800, description="Canvas width")
    canvas_height: int = Field(default=600, description="Canvas height")
    existing_shapes: List[dict] = Field(default_factory=list, description="Existing shapes on canvas")


class AIShapeSuggestionResponse(BaseModel):
    """Response with suggested shapes."""
    shapes: List[dict] = Field(..., description="Generated shapes")
    explanation: str = Field("", description="AI explanation of the suggestion")


class AILayoutOptimizeRequest(BaseModel):
    """Request for layout optimization."""
    shapes: List[dict] = Field(..., description="Shapes to optimize")
    canvas_width: int = Field(default=800, description="Canvas width")
    canvas_height: int = Field(default=600, description="Canvas height")
    optimization_type: str = Field(
        default="auto",
        description="Type of optimization: auto, align, distribute, compact"
    )


class AILayoutOptimizeResponse(BaseModel):
    """Response with optimized layout."""
    shapes: List[dict] = Field(..., description="Optimized shapes")
    changes: List[str] = Field(default_factory=list, description="List of changes made")


def generate_shapes_from_prompt(
    prompt: str,
    canvas_width: int,
    canvas_height: int
) -> List[dict]:
    """Generate shapes based on a text prompt.

    This is a simple rule-based generator. For more sophisticated generation,
    integrate with the ASK API.
    """
    shapes = []
    prompt_lower = prompt.lower()

    # Center of canvas
    center_x = canvas_width / 2
    center_y = canvas_height / 2

    # Parse common shape requests
    if "四角" in prompt_lower or "矩形" in prompt_lower or "rectangle" in prompt_lower or "rect" in prompt_lower:
        shapes.append({
            "id": str(uuid_module.uuid4()),
            "type": "rect",
            "x": center_x - 50,
            "y": center_y - 30,
            "width": 100,
            "height": 60,
            "stroke": "#4f46e5",
            "strokeWidth": 2,
            "fill": "#e0e7ff",
            "rotation": 0,
            "opacity": 1,
            "visible": True,
            "locked": False,
            "name": "Rectangle",
        })

    if "円" in prompt_lower or "丸" in prompt_lower or "circle" in prompt_lower:
        shapes.append({
            "id": str(uuid_module.uuid4()),
            "type": "circle",
            "x": center_x,
            "y": center_y,
            "radius": 40,
            "stroke": "#059669",
            "strokeWidth": 2,
            "fill": "#d1fae5",
            "rotation": 0,
            "opacity": 1,
            "visible": True,
            "locked": False,
            "name": "Circle",
        })

    if "矢印" in prompt_lower or "arrow" in prompt_lower:
        shapes.append({
            "id": str(uuid_module.uuid4()),
            "type": "arrow",
            "x": 0,
            "y": 0,
            "points": [center_x - 60, center_y, center_x + 60, center_y],
            "stroke": "#dc2626",
            "strokeWidth": 2,
            "fill": None,
            "rotation": 0,
            "opacity": 1,
            "visible": True,
            "locked": False,
            "name": "Arrow",
            "arrowStart": "none",
            "arrowEnd": "triangle",
        })

    if "線" in prompt_lower or "line" in prompt_lower:
        shapes.append({
            "id": str(uuid_module.uuid4()),
            "type": "line",
            "x": 0,
            "y": 0,
            "points": [center_x - 80, center_y, center_x + 80, center_y],
            "stroke": "#374151",
            "strokeWidth": 2,
            "fill": None,
            "rotation": 0,
            "opacity": 1,
            "visible": True,
            "locked": False,
            "name": "Line",
        })

    if "テキスト" in prompt_lower or "text" in prompt_lower or "文字" in prompt_lower:
        shapes.append({
            "id": str(uuid_module.uuid4()),
            "type": "text",
            "x": center_x - 50,
            "y": center_y - 10,
            "text": "テキスト",
            "stroke": "#1f2937",
            "strokeWidth": 0,
            "fill": None,
            "rotation": 0,
            "opacity": 1,
            "visible": True,
            "locked": False,
            "name": "Text",
            "fontSize": 16,
            "fontFamily": "sans-serif",
            "fontWeight": "normal",
            "fontStyle": "normal",
            "textAlign": "left",
        })

    if "フローチャート" in prompt_lower or "flowchart" in prompt_lower:
        # Generate a simple flowchart
        shapes = [
            # Start
            {
                "id": str(uuid_module.uuid4()),
                "type": "circle",
                "x": center_x,
                "y": center_y - 150,
                "radius": 30,
                "stroke": "#059669",
                "strokeWidth": 2,
                "fill": "#d1fae5",
                "rotation": 0,
                "opacity": 1,
                "visible": True,
                "locked": False,
                "name": "Start",
            },
            # Arrow 1
            {
                "id": str(uuid_module.uuid4()),
                "type": "arrow",
                "x": 0,
                "y": 0,
                "points": [center_x, center_y - 120, center_x, center_y - 80],
                "stroke": "#374151",
                "strokeWidth": 2,
                "fill": None,
                "rotation": 0,
                "opacity": 1,
                "visible": True,
                "locked": False,
                "name": "Arrow",
                "arrowStart": "none",
                "arrowEnd": "triangle",
            },
            # Process
            {
                "id": str(uuid_module.uuid4()),
                "type": "rect",
                "x": center_x - 60,
                "y": center_y - 80,
                "width": 120,
                "height": 50,
                "stroke": "#4f46e5",
                "strokeWidth": 2,
                "fill": "#e0e7ff",
                "rotation": 0,
                "opacity": 1,
                "visible": True,
                "locked": False,
                "name": "Process",
            },
            # Arrow 2
            {
                "id": str(uuid_module.uuid4()),
                "type": "arrow",
                "x": 0,
                "y": 0,
                "points": [center_x, center_y - 30, center_x, center_y + 10],
                "stroke": "#374151",
                "strokeWidth": 2,
                "fill": None,
                "rotation": 0,
                "opacity": 1,
                "visible": True,
                "locked": False,
                "name": "Arrow",
                "arrowStart": "none",
                "arrowEnd": "triangle",
            },
            # Decision (diamond using polygon)
            {
                "id": str(uuid_module.uuid4()),
                "type": "polygon",
                "x": center_x,
                "y": center_y + 50,
                "points": [0, -40, 50, 0, 0, 40, -50, 0],
                "stroke": "#f59e0b",
                "strokeWidth": 2,
                "fill": "#fef3c7",
                "rotation": 0,
                "opacity": 1,
                "visible": True,
                "locked": False,
                "name": "Decision",
                "closed": True,
            },
            # Arrow 3
            {
                "id": str(uuid_module.uuid4()),
                "type": "arrow",
                "x": 0,
                "y": 0,
                "points": [center_x, center_y + 90, center_x, center_y + 130],
                "stroke": "#374151",
                "strokeWidth": 2,
                "fill": None,
                "rotation": 0,
                "opacity": 1,
                "visible": True,
                "locked": False,
                "name": "Arrow",
                "arrowStart": "none",
                "arrowEnd": "triangle",
            },
            # End
            {
                "id": str(uuid_module.uuid4()),
                "type": "circle",
                "x": center_x,
                "y": center_y + 160,
                "radius": 30,
                "stroke": "#dc2626",
                "strokeWidth": 2,
                "fill": "#fee2e2",
                "rotation": 0,
                "opacity": 1,
                "visible": True,
                "locked": False,
                "name": "End",
            },
        ]

    if "ダイアグラム" in prompt_lower or "diagram" in prompt_lower or "構成図" in prompt_lower:
        # Generate a simple diagram
        shapes = [
            # Center box
            {
                "id": str(uuid_module.uuid4()),
                "type": "rect",
                "x": center_x - 50,
                "y": center_y - 30,
                "width": 100,
                "height": 60,
                "stroke": "#4f46e5",
                "strokeWidth": 2,
                "fill": "#e0e7ff",
                "rotation": 0,
                "opacity": 1,
                "visible": True,
                "locked": False,
                "name": "Main",
            },
            # Left box
            {
                "id": str(uuid_module.uuid4()),
                "type": "rect",
                "x": center_x - 200,
                "y": center_y - 30,
                "width": 80,
                "height": 60,
                "stroke": "#059669",
                "strokeWidth": 2,
                "fill": "#d1fae5",
                "rotation": 0,
                "opacity": 1,
                "visible": True,
                "locked": False,
                "name": "Left",
            },
            # Right box
            {
                "id": str(uuid_module.uuid4()),
                "type": "rect",
                "x": center_x + 120,
                "y": center_y - 30,
                "width": 80,
                "height": 60,
                "stroke": "#059669",
                "strokeWidth": 2,
                "fill": "#d1fae5",
                "rotation": 0,
                "opacity": 1,
                "visible": True,
                "locked": False,
                "name": "Right",
            },
            # Left arrow
            {
                "id": str(uuid_module.uuid4()),
                "type": "arrow",
                "x": 0,
                "y": 0,
                "points": [center_x - 120, center_y, center_x - 50, center_y],
                "stroke": "#374151",
                "strokeWidth": 2,
                "fill": None,
                "rotation": 0,
                "opacity": 1,
                "visible": True,
                "locked": False,
                "name": "Arrow",
                "arrowStart": "none",
                "arrowEnd": "triangle",
            },
            # Right arrow
            {
                "id": str(uuid_module.uuid4()),
                "type": "arrow",
                "x": 0,
                "y": 0,
                "points": [center_x + 50, center_y, center_x + 120, center_y],
                "stroke": "#374151",
                "strokeWidth": 2,
                "fill": None,
                "rotation": 0,
                "opacity": 1,
                "visible": True,
                "locked": False,
                "name": "Arrow",
                "arrowStart": "none",
                "arrowEnd": "triangle",
            },
        ]

    return shapes


def optimize_layout(
    shapes: List[dict],
    canvas_width: int,
    canvas_height: int,
    optimization_type: str
) -> tuple[List[dict], List[str]]:
    """Optimize the layout of shapes.

    Returns the optimized shapes and a list of changes made.
    """
    if not shapes:
        return shapes, []

    changes = []
    optimized = [dict(s) for s in shapes]  # Deep copy

    # Calculate bounds
    def get_shape_bounds(shape: dict) -> tuple[float, float, float, float]:
        """Get minX, minY, maxX, maxY for a shape."""
        shape_type = shape.get("type", "")
        x = shape.get("x", 0)
        y = shape.get("y", 0)

        if shape_type in ("rect", "image", "group"):
            w = shape.get("width", 0)
            h = shape.get("height", 0)
            return x, y, x + w, y + h
        elif shape_type in ("circle", "arc"):
            r = shape.get("radius", 0)
            return x - r, y - r, x + r, y + r
        elif shape_type in ("line", "arrow", "polygon", "freehand", "dimension"):
            points = shape.get("points", [])
            if len(points) >= 2:
                xs = [points[i] for i in range(0, len(points), 2)]
                ys = [points[i] for i in range(1, len(points), 2)]
                return x + min(xs), y + min(ys), x + max(xs), y + max(ys)
        elif shape_type == "text":
            # Approximate text bounds
            text = shape.get("text", "")
            font_size = shape.get("fontSize", 16)
            return x, y, x + len(text) * font_size * 0.6, y + font_size

        return x, y, x, y

    if optimization_type in ("auto", "compact"):
        # Move shapes to be more centered and compact
        bounds = [get_shape_bounds(s) for s in optimized]

        if bounds:
            min_x = min(b[0] for b in bounds)
            min_y = min(b[1] for b in bounds)
            max_x = max(b[2] for b in bounds)
            max_y = max(b[3] for b in bounds)

            content_width = max_x - min_x
            content_height = max_y - min_y

            # Center the content
            offset_x = (canvas_width - content_width) / 2 - min_x
            offset_y = (canvas_height - content_height) / 2 - min_y

            if abs(offset_x) > 5 or abs(offset_y) > 5:
                for shape in optimized:
                    shape["x"] = shape.get("x", 0) + offset_x
                    shape["y"] = shape.get("y", 0) + offset_y
                changes.append(f"図形をキャンバス中央に配置しました（移動: {offset_x:.0f}px, {offset_y:.0f}px）")

    if optimization_type in ("auto", "align"):
        # Try to align shapes that are close to being aligned
        threshold = 10  # pixels

        # Group shapes by approximate y position (horizontal alignment)
        y_groups: dict[int, List[dict]] = {}
        for shape in optimized:
            bounds = get_shape_bounds(shape)
            center_y = (bounds[1] + bounds[3]) / 2
            key = int(center_y / threshold) * threshold
            if key not in y_groups:
                y_groups[key] = []
            y_groups[key].append(shape)

        # Align shapes in each group
        for key, group in y_groups.items():
            if len(group) >= 2:
                bounds = [get_shape_bounds(s) for s in group]
                avg_center_y = sum((b[1] + b[3]) / 2 for b in bounds) / len(bounds)

                for i, shape in enumerate(group):
                    b = bounds[i]
                    current_center_y = (b[1] + b[3]) / 2
                    diff = avg_center_y - current_center_y
                    if abs(diff) > 1:
                        shape["y"] = shape.get("y", 0) + diff

                if len(group) >= 2:
                    changes.append(f"{len(group)}個の図形を水平方向に整列しました")

    return optimized, changes


@router.post("/ai/suggest-shapes", response_model=AIShapeSuggestionResponse)
async def suggest_shapes(
    request: AIShapeSuggestionRequest,
):
    """Generate shape suggestions based on a text prompt."""
    try:
        shapes = generate_shapes_from_prompt(
            request.prompt,
            request.canvas_width,
            request.canvas_height,
        )

        explanation = ""
        if shapes:
            shape_types = set(s.get("type", "") for s in shapes)
            explanation = f"「{request.prompt}」に基づいて{len(shapes)}個の図形を生成しました: {', '.join(shape_types)}"
        else:
            explanation = "指定されたプロンプトからは図形を生成できませんでした。「四角」「円」「矢印」「フローチャート」などのキーワードを試してください。"

        return AIShapeSuggestionResponse(
            shapes=shapes,
            explanation=explanation,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/ai/optimize-layout", response_model=AILayoutOptimizeResponse)
async def optimize_layout_endpoint(
    request: AILayoutOptimizeRequest,
):
    """Optimize the layout of shapes on the canvas."""
    try:
        optimized_shapes, changes = optimize_layout(
            request.shapes,
            request.canvas_width,
            request.canvas_height,
            request.optimization_type,
        )

        return AILayoutOptimizeResponse(
            shapes=optimized_shapes,
            changes=changes if changes else ["最適化の必要はありませんでした"],
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
