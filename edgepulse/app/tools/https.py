"""Diagnostic Tool 5: HTTPS reachability, certificate handshake, and HTTP->HTTPS upgrade check."""
from typing import Any, Dict
from urllib.parse import urlparse
import httpx
from app.core.config import settings
from app.core.logging import log_event
from app.tools.base import DiagnosticTool
from app.utils.url_validator import validate_url


class HTTPSTool(DiagnosticTool):
    name = "https"
    description = "Checks HTTPS vs HTTP availability, TLS handshake status, and automatic redirect upgrade."

    async def run(self, url: str) -> Dict[str, Any]:
        target_url = validate_url(url)
        parsed = urlparse(target_url)
        domain = parsed.hostname or url

        # Demo mode support
        if settings.DEMO_MODE:
            return {
                "tool": self.name,
                "success": True,
                "https_accessible": True,
                "http_accessible": True,
                "redirect_to_https": True,
                "final_url": f"https://{domain}/",
                "status_code": 200,
                "error": None,
            }

        https_url = f"https://{domain}"
        http_url = f"http://{domain}"

        https_accessible = False
        http_accessible = False
        redirect_to_https = False
        status_code = None
        final_url = https_url
        errors = []

        async with httpx.AsyncClient(
            verify=True,
            timeout=settings.REQUEST_TIMEOUT_SECONDS,
            headers={"User-Agent": "EdgePulse-HTTPSProbe/1.0"},
        ) as client:
            # Check HTTPS
            try:
                validate_url(https_url)
                res_https = await client.get(https_url, follow_redirects=True)
                https_accessible = res_https.status_code < 500
                status_code = res_https.status_code
                final_url = str(res_https.url)
            except Exception as e:
                errors.append(f"HTTPS probe error: {str(e)}")

            # Check HTTP and redirect upgrade
            try:
                validate_url(http_url)
                res_http = await client.get(http_url, follow_redirects=False)
                http_accessible = res_http.status_code < 500
                if res_http.is_redirect and "location" in res_http.headers:
                    loc = res_http.headers["location"].lower()
                    if loc.startswith("https://"):
                        redirect_to_https = True
            except Exception as e:
                errors.append(f"HTTP probe error: {str(e)}")

        success = https_accessible or http_accessible
        result = {
            "tool": self.name,
            "success": success,
            "https_accessible": https_accessible,
            "http_accessible": http_accessible,
            "redirect_to_https": redirect_to_https,
            "final_url": final_url,
            "status_code": status_code,
            "error": "; ".join(errors) if (not success and errors) else None,
        }
        log_event("tool_executed", tool=self.name, domain=domain, https_accessible=https_accessible, redirect_to_https=redirect_to_https)
        return result
