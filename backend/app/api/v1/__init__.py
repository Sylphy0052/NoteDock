from app.api.v1.ai import router as ai_router
from app.api.v1.comments import router as comments_router
from app.api.v1.companies import router as companies_router
from app.api.v1.drafts import router as drafts_router
from app.api.v1.drawings import router as drawings_router
from app.api.v1.files import router as files_router
from app.api.v1.folders import router as folders_router
from app.api.v1.import_export import router as import_export_router
from app.api.v1.linkmap import router as linkmap_router
from app.api.v1.notes import router as notes_router
from app.api.v1.projects import router as projects_router
from app.api.v1.search import router as search_router
from app.api.v1.settings import router as settings_router
from app.api.v1.tags import router as tags_router
from app.api.v1.templates import router as templates_router

__all__ = [
    "ai_router",
    "comments_router",
    "companies_router",
    "drafts_router",
    "drawings_router",
    "files_router",
    "folders_router",
    "import_export_router",
    "linkmap_router",
    "notes_router",
    "projects_router",
    "search_router",
    "settings_router",
    "tags_router",
    "templates_router",
]
