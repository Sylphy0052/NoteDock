from typing import Any, Optional
from fastapi import HTTPException, Request
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from pydantic import BaseModel


class ErrorDetail(BaseModel):
    """Error detail model."""
    code: str
    message: str
    details: Optional[dict[str, Any]] = None


class ErrorResponse(BaseModel):
    """Standard error response format."""
    error: ErrorDetail


class AppException(HTTPException):
    """Base application exception."""

    def __init__(
        self,
        status_code: int,
        code: str,
        message: str,
        details: Optional[dict[str, Any]] = None
    ):
        self.code = code
        self.message = message
        self.details = details
        super().__init__(status_code=status_code, detail=message)


class NotFoundError(AppException):
    """Resource not found error."""

    def __init__(self, resource: str, resource_id: Any):
        super().__init__(
            status_code=404,
            code="NOT_FOUND",
            message=f"{resource}が見つかりません",
            details={"resource": resource, "id": str(resource_id)}
        )


class ValidationError(AppException):
    """Validation error."""

    def __init__(self, message: str, details: Optional[dict[str, Any]] = None):
        super().__init__(
            status_code=400,
            code="VALIDATION_ERROR",
            message=message,
            details=details
        )


class ConflictError(AppException):
    """Resource conflict error."""

    def __init__(self, message: str, details: Optional[dict[str, Any]] = None):
        super().__init__(
            status_code=409,
            code="CONFLICT",
            message=message,
            details=details
        )


class InternalError(AppException):
    """Internal server error."""

    def __init__(self, message: str = "サーバー内部エラーが発生しました"):
        super().__init__(
            status_code=500,
            code="INTERNAL_ERROR",
            message=message
        )


async def app_exception_handler(request: Request, exc: AppException) -> JSONResponse:
    """Handle application exceptions."""
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "error": {
                "code": exc.code,
                "message": exc.message,
                "details": exc.details
            }
        }
    )


async def validation_exception_handler(
    request: Request, exc: RequestValidationError
) -> JSONResponse:
    """Handle Pydantic validation errors."""
    details: dict[str, list[str]] = {}
    for error in exc.errors():
        field = ".".join(str(loc) for loc in error["loc"] if loc != "body")
        if field not in details:
            details[field] = []
        details[field].append(error["msg"])

    return JSONResponse(
        status_code=400,
        content={
            "error": {
                "code": "VALIDATION_ERROR",
                "message": "入力内容に誤りがあります",
                "details": details
            }
        }
    )


async def generic_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    """Handle unexpected exceptions."""
    return JSONResponse(
        status_code=500,
        content={
            "error": {
                "code": "INTERNAL_ERROR",
                "message": "サーバー内部エラーが発生しました",
                "details": None
            }
        }
    )
