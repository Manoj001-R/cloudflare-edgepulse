"""Structured JSON logger for EdgePulse with secret sanitization."""
import json
import logging
import sys
from datetime import datetime, timezone
from typing import Any, Dict

# Sensitive keys that must never be printed to logs
SENSITIVE_KEYS = {
    "authorization",
    "api_key",
    "token",
    "secret",
    "password",
    "openai_api_key",
    "cloudflare_api_token",
    "cookie",
}


def sanitize_data(data: Any) -> Any:
    """Recursively sanitize sensitive values in dictionaries and lists."""
    if isinstance(data, dict):
        sanitized = {}
        for k, v in data.items():
            if any(s in str(k).lower() for s in SENSITIVE_KEYS):
                sanitized[k] = "[REDACTED]"
            else:
                sanitized[k] = sanitize_data(v)
        return sanitized
    elif isinstance(data, list):
        return [sanitize_data(item) for item in data]
    return data


class JSONFormatter(logging.Formatter):
    """Formats log records as structured JSON."""

    def format(self, record: logging.LogRecord) -> str:
        log_payload: Dict[str, Any] = {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
        }

        # Include structured extra attributes
        if hasattr(record, "extra_data") and isinstance(record.extra_data, dict):
            log_payload.update(sanitize_data(record.extra_data))

        # Handle exception info safely
        if record.exc_info:
            log_payload["exception"] = self.formatException(record.exc_info)

        return json.dumps(log_payload)


def setup_logger(name: str = "edgepulse") -> logging.Logger:
    """Configures and returns a structured logger."""
    logger = logging.getLogger(name)
    if not logger.handlers:
        handler = logging.StreamHandler(sys.stdout)
        handler.setFormatter(JSONFormatter())
        logger.addHandler(handler)
        logger.setLevel(logging.INFO)
    return logger


logger = setup_logger()


def log_event(event: str, incident_id: str | None = None, **kwargs: Any) -> None:
    """Helper for logging structured events."""
    extra = {"event": event}
    if incident_id:
        extra["incident_id"] = incident_id
    extra.update(kwargs)
    logger.info(event, extra={"extra_data": extra})
