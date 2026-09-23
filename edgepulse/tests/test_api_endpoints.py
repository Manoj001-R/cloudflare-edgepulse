"""Tests for all FastAPI endpoints."""
import pytest
from httpx import ASGITransport, AsyncClient
from app.core.config import settings
from app.db.database import get_db
from app.main import app
from tests.conftest import TestSessionLocal, run_async, setup_test_db, teardown_test_db


def test_health_endpoint():
    async def _test():
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            res = await client.get("/api/health")
            assert res.status_code == 200
            data = res.json()
            assert data["status"] == "healthy"
            assert "version" in data
    run_async(_test())


def test_create_and_list_incidents(monkeypatch):
    monkeypatch.setattr(settings, "DEMO_MODE", True)

    async def _test():
        await setup_test_db()
        async def override_get_db():
            async with TestSessionLocal() as session:
                yield session

        app.dependency_overrides[get_db] = override_get_db
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            payload = {
                "url": "https://example.com",
                "problem": "Website is responding slowly.",
            }
            res = await client.post("/api/incidents", json=payload)
            assert res.status_code == 201
            data = res.json()
            assert data["success"] is True
            assert "incident_id" in data
            incident_id = data["incident_id"]

            # List incidents
            list_res = await client.get("/api/incidents")
            assert list_res.status_code == 200
            list_data = list_res.json()
            assert list_data["total"] >= 1
            assert any(i["incident_id"] == incident_id for i in list_data["incidents"])

        app.dependency_overrides.clear()
        await teardown_test_db()

    run_async(_test())


def test_tool_manual_test_endpoint(monkeypatch):
    monkeypatch.setattr(settings, "DEMO_MODE", True)

    async def _test():
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            payload = {
                "url": "https://example.com",
                "tool": "dns",
            }
            res = await client.post("/api/tools/test", json=payload)
            assert res.status_code == 200
            data = res.json()
            assert data["success"] is True
            assert data["result"]["tool"] == "dns"
    run_async(_test())


def test_tools_list_endpoint():
    async def _test():
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            res = await client.get("/api/tools")
            assert res.status_code == 200
            data = res.json()
            assert data["success"] is True
            assert len(data["tools"]) == 5
    run_async(_test())


def test_stats_endpoint():
    async def _test():
        await setup_test_db()
        async def override_get_db():
            async with TestSessionLocal() as session:
                yield session

        app.dependency_overrides[get_db] = override_get_db
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            res = await client.get("/api/stats")
            assert res.status_code == 200
            data = res.json()
            assert data["success"] is True
            assert "total_incidents" in data["data"]

        app.dependency_overrides.clear()
        await teardown_test_db()
    run_async(_test())


def test_ssrf_blocked_in_api():
    async def _test():
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            payload = {
                "url": "http://127.0.0.1/admin",
                "problem": "Internal port test",
            }
            res = await client.post("/api/incidents", json=payload)
            assert res.status_code == 403
            data = res.json()
            assert data["error"]["code"] == "SSRF_BLOCKED"
    run_async(_test())
