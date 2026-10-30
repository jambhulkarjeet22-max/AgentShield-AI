"""Structured application logging with secret sanitization."""

import json
import logging
import re
import sys
from datetime import datetime, timezone
from typing import Any, Dict

# Keys that may contain sensitive data and should be masked
SENSITIVE_KEY_PATTERNS = re.compile(
    r"(password|token|secret|authorization|api[_-]?key|credentials|private[_-]?key|bearer)",
    re.IGNORECASE,
)

REDACTED_VALUE = "[REDACTED]"


def sanitize_data(data: Any) -> Any:
    """Recursively mask sensitive values in dicts, lists, or strings."""
    if isinstance(data, dict):
        sanitized = {}
        for key, value in data.items():
            if SENSITIVE_KEY_PATTERNS.search(str(key)):
                sanitized[key] = REDACTED_VALUE
            else:
                sanitized[key] = sanitize_data(value)
        return sanitized
    elif isinstance(data, list):
        return [sanitize_data(item) for item in data]
    elif isinstance(data, tuple):
        return tuple(sanitize_data(item) for item in data)
    elif isinstance(data, str):
        # Check for bearer tokens in strings (e.g. "Bearer eyJhbGciOi...")
        return re.sub(
            r"(Bearer\s+)[A-Za-z0-9\-._~+/]+=*",
            r"\1" + REDACTED_VALUE,
            data,
            flags=re.IGNORECASE,
        )
    return data


class SensitiveDataFilter(logging.Filter):
    """Logging filter that redacts sensitive information from log messages."""

    def filter(self, record: logging.LogRecord) -> bool:
        if isinstance(record.msg, str):
            record.msg = sanitize_data(record.msg)
        elif isinstance(record.msg, (dict, list)):
            record.msg = sanitize_data(record.msg)

        if record.args:
            if isinstance(record.args, dict):
                record.args = sanitize_data(record.args)
            elif isinstance(record.args, tuple):
                record.args = tuple(sanitize_data(arg) for arg in record.args)

        return True


class JSONLogFormatter(logging.Formatter):
    """Structured JSON log formatter."""

    def format(self, record: logging.LogRecord) -> str:
        log_entry: Dict[str, Any] = {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
        }

        # Include location details if in debug mode or error level
        if record.levelno >= logging.ERROR or record.levelno == logging.DEBUG:
            log_entry["module"] = record.module
            log_entry["func_name"] = record.funcName
            log_entry["line_no"] = record.lineno

        if record.exc_info:
            log_entry["exception"] = self.formatException(record.exc_info)

        # Include extra custom attributes attached to log record
        standard_attrs = {
            "name", "msg", "args", "levelname", "levelno", "pathname", "filename",
            "module", "exc_info", "exc_text", "stack_info", "lineno", "funcName",
            "created", "msecs", "relativeCreated", "thread", "threadName",
            "processName", "process", "message",
        }
        extras = {k: v for k, v in record.__dict__.items() if k not in standard_attrs}
        if extras:
            log_entry["extra"] = sanitize_data(extras)

        return json.dumps(log_entry, default=str)


def setup_logging(log_level: str = "INFO", log_format: str = "json") -> None:
    """Initialize structured logging for the application.

    Args:
        log_level: Log level name (e.g. DEBUG, INFO, WARNING, ERROR).
        log_format: Formatter style ('json' or 'text').
    """
    numeric_level = getattr(logging, log_level.upper(), logging.INFO)

    root_logger = logging.getLogger()
    root_logger.setLevel(numeric_level)

    # Clear existing handlers to prevent duplicate logs
    root_logger.handlers.clear()

    handler = logging.StreamHandler(sys.stdout)
    handler.setLevel(numeric_level)
    handler.addFilter(SensitiveDataFilter())

    if log_format.lower() == "text":
        formatter = logging.Formatter(
            fmt="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
            datefmt="%Y-%m-%d %H:%M:%S",
        )
    else:
        formatter = JSONLogFormatter()

    handler.setFormatter(formatter)
    root_logger.addHandler(handler)

    # Align standard web server loggers
    for logger_name in ("uvicorn", "uvicorn.error", "uvicorn.access", "fastapi"):
        lib_logger = logging.getLogger(logger_name)
        lib_logger.handlers.clear()
        lib_logger.addHandler(handler)
        lib_logger.setLevel(numeric_level)
        lib_logger.propagate = False


def get_logger(name: str) -> logging.Logger:
    """Get a named logger with the application defaults."""
    return logging.getLogger(name)

