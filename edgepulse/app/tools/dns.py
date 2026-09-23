"""Diagnostic Tool 1: DNS-over-HTTPS (DoH) via Cloudflare 1.1.1.1."""
import time
from typing import Any, Dict, List
import httpx
from app.core.config import settings
from app.core.logging import log_event
from app.tools.base import DiagnosticTool
from app.utils.url_validator import extract_domain, validate_url

DOH_ENDPOINT = "https://1.1.1.1/dns-query"


class DNSTool(DiagnosticTool):
    name = "dns"
    description = "Performs DNS-over-HTTPS queries to inspect A, AAAA, and CNAME records."

    async def run(self, url: str) -> Dict[str, Any]:
        # Validate SSRF
        valid_url = validate_url(url)
        domain = extract_domain(valid_url)

        # Demo mode support
        if settings.DEMO_MODE:
            return {
                "tool": self.name,
                "success": True,
                "domain": domain,
                "records": {
                    "A": ["93.184.216.34"],
                    "AAAA": ["2606:2800:220:1:248:1893:25c8:1946"],
                    "CNAME": [],
                },
                "response_time_ms": 45.0,
                "resolver": DOH_ENDPOINT,
                "error": None,
            }

        start_time = time.perf_counter()
        records: Dict[str, List[str]] = {"A": [], "AAAA": [], "CNAME": []}
        errors: List[str] = []

        async with httpx.AsyncClient(timeout=settings.REQUEST_TIMEOUT_SECONDS) as client:
            for rtype in ["A", "AAAA", "CNAME"]:
                try:
                    res = await client.get(
                        DOH_ENDPOINT,
                        params={"name": domain, "type": rtype},
                        headers={"Accept": "application/dns-json"},
                    )
                    if res.status_code == 200:
                        data = res.json()
                        answers = data.get("Answer", [])
                        for ans in answers:
                            if ans.get("data"):
                                records[rtype].append(ans["data"])
                    else:
                        errors.append(f"HTTP {res.status_code} for {rtype}")
                except Exception as e:
                    errors.append(f"Lookup error for {rtype}: {str(e)}")

        duration_ms = round((time.perf_counter() - start_time) * 1000, 2)
        has_records = bool(records["A"] or records["AAAA"] or records["CNAME"])

        result = {
            "tool": self.name,
            "success": has_records,
            "domain": domain,
            "records": records,
            "response_time_ms": duration_ms,
            "resolver": DOH_ENDPOINT,
            "error": "; ".join(errors) if (not has_records and errors) else None,
        }
        log_event("tool_executed", tool=self.name, domain=domain, success=has_records, duration_ms=duration_ms)
        return result
