"""
Comprehensive Pytest suite for EdgePulse Python.
Tests:
1. SSRF prevention and URL validation
2. Diagnostic tools (DNS, HTTP, Latency, Headers, Reachability)
3. Pydantic schemas (Triage, Analysis, Recommendations)
4. SQLite durable storage
5. End-to-end agent investigation, replay, and follow-up chat
"""

import os
import tempfile
import pytest

from edgepulse.validator import validate_url, is_blocked_ip
from edgepulse.llm import LlmClient
from edgepulse.schemas import (
    TriageResponse,
    AnalysisResponse,
    Finding,
    RecommendedAction,
    ALLOWED_TOOLS,
)
from edgepulse.tools import (
    check_dns,
    check_http,
    check_latency,
    check_security_headers,
    check_https_reachability,
)
from edgepulse.storage import Storage
from edgepulse.agent import IncidentAgent


# ─── 1. SSRF Protection Tests ─────────────────────────────────────

def test_validator_accepts_valid_public_urls():
    for url in ["https://example.com", "http://cloudflare.com/path?query=1", "https://1.1.1.1"]:
        res = validate_url(url)
        assert res.valid is True, f"Expected {url} to be valid"
        assert res.error is None


def test_validator_rejects_empty_or_malformed():
    assert validate_url("").valid is False
    assert validate_url("ftp://example.com").valid is False
    assert validate_url("file:///etc/passwd").valid is False
    assert validate_url("https://user:pass@example.com").valid is False


def test_validator_blocks_private_ipv4():
    blocked_ips = [
        "http://127.0.0.1",
        "http://127.0.0.53",
        "http://10.0.0.1",
        "http://172.16.0.1",
        "http://172.31.255.255",
        "http://192.168.1.1",
        "http://169.254.169.254",
        "http://0.0.0.0",
        "http://100.64.0.1",
    ]
    for url in blocked_ips:
        res = validate_url(url)
        assert res.valid is False, f"Expected {url} to be blocked by SSRF protection"
        assert "private or reserved" in res.error or "Blocked" in res.error


def test_validator_blocks_ipv6_private():
    blocked_v6 = [
        "http://[::1]",
        "http://[fc00::1]",
        "http://[fe80::1]",
    ]
    for url in blocked_v6:
        res = validate_url(url)
        assert res.valid is False, f"Expected {url} to be blocked"


def test_validator_blocks_internal_hostnames():
    blocked_hosts = [
        "http://localhost",
        "http://localhost.localdomain",
        "http://kubernetes.default.svc",
        "http://metadata.google.internal",
        "http://service.internal",
        "http://router.local",
    ]
    for url in blocked_hosts:
        res = validate_url(url)
        assert res.valid is False, f"Expected {url} to be blocked"


def test_validator_blocks_cloud_metadata_paths():
    blocked_paths = [
        "http://example.com/latest/meta-data",
        "http://example.com/metadata/v1/instance",
        "http://example.com/computeMetadata/v1",
    ]
    for url in blocked_paths:
        res = validate_url(url)
        assert res.valid is False, f"Expected {url} to be blocked"


def test_validator_blocks_restricted_ports():
    for port in [22, 23, 25, 3306, 5432, 6379, 27017]:
        res = validate_url(f"http://example.com:{port}")
        assert res.valid is False, f"Expected port {port} to be blocked"


# ─── 2. Diagnostic Tools Tests ────────────────────────────────────

def test_check_dns_demo():
    res = check_dns("https://example.com", demo=True)
    assert res.status == "healthy"
    assert res.tool == "check_dns"
    assert res.recordCount == 3
    assert len(res.records) == 3
    assert res.records[0].type == "A"


def test_check_http_demo():
    res = check_http("https://example.com", demo=True)
    assert res.status == "healthy"
    assert res.tool == "check_http"
    assert res.httpStatus == 200
    assert res.redirectCount == 0


def test_check_latency_demo():
    res = check_latency("https://example.com", demo=True)
    assert res.status == "warning"
    assert res.tool == "check_latency"
    assert res.latencyMs == 1450
    assert res.classification == "high"


def test_check_security_headers_demo():
    res = check_security_headers("https://example.com", demo=True)
    assert res.status == "healthy"
    assert res.score == 5
    assert res.maxScore == 6
    assert "Strict-Transport-Security" in res.present
    assert "Content-Security-Policy" in res.missing


def test_check_https_reachability_demo():
    res = check_https_reachability("https://example.com", demo=True)
    assert res.status == "healthy"
    assert res.httpsSupported is True
    assert res.redirectsToHttps is True


# ─── 3. Pydantic Schemas Tests ────────────────────────────────────

def test_triage_schema_valid():
    data = {
        "incidentType": "latency",
        "severity": "high",
        "reason": "User reports high response times",
        "investigationPlan": ["check_dns", "check_http", "check_latency"],
    }
    triage = TriageResponse.model_validate(data)
    assert triage.incidentType == "latency"
    assert triage.severity == "high"
    assert len(triage.investigationPlan) == 3


def test_triage_schema_rejects_invalid_tool():
    data = {
        "incidentType": "latency",
        "severity": "high",
        "reason": "Run bash script",
        "investigationPlan": ["execute_bash", "check_http"],
    }
    # Validator filters out unallowed tools
    triage = TriageResponse.model_validate(data)
    assert "execute_bash" not in triage.investigationPlan
    assert "check_http" in triage.investigationPlan


def test_analysis_schema_valid():
    data = {
        "summary": "Observed high HTTP latency with normal DNS resolution",
        "incidentType": "latency",
        "severity": "high",
        "findings": [
            {"signal": "HTTP Latency", "value": 1450, "interpretation": "Elevated latency"},
            {"signal": "DNS", "value": "Healthy", "interpretation": "Resolved normally"},
        ],
        "likelyRootCause": "Application origin compute bottleneck",
        "confidence": 0.85,
        "recommendedActions": [
            {
                "problem": "High latency",
                "evidence": "1450ms probe time",
                "likelyCause": "Compute bottleneck",
                "action": "Profile database queries and enable caching",
                "risk": "Low",
                "validation": "Rerun latency check",
            }
        ],
        "limitations": ["Probed externally only"],
    }
    analysis = AnalysisResponse.model_validate(data)
    assert analysis.confidence == 0.85
    assert len(analysis.findings) == 2
    assert len(analysis.recommendedActions) == 1


# ─── 4. Storage Tests ─────────────────────────────────────────────

def test_storage_crud_lifecycle():
    f = tempfile.NamedTemporaryFile(suffix=".db", delete=False)
    db_path = f.name
    f.close()

    try:
        storage = Storage(db_path=db_path)
        inc = storage.create_incident("INC-TEST-001", "https://example.com", "Site is slow")
        assert inc["id"] == "INC-TEST-001"
        assert inc["status"] == "created"

        storage.update_incident("INC-TEST-001", status="completed", confidence=0.88, severity="high")
        updated = storage.get_incident("INC-TEST-001")
        assert updated["status"] == "completed"
        assert updated["confidence"] == 0.88

        # Messages
        storage.add_message("INC-TEST-001", "user", "Why is it slow?")
        msgs = storage.get_messages("INC-TEST-001")
        assert len(msgs) == 1
        assert msgs[0]["content"] == "Why is it slow?"

        # Tool results
        storage.save_tool_result("INC-TEST-001", "check_dns", {"status": "healthy", "durationMs": 45})
        results = storage.get_tool_results("INC-TEST-001")
        assert len(results) == 1
        assert results[0]["result"]["status"] == "healthy"

        # Analysis
        storage.save_analysis("INC-TEST-001", {
            "summary": "Test summary",
            "likelyRootCause": "Test root cause",
            "confidence": 0.9,
        })
        ana = storage.get_analysis("INC-TEST-001")
        assert ana["likelyRootCause"] == "Test root cause"

    finally:
        if os.path.exists(db_path):
            os.remove(db_path)


# ─── 5. LLM Fallback Safety ─────────────────────────────────────

def test_llm_falls_back_to_demo_without_credentials():
    client = LlmClient(provider="openai", api_key=None, model="gpt-4o-mini")
    assert client.provider == "demo"
    triage = client.triage("system prompt", "Target is slow")
    assert triage.incidentType in {"latency", "mixed", "http", "unknown"}
    assert triage.investigationPlan


# ─── 6. End-to-End Agent Investigation ────────────────────────────

def test_agent_investigation_demo():
    f = tempfile.NamedTemporaryFile(suffix=".db", delete=False)
    db_path = f.name
    f.close()

    try:
        storage = Storage(db_path=db_path)
        agent = IncidentAgent(storage=storage, demo_mode=True)

        result = agent.investigate(
            target_url="https://example.com",
            user_question="The site is loading very slowly and users are experiencing delays",
        )

        assert result["incident"] is not None
        incident_id = result["incident"]["id"]
        assert incident_id.startswith("INC-")
        assert result["incident"]["status"] == "completed"
        assert result["triage"]["incidentType"] == "latency"
        assert len(result["tool_results"]) >= 3
        assert result["analysis"]["likelyRootCause"] != ""
        assert result["analysis"]["confidence"] >= 0.8

        # Test Replay
        replay = agent.replay(incident_id)
        assert replay["incident_id"] == incident_id
        assert len(replay["comparisons"]) >= 3

        # Test Follow-up Chat
        chat_resp = agent.chat(incident_id, "Why was latency considered high?")
        assert chat_resp.answer != ""
        assert len(storage.get_messages(incident_id)) >= 3

    finally:
        if os.path.exists(db_path):
            os.remove(db_path)
