"""Diagnostics and Tool manual execution endpoints."""
from typing import Any, Dict
from fastapi import APIRouter, Depends, Request
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.config import settings
from app.core.security import check_rate_limit
from app.db.database import get_db
from app.schemas.analysis import ReplayResponse
from app.schemas.diagnostics import ToolTestRequest
from app.services.analysis_service import AnalysisService
from app.tools.registry import get_all_tool_names, get_tool

router = APIRouter(prefix="/api", tags=["Diagnostics & Replay"])


@router.post(
    "/incidents/{incident_id}/replay",
    response_model=ReplayResponse,
    summary="Re-execute diagnostic probes and compare with previous benchmark results",
)
async def replay_incident(
    incident_id: str,
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    check_rate_limit(request, "replay_incident", settings.RATE_LIMIT_INCIDENT_PER_MINUTE)
    svc = AnalysisService(db)
    return await svc.replay_incident(incident_id)


@router.post(
    "/tools/test",
    response_model=Dict[str, Any],
    summary="Manually execute a single allowlisted diagnostic tool",
)
async def test_tool(
    req: ToolTestRequest,
    request: Request,
):
    check_rate_limit(request, "test_tool", settings.RATE_LIMIT_TOOLS_PER_MINUTE)
    tool = get_tool(req.tool)
    result = await tool.run(req.url)
    return {"success": True, "result": result}


@router.get("/tools", summary="List all available allowlisted diagnostic tools")
async def list_tools():
    return {"success": True, "tools": get_all_tool_names()}
