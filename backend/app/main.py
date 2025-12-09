from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.exceptions import RequestValidationError

from app.core.config import get_settings
from app.core.logging import log_info
from app.core.errors import (
    AppException,
    app_exception_handler,
    validation_exception_handler,
    generic_exception_handler,
)

settings = get_settings()

app = FastAPI(
    title=settings.app_name,
    description="Markdown-based knowledge management system for IT teams",
    version="0.1.0",
    docs_url="/api/docs",
    redoc_url="/api/redoc",
    openapi_url="/api/openapi.json",
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:3001"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Exception handlers
app.add_exception_handler(AppException, app_exception_handler)
app.add_exception_handler(RequestValidationError, validation_exception_handler)
app.add_exception_handler(Exception, generic_exception_handler)


@app.on_event("startup")
async def startup_event() -> None:
    """Application startup event."""
    log_info(f"Starting {settings.app_name} in {settings.app_env} mode")


@app.on_event("shutdown")
async def shutdown_event() -> None:
    """Application shutdown event."""
    log_info(f"Shutting down {settings.app_name}")


@app.get("/api/health")
async def health_check() -> dict[str, str]:
    """Health check endpoint."""
    return {"status": "ok"}


# API routers
from app.api.v1 import (
    notes_router,
    folders_router,
    tags_router,
    files_router,
    comments_router,
    linkmap_router,
    search_router,
    import_export_router,
    templates_router,
    drafts_router,
)

app.include_router(notes_router, prefix="/api", tags=["notes"])
app.include_router(folders_router, prefix="/api", tags=["folders"])
app.include_router(tags_router, prefix="/api", tags=["tags"])
app.include_router(files_router, prefix="/api", tags=["files"])
app.include_router(comments_router, prefix="/api", tags=["comments"])
app.include_router(linkmap_router, prefix="/api", tags=["linkmap"])
app.include_router(search_router, prefix="/api", tags=["search"])
app.include_router(import_export_router, prefix="/api", tags=["import_export"])
app.include_router(templates_router, prefix="/api", tags=["templates"])
app.include_router(drafts_router, prefix="/api", tags=["drafts"])
