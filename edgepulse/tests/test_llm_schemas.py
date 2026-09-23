"""Tests for Pydantic LLM triage and analysis schemas."""
import pytest
from app.schemas.analysis import AnalysisResult
from app.schemas.investigation import IncidentTriage


def test_triage_valid_schema():
    data = {
        "incident_type": "latency",
        "severity": "high",
        "reasoning_summary": "Users report slow response time.",
        "selected_tools": ["dns", "http", "latency"],
    }
    triage = IncidentTriage.model_validate(data)
    assert triage.incident_type == "latency"
    assert triage.severity == "high"
    assert triage.selected_tools == ["dns", "http", "latency"]


def test_triage_rejects_disallowed_tools():
    data = {
        "incident_type": "security",
        "severity": "critical",
        "reasoning_summary": "WAF triggered",
        "selected_tools": ["dns", "arbitrary_port_scan", "bash_exec"],
    }
    with pytest.raises(ValueError):
        IncidentTriage.model_validate(data)


def test_analysis_result_schema():
    data = {
        "summary": "Website is slow.",
        "root_cause": "Origin server CPU bottleneck",
        "confidence": 0.84,
        "evidence": ["HTTP response time was 1820ms"],
        "recommendations": ["Scale origin web server instances"],
        "limitations": ["Database query locks were not directly inspected"],
    }
    analysis = AnalysisResult.model_validate(data)
    assert analysis.confidence == 0.84
    assert len(analysis.evidence) == 1
    assert len(analysis.recommendations) == 1
