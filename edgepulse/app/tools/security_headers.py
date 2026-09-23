"""Diagnostic Tool 4: Security Headers compliance and configuration inspection."""
from typing import Any, Dict, List
import httpx
from app.core.config import settings
from app.core.logging import log_event
from app.tools.base import DiagnosticTool
from app.utils.url_validator import validate_url

MONITORED_SECURITY_HEADERS = [
    "Strict-Transport-Security",
    "Content-Security-Policy",
    "X-Content-Type-Options",
    "X-Frame-Options",
    "Referrer-Policy",
    "Permissions-Policy",
]


class SecurityHeadersTool(DiagnosticTool):
    name = "security_headers"
    description = "Audits standard HTTP defensive security headers (HSTS, CSP, X-Frame-Options, etc.)."

    async def run(self, url: str) -> Dict[str, Any]:
        target_url = validate_url(url)

        # Demo mode support
        if settings.DEMO_MODE:
            return {
                "tool": self.name,
                "success": True,
                "score": 5,
                "total": 6,
                "present": [
                    "Strict-Transport-Security",
                    "Content-Security-Policy",
                    "X-Content-Type-Options",
                    "X-Frame-Options",
                    "Referrer-Policy",
                ],
                "missing": ["Permissions-Policy"],
                "details": {
                    "strict-transport-security": "max-age=31536000; includeSubDomains; preload",
                    "content-security-policy": "default-src 'self'",
                    "x-content-type-options": "nosniff",
                    "x-frame-options": "SAMEORIGIN",
                    "referrer-policy": "strict-origin-when-cross-origin",
                },
                "error": None,
            }

        present: List[str] = []
        missing: List[str] = []
        details: Dict[str, str] = {}

        try:
            async with httpx.AsyncClient(
                verify=True,
                timeout=settings.REQUEST_TIMEOUT_SECONDS,
                follow_redirects=True,
                headers={"User-Agent": "EdgePulse-SecHeadersCheck/1.0"},
            ) as client:
                res = await client.get(target_url)
                resp_headers = {k.lower(): v for k, v in res.headers.items()}

                for header_name in MONITORED_SECURITY_HEADERS:
                    key = header_name.lower()
                    if key in resp_headers:
                        present.append(header_name)
                        details[key] = resp_headers[key]
                    else:
                        missing.append(header_name)

            score = len(present)
            result = {
                "tool": self.name,
                "success": True,
                "score": score,
                "total": len(MONITORED_SECURITY_HEADERS),
                "present": present,
                "missing": missing,
                "details": details,
                "error": None,
            }
            log_event("tool_executed", tool=self.name, url=target_url, score=f"{score}/{len(MONITORED_SECURITY_HEADERS)}")
            return result

        except Exception as e:
            return {
                "tool": self.name,
                "success": False,
                "score": 0,
                "total": len(MONITORED_SECURITY_HEADERS),
                "present": [],
                "missing": MONITORED_SECURITY_HEADERS,
                "details": {},
                "error": f"Failed to inspect security headers: {str(e)}",
            }
