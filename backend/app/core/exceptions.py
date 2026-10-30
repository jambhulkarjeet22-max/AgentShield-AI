"""Centralized exception handling and custom application exceptions."""

import logging
from typing import Any, Dict, Optional
from fastapi import FastAPI, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

logger = logging.getLogger("agentshield.exceptions")


class AppException(Exception):
    """Base application exception for AgentShield AI."""

    def __init__(
        self,
        message: str = "An unexpected error occurred",
        status_code: int = status.HTTP_500_INTERNAL_SERVER_ERROR,
        details: Optional[Dict[str, Any]] = None,
    ):
        super().__init__(message)
        self.message = message
        self.status_code = status_code
        self.details = details or {}


class NotFoundError(AppException):
    """Resource not found exception."""

    def __init__(self, message: str = "Resource not found", details: Optional[Dict[str, Any]] = None):
        super().__init__(message=message, status_code=status.HTTP_404_NOT_FOUND, details=details)


class ValidationError(AppException):
    """Business logic or parameter validation exception."""

    def __init__(self, message: str = "Validation failed", details: Optional[Dict[str, Any]] = None):
        super().__init__(message=message, status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, details=details)


class SecurityError(AppException):
    """Cybersecurity, permission, or policy violation exception."""

    def __init__(self, message: str = "Action denied by security policy", details: Optional[Dict[str, Any]] = None):
        super().__init__(message=message, status_code=status.HTTP_403_FORBIDDEN, details=details)


class AuthenticationError(AppException):
    """Authentication required or invalid credentials exception."""

    def __init__(self, message: str = "Authentication required", details: Optional[Dict[str, Any]] = None):
        super().__init__(message=message, status_code=status.HTTP_401_UNAUTHORIZED, details=details)


class ServiceUnavailableError(AppException):
    """Downstream or internal service unavailable exception."""

    def __init__(self, message: str = "Service temporarily unavailable", details: Optional[Dict[str, Any]] = None):
        super().__init__(message=message, status_code=status.HTTP_503_SERVICE_UNAVAILABLE, details=details)


def format_error_response(
    status_code: int,
    message: str,
    details: Optional[Any] = None,
) -> Dict[str, Any]:
    """Standardize error response JSON payload."""
    payload: Dict[str, Any] = {
        "success": False,
        "error": {
            "code": status_code,
            "message": message,
        },
    }
    if details:
        payload["error"]["details"] = details
    return payload


async def app_exception_handler(request: Request, exc: AppException) -> JSONResponse:
    """Handle custom application exceptions."""
    logger.warning(
        "Application exception on %s %s: %s (code=%d)",
        request.method,
        request.url.path,
        exc.message,
        exc.status_code,
        extra={"details": exc.details},
    )
    return JSONResponse(
        status_code=exc.status_code,
        content=format_error_response(exc.status_code, exc.message, exc.details),
    )


async def http_exception_handler(request: Request, exc: StarletteHTTPException) -> JSONResponse:
    """Handle standard Starlette / FastAPI HTTPExceptions."""
    message = str(exc.detail) if exc.detail else "HTTP error"
    logger.warning(
        "HTTP %d on %s %s: %s",
        exc.status_code,
        request.method,
        request.url.path,
        message,
    )
    return JSONResponse(
        status_code=exc.status_code,
        content=format_error_response(exc.status_code, message),
    )


async def validation_exception_handler(request: Request, exc: RequestValidationError) -> JSONResponse:
    """Handle request schema validation errors cleanly."""
    errors = []
    for err in exc.errors():
        clean_err = {
            "loc": [str(x) for x in err.get("loc", [])],
            "msg": err.get("msg", "Invalid input"),
            "type": err.get("type", "validation_error"),
        }
        errors.append(clean_err)

    logger.warning(
        "Validation error on %s %s: %d issues",
        request.method,
        request.url.path,
        len(errors),
    )
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content=format_error_response(
            status.HTTP_422_UNPROCESSABLE_ENTITY,
            "Request validation failed",
            details=errors,
        ),
    )


async def unhandled_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    """Handle unexpected server errors without leaking stack traces or secrets."""
    logger.exception(
        "Unhandled server error on %s %s: %s",
        request.method,
        request.url.path,
        str(exc),
    )
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content=format_error_response(
            status.HTTP_500_INTERNAL_SERVER_ERROR,
            "An internal server error occurred",
        ),
    )


def register_exception_handlers(app: FastAPI) -> None:
    """Register all centralized exception handlers to the FastAPI app."""
    app.add_exception_handler(AppException, app_exception_handler)
    app.add_exception_handler(StarletteHTTPException, http_exception_handler)
    app.add_exception_handler(RequestValidationError, validation_exception_handler)
    app.add_exception_handler(Exception, unhandled_exception_handler)

