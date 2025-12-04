from app.api.v1.notes import router as notes_router
from app.api.v1.folders import router as folders_router
from app.api.v1.tags import router as tags_router
from app.api.v1.files import router as files_router
from app.api.v1.comments import router as comments_router
from app.api.v1.linkmap import router as linkmap_router
from app.api.v1.search import router as search_router
from app.api.v1.import_export import router as import_export_router

__all__ = [
    "notes_router",
    "folders_router",
    "tags_router",
    "files_router",
    "comments_router",
    "linkmap_router",
    "search_router",
    "import_export_router",
]
