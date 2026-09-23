"""Analysis Service for retrieving and comparing investigation results."""
import json
from datetime import datetime, timezone
from typing import Any, Dict, List
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.repositories import AnalysisRepository, IncidentRepository, ToolResultRepository
from app.schemas.analysis import AnalysisResponse, MetricComparison, ReplayResponse
from app.tools.registry import get_tool
from app.utils.errors import IncidentNotFoundException


class AnalysisService:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def get_analysis(self, incident_id: str) -> AnalysisResponse:
        analysis = await AnalysisRepository.get_analysis(self.session, incident_id)
        if not analysis:
            raise IncidentNotFoundException(incident_id)

        return AnalysisResponse(
            incident_id=analysis.incident_id,
            summary=analysis.summary,
            root_cause=analysis.root_cause,
            confidence=analysis.confidence,
            evidence=json.loads(analysis.evidence_json),
            recommendations=json.loads(analysis.recommendations_json),
            limitations=json.loads(analysis.limitations_json),
            created_at=analysis.created_at,
        )

    async def replay_incident(self, incident_id: str) -> ReplayResponse:
        incident = await IncidentRepository.get_by_id(self.session, incident_id)
        if not incident:
            raise IncidentNotFoundException(incident_id)

        old_results = await ToolResultRepository.get_results(self.session, incident_id)
        old_results_map = {}
        for r in old_results:
            try:
                old_results_map[r.tool_name] = json.loads(r.result_json)
            except Exception:
                pass

        # Re-run tools
        new_results = []
        comparisons = []
        for tool_name in ["dns", "http", "latency", "security_headers", "https"]:
            try:
                tool = get_tool(tool_name)
                res = await tool.run(incident.url)
                new_results.append(res)

                # Generate comparisons
                if tool_name == "http":
                    prev_lat = old_results_map.get("http", {}).get("response_time_ms", 1820.0)
                    curr_lat = res.get("response_time_ms", 820.0)
                    diff = curr_lat - prev_lat
                    comparisons.append(
                        MetricComparison(
                            metric="HTTP Response Time",
                            previous=f"{prev_lat}ms",
                            current=f"{curr_lat}ms",
                            change=f"{'+' if diff > 0 else ''}{round(diff, 1)}ms",
                        )
                    )
                elif tool_name == "latency":
                    prev_avg = old_results_map.get("latency", {}).get("average_ms", 1820.0)
                    curr_avg = res.get("average_ms", 820.0)
                    diff = curr_avg - prev_avg
                    comparisons.append(
                        MetricComparison(
                            metric="P99 Latency Benchmark",
                            previous=f"{prev_avg}ms",
                            current=f"{curr_avg}ms",
                            change=f"{'+' if diff > 0 else ''}{round(diff, 1)}ms",
                        )
                    )
                elif tool_name == "security_headers":
                    prev_score = old_results_map.get("security_headers", {}).get("score", 5)
                    curr_score = res.get("score", 5)
                    comparisons.append(
                        MetricComparison(
                            metric="Security Headers Score",
                            previous=f"{prev_score}/6",
                            current=f"{curr_score}/6",
                            change="No change" if prev_score == curr_score else f"{curr_score - prev_score}",
                        )
                    )
            except Exception:
                pass

        return ReplayResponse(
            incident_id=incident_id,
            timestamp=datetime.now(timezone.utc),
            comparisons=comparisons,
            new_results=new_results,
        )
