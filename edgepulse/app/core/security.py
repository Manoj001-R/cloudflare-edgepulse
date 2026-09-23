"""Security middlewares and rate limiting utilities."""
import time
from collections import defaultdict
from typing import Dict, Tuple
from fastapi import HTTPException, Request, status
from app.core.config import settings
from app.core.logging import log_event


class InMemoryRateLimiter:
    """Sliding-window in-memory rate limiter per IP / endpoint."""

    def __init__(self):
        # key: (client_ip, endpoint) -> list of timestamps
        self._requests: Dict[Tuple[str, str], list[float]] = defaultdict(list)

    def check(self, client_ip: str, endpoint: str, max_requests: int, window_seconds: int = 60) -> bool:
        now = time.time()
        key = (client_ip, endpoint)
        # Prune older than window
        timestamps = [t for t in self._requests[key] if now - t < window_seconds]
        if len(timestamps) >= max_requests:
            return False
        timestamps.append(now)
        self._requests[key] = timestamps
        return True


rate_limiter = InMemoryRateLimiter()


def check_rate_limit(request: Request, endpoint_tag: str, limit: int) -> None:
    """Enforces rate limiting based on client host."""
    client_ip = request.client.host if request.client else "unknown"
    if not rate_limiter.check(client_ip, endpoint_tag, max_requests=limit, window_seconds=60):
        log_event("rate_limit_exceeded", client_ip=client_ip, endpoint=endpoint_tag)
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail={
                "error": {
                    "code": "RATE_LIMIT_EXCEEDED",
                    "message": f"Too many requests to {endpoint_tag}. Please wait a moment before retrying.",
                }
            },
        )
