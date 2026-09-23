"""Health check endpoint."""
from datetime import datetime, timezone
from typing import Any, Dict
from fastapi import APIRouter
from app.core.config import settings

router = APIRouter(tags=["Health"])


@router.get("/api/health", summary="Service health and version status")
async def health_check() -> Dict[str, Any]:
    return {
        "status": "healthy",
        "version": settings.VERSION,
        "environment": settings.APP_ENV,
        "llm_provider": settings.LLM_PROVIDER,
        "demo_mode": settings.DEMO_MODE,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }
