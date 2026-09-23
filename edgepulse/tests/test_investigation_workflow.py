"""Tests for the complete investigation workflow orchestration."""
import pytest
from app.core.config import settings
from app.db.repositories import AnalysisRepository, IncidentRepository, StepRepository, ToolResultRepository
from app.services.investigation_service import InvestigationService
from tests.conftest import TestSessionLocal, run_async, setup_test_db, teardown_test_db


def test_full_investigation_workflow(monkeypatch):
    monkeypatch.setattr(settings, "DEMO_MODE", True)

    async def _test():
        await setup_test_db()
        async with TestSessionLocal() as session:
            incident_id = "INC-TEST-0001"
            url = "https://example.com"
            problem = "Users report high latency and 504 timeouts."

            # Step 1: Create incident in DB
            await IncidentRepository.create(
                session=session,
                incident_id=incident_id,
                url=url,
                problem_description=problem,
                status="created",
            )

            # Step 2: Run Investigation Orchestrator
            service = InvestigationService(session)
            await service.run_investigation(incident_id)

            # Verify Incident state
            updated_incident = await IncidentRepository.get_by_id(session, incident_id)
            assert updated_incident is not None
            assert updated_incident.status == "completed"
            assert updated_incident.incident_type == "latency"
            assert updated_incident.severity == "high"
            assert updated_incident.confidence == 0.84

            # Verify Steps recorded
            steps = await StepRepository.get_steps(session, incident_id)
            assert len(steps) == 5
            for s in steps:
                assert s.status == "completed"
                assert s.tool_name in ["dns", "http", "latency", "security_headers", "https"]

            # Verify Tool Results recorded
            results = await ToolResultRepository.get_results(session, incident_id)
            assert len(results) == 5

            # Verify Analysis generated
            analysis = await AnalysisRepository.get_analysis(session, incident_id)
            assert analysis is not None
            assert "Origin" in analysis.root_cause or "origin" in analysis.root_cause
            assert analysis.confidence == 0.84

        await teardown_test_db()

    run_async(_test())
