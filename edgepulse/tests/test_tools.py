"""Tests for Diagnostic Tools."""
import pytest
from app.core.config import settings
from app.tools.dns import DNSTool
from app.tools.http import HTTPTool
from app.tools.https import HTTPSTool
from app.tools.latency import LatencyTool
from app.tools.registry import get_all_tool_names, get_tool
from app.tools.security_headers import SecurityHeadersTool
from app.utils.errors import ToolExecutionException
from tests.conftest import run_async


def test_registry_allowlist():
    tools = get_all_tool_names()
    assert "dns" in tools
    assert "http" in tools
    assert "latency" in tools
    assert "security_headers" in tools
    assert "https" in tools
    assert len(tools) == 5

    # Should raise for arbitrary tools
    with pytest.raises(ToolExecutionException):
        get_tool("arbitrary_tool_name")
    with pytest.raises(ToolExecutionException):
        get_tool("bash_exec")


def test_tools_in_demo_mode(monkeypatch):
    monkeypatch.setattr(settings, "DEMO_MODE", True)

    async def _test():
        # DNS Tool
        dns = DNSTool()
        dns_res = await dns.run("https://example.com")
        assert dns_res["success"] is True
        assert "A" in dns_res["records"]
        assert dns_res["response_time_ms"] == 45.0

        # HTTP Tool
        http_tool = HTTPTool()
        http_res = await http_tool.run("https://example.com")
        assert http_res["success"] is True
        assert http_res["status_code"] == 200
        assert http_res["response_time_ms"] == 1820.0

        # Latency Tool
        lat_tool = LatencyTool()
        lat_res = await lat_tool.run("https://example.com")
        assert lat_res["success"] is True
        assert len(lat_res["samples"]) == 5
        assert lat_res["classification"] in ["HIGH", "CRITICAL", "MODERATE", "LOW"]

        # Security Headers Tool
        sec_tool = SecurityHeadersTool()
        sec_res = await sec_tool.run("https://example.com")
        assert sec_res["success"] is True
        assert sec_res["score"] == 5
        assert "Permissions-Policy" in sec_res["missing"]

        # HTTPS Tool
        https_tool = HTTPSTool()
        https_res = await https_tool.run("https://example.com")
        assert https_res["success"] is True
        assert https_res["https_accessible"] is True

    run_async(_test())
