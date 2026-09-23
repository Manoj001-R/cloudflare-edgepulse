"""Report generation service (JSON / Markdown / Export)."""
import json
from typing import Any, Dict
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.repositories import (
    AnalysisRepository,
    IncidentRepository,
    StepRepository,
    ToolResultRepository,
)
from app.utils.errors import IncidentNotFoundException


class ReportService:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def generate_full_report(self, incident_id: str) -> Dict[str, Any]:
        incident = await IncidentRepository.get_by_id(self.session, incident_id)
        if not incident:
            raise IncidentNotFoundException(incident_id)

        analysis = await AnalysisRepository.get_analysis(self.session, incident_id)
        steps = await StepRepository.get_steps(self.session, incident_id)
        results = await ToolResultRepository.get_results(self.session, incident_id)

        parsed_results = []
        for r in results:
            try:
                parsed_results.append(json.loads(r.result_json))
            except Exception:
                pass

        return {
            "incident": {
                "id": incident.incident_id,
                "url": incident.url,
                "problem": incident.problem_description,
                "type": incident.incident_type,
                "severity": incident.severity,
                "status": incident.status,
                "confidence": incident.confidence,
                "created_at": incident.created_at.isoformat(),
                "completed_at": incident.completed_at.isoformat() if incident.completed_at else None,
            },
            "analysis": {
                "summary": analysis.summary if analysis else None,
                "root_cause": analysis.root_cause if analysis else None,
                "confidence": analysis.confidence if analysis else None,
                "evidence": json.loads(analysis.evidence_json) if analysis else [],
                "recommendations": json.loads(analysis.recommendations_json) if analysis else [],
                "limitations": json.loads(analysis.limitations_json) if analysis else [],
            } if analysis else None,
            "timeline": [
                {
                    "step": s.step_number,
                    "tool": s.tool_name,
                    "status": s.status,
                    "duration_ms": s.duration_ms,
                    "summary": s.result_summary,
                }
                for s in steps
            ],
            "diagnostic_evidence": parsed_results,
        }
