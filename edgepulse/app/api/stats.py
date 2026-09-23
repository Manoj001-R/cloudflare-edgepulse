"""Dashboard statistics API endpoint."""
from typing import Any, Dict
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.database import get_db
from app.db.repositories import StatsRepository

router = APIRouter(prefix="/api/stats", tags=["Stats"])


@router.get("", summary="Get global incident metrics and SRE platform health stats")
async def get_stats(db: AsyncSession = Depends(get_db)) -> Dict[str, Any]:
    stats_data = await StatsRepository.get_stats(db)
    return {"success": True, "data": stats_data}
