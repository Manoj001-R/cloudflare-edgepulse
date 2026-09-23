"""Investigation Orchestrator Service."""
import asyncio
import time
from datetime import datetime, timezone
from typing import Any, Dict, List
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.logging import log_event
from app.db.repositories import (
    AnalysisRepository,
    IncidentRepository,
    StepRepository,
    ToolResultRepository,
)
from app.schemas.investigation import IncidentTriage
from app.services.llm.factory import LLMProviderFactory
from app.tools.registry import get_tool
from app.utils.url_validator import validate_url


class InvestigationService:
    def __init__(self, session: AsyncSession):
        self.session = session
        self.llm = LLMProviderFactory.get_provider()

    async def run_investigation(self, incident_id: str) -> None:
        """Complete asynchronous orchestration of the incident investigation."""
        incident = await IncidentRepository.get_by_id(self.session, incident_id)
        if not incident:
            log_event("investigation_aborted_not_found", incident_id=incident_id)
            return

        log_event("investigation_started", incident_id=incident_id, url=incident.url)

        try:
            # Step 1: Validate URL and check SSRF
            valid_url = validate_url(incident.url)

            # Step 2: Update status to planning
            await IncidentRepository.update_status(self.session, incident_id, status="planning")

            # Step 3: LLM Triage
            triage: IncidentTriage = await self.llm.triage_incident(
                url=valid_url,
                problem_description=incident.problem_description,
            )

            # Step 4: Save triage results
            await IncidentRepository.update_status(
                self.session,
                incident_id=incident_id,
                status="investigating",
                incident_type=triage.incident_type,
                severity=triage.severity,
            )

            # Step 5: Schedule investigation steps
            await StepRepository.create_steps(
                self.session,
                incident_id=incident_id,
                tools=triage.selected_tools,
            )

            # Mark all steps as running
            now_start = datetime.now(timezone.utc)
            for t_name in triage.selected_tools:
                await StepRepository.update_step(
                    self.session,
                    incident_id=incident_id,
                    tool_name=t_name,
                    status="running",
                    started_at=now_start,
                )

            # Step 6: Execute selected diagnostic tools concurrently in async runtime
            async def run_single_tool(tool_name: str) -> Dict[str, Any]:
                t0 = time.perf_counter()
                try:
                    tool_instance = get_tool(tool_name)
                    res = await tool_instance.run(valid_url)
                    dur = round((time.perf_counter() - t0) * 1000, 2)
                    res["duration_ms"] = dur
                    return res
                except Exception as e:
                    dur = round((time.perf_counter() - t0) * 1000, 2)
                    return {"tool": tool_name, "success": False, "error": str(e), "duration_ms": dur}

            tasks = [run_single_tool(t) for t in triage.selected_tools]
            diagnostic_results = await asyncio.gather(*tasks)

            # Record all tool results and step status in DB
            completed_time = datetime.now(timezone.utc)
            for res_payload in diagnostic_results:
                tool_name = res_payload.get("tool", "unknown")
                is_success = res_payload.get("success", False)
                duration_ms = res_payload.get("duration_ms", 0.0)
                error_msg = res_payload.get("error")

                # Save tool result
                await ToolResultRepository.save_result(
                    self.session,
                    incident_id=incident_id,
                    tool_name=tool_name,
                    success=is_success,
                    result_payload=res_payload,
                )

                # Update step in DB
                summary = f"Completed in {duration_ms}ms" if is_success else f"Probe failed: {error_msg or 'Unknown error'}"
                await StepRepository.update_step(
                    self.session,
                    incident_id=incident_id,
                    tool_name=tool_name,
                    status="completed" if is_success else "failed",
                    completed_at=completed_time,
                    duration_ms=duration_ms,
                    result_summary=summary,
                    error=error_msg,
                )

            # Step 7: Transition to analysis phase
            await IncidentRepository.update_status(self.session, incident_id, status="analyzing")

            # Step 8: Perform AI Root Cause Analysis
            analysis_result = await self.llm.analyze_incident(
                url=valid_url,
                problem_description=incident.problem_description,
                triage=triage,
                evidence=diagnostic_results,
            )

            # Step 9: Save analysis and mark incident completed
            await AnalysisRepository.save_analysis(
                self.session,
                incident_id=incident_id,
                root_cause=analysis_result.root_cause,
                summary=analysis_result.summary,
                confidence=analysis_result.confidence,
                evidence=analysis_result.evidence,
                recommendations=analysis_result.recommendations,
                limitations=analysis_result.limitations,
            )

            completed_at = datetime.now(timezone.utc)
            await IncidentRepository.update_status(
                self.session,
                incident_id=incident_id,
                status="completed",
                confidence=analysis_result.confidence,
                completed_at=completed_at,
            )

            log_event(
                "investigation_completed",
                incident_id=incident_id,
                confidence=analysis_result.confidence,
                root_cause=analysis_result.root_cause,
            )

        except Exception as e:
            log_event("investigation_failed", incident_id=incident_id, error=str(e))
            await IncidentRepository.update_status(
                self.session,
                incident_id=incident_id,
                status="failed",
            )
