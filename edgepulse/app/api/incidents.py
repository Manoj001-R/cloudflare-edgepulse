"""Incident API endpoints."""
import json
import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
from fastapi import APIRouter, BackgroundTasks, Depends, Query, Request, status
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.config import settings
from app.core.security import check_rate_limit
from app.db.database import get_db
from app.db.repositories import (
    AnalysisRepository,
    IncidentRepository,
    StepRepository,
    ToolResultRepository,
)
from app.schemas.incident import (
    IncidentCreateRequest,
    IncidentListResponse,
    IncidentResponse,
)
from app.services.investigation_service import InvestigationService
from app.services.report_service import ReportService
from app.utils.errors import IncidentNotFoundException
from app.utils.url_validator import validate_url

router = APIRouter(prefix="/api/incidents", tags=["Incidents"])


@router.post(
    "",
    response_model=Dict[str, Any],
    status_code=status.HTTP_201_CREATED,
    summary="Create and initiate an incident investigation",
)
async def create_incident(
    req: IncidentCreateRequest,
    background_tasks: BackgroundTasks,
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    check_rate_limit(request, "create_incident", settings.RATE_LIMIT_INCIDENT_PER_MINUTE)

    # Validate target URL and SSRF safety upfront
    valid_url = validate_url(req.url)

    # Generate sequential or UUID-based incident ID
    today_str = datetime.now(timezone.utc).strftime("%Y%m%d")
    random_suffix = str(uuid.uuid4().int)[:4]
    incident_id = f"INC-{today_str}-{random_suffix}"

    incident = await IncidentRepository.create(
        session=db,
        incident_id=incident_id,
        url=valid_url,
        problem_description=req.problem,
        status="created",
    )

    # Trigger async investigation orchestrator in background
    async def background_worker():
        from app.db.database import AsyncSessionLocal
        async with AsyncSessionLocal() as session:
            svc = InvestigationService(session)
            await svc.run_investigation(incident_id)

    background_tasks.add_task(background_worker)

    return {
        "success": True,
        "incident_id": incident.incident_id,
        "status": incident.status,
        "message": "Incident created and investigation queued.",
    }


@router.post(
    "/{incident_id}/start",
    summary="Start or re-trigger investigation for an incident",
)
async def start_investigation(
    incident_id: str,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
):
    incident = await IncidentRepository.get_by_id(db, incident_id)
    if not incident:
        raise IncidentNotFoundException(incident_id)

    async def background_worker():
        from app.db.database import AsyncSessionLocal
        async with AsyncSessionLocal() as session:
            svc = InvestigationService(session)
            await svc.run_investigation(incident_id)

    background_tasks.add_task(background_worker)

    return {"success": True, "incident_id": incident_id, "status": "investigating"}


@router.get("", response_model=IncidentListResponse, summary="List all incidents with filters")
async def list_incidents(
    search: Optional[str] = Query(None, description="Search by ID, URL, or problem description"),
    status: Optional[str] = Query(None, description="Filter by status"),
    severity: Optional[str] = Query(None, description="Filter by severity"),
    incident_type: Optional[str] = Query(None, description="Filter by category"),
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db),
):
    incidents, total = await IncidentRepository.list_incidents(
        session=db,
        search=search,
        status=status,
        severity=severity,
        incident_type=incident_type,
        limit=limit,
        offset=offset,
    )

    items = []
    for inc in incidents:
        analysis_dict = None
        if inc.analysis:
            analysis_dict = {
                "summary": inc.analysis.summary,
                "root_cause": inc.analysis.root_cause,
                "confidence": inc.analysis.confidence,
            }
        items.append(
            IncidentResponse(
                incident_id=inc.incident_id,
                url=inc.url,
                problem_description=inc.problem_description,
                incident_type=inc.incident_type,
                severity=inc.severity,
                status=inc.status,
                confidence=inc.confidence,
                created_at=inc.created_at,
                updated_at=inc.updated_at,
                completed_at=inc.completed_at,
                analysis=analysis_dict,
            )
        )

    return IncidentListResponse(incidents=items, total=total, limit=limit, offset=offset)


@router.get("/{incident_id}", summary="Get full incident details and analysis")
async def get_incident(incident_id: str, db: AsyncSession = Depends(get_db)):
    report_service = ReportService(db)
    full_report = await report_service.generate_full_report(incident_id)
    return {"success": True, "data": full_report}


@router.get("/{incident_id}/results", summary="Get raw diagnostic tool results")
async def get_incident_results(incident_id: str, db: AsyncSession = Depends(get_db)):
    incident = await IncidentRepository.get_by_id(db, incident_id)
    if not incident:
        raise IncidentNotFoundException(incident_id)

    results = await ToolResultRepository.get_results(db, incident_id)
    parsed = []
    for r in results:
        try:
            parsed.append(json.loads(r.result_json))
        except Exception:
            pass
    return {"success": True, "incident_id": incident_id, "results": parsed}


@router.get("/{incident_id}/steps", summary="Get investigation step timeline")
async def get_incident_steps(incident_id: str, db: AsyncSession = Depends(get_db)):
    incident = await IncidentRepository.get_by_id(db, incident_id)
    if not incident:
        raise IncidentNotFoundException(incident_id)

    steps = await StepRepository.get_steps(db, incident_id)
    return {"success": True, "incident_id": incident_id, "steps": steps}


@router.get("/{incident_id}/analysis", summary="Get AI root-cause analysis")
async def get_incident_analysis(incident_id: str, db: AsyncSession = Depends(get_db)):
    analysis = await AnalysisRepository.get_analysis(db, incident_id)
    if not analysis:
        raise IncidentNotFoundException(incident_id)

    return {
        "success": True,
        "incident_id": incident_id,
        "analysis": {
            "summary": analysis.summary,
            "root_cause": analysis.root_cause,
            "confidence": analysis.confidence,
            "evidence": json.loads(analysis.evidence_json),
            "recommendations": json.loads(analysis.recommendations_json),
            "limitations": json.loads(analysis.limitations_json),
            "created_at": analysis.created_at.isoformat(),
        },
    }
