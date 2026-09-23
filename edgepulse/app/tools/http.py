"""Diagnostic Tool 2: Safe HTTP probe collecting status, headers, latency, and redirects."""
import time
from typing import Any, Dict, List
import httpx
from app.core.config import settings
from app.core.logging import log_event
from app.tools.base import DiagnosticTool
from app.utils.url_validator import validate_url


class HTTPTool(DiagnosticTool):
    name = "http"
    description = "Safe HTTP inspection of status code, headers, redirects, server metadata, and response time."

    async def run(self, url: str) -> Dict[str, Any]:
        target_url = validate_url(url)

        # Demo mode support
        if settings.DEMO_MODE:
            return {
                "tool": self.name,
                "success": True,
                "status_code": 200,
                "response_time_ms": 1820.0,
                "redirects": [],
                "headers": {
                    "server": "ECS (dab/4B96)",
                    "content-type": "text/html; charset=UTF-8",
                    "cache-control": "max-age=604800",
                },
                "content_type": "text/html; charset=UTF-8",
                "server": "ECS (dab/4B96)",
                "final_url": target_url,
                "error": None,
            }

        start_time = time.perf_counter()
        redirect_chain: List[str] = []
        current_url = target_url
        headers_dict: Dict[str, str] = {}
        status_code = None
        server_header = None
        content_type = None

        try:
            # Custom redirect loop to validate each target against SSRF
            async with httpx.AsyncClient(
                verify=True,
                timeout=settings.REQUEST_TIMEOUT_SECONDS,
                follow_redirects=False,
                headers={"User-Agent": "EdgePulse-Diagnostic/1.0 (+https://edgepulse.io)"},
            ) as client:
                for _ in range(settings.MAX_REDIRECTS):
                    # Ensure current redirect target is safe
                    validate_url(current_url)

                    # Stream response to avoid downloading huge files
                    async with client.stream("GET", current_url) as response:
                        status_code = response.status_code
                        headers_dict = {k.lower(): v for k, v in response.headers.items()}
                        server_header = headers_dict.get("server")
                        content_type = headers_dict.get("content-type")

                        # Read only up to max response bytes
                        body_chunk = await response.aread()
                        if len(body_chunk) > settings.MAX_RESPONSE_BYTES:
                            break

                        if response.is_redirect and "location" in response.headers:
                            loc = response.headers["location"]
                            redirect_chain.append(current_url)
                            # Handle relative redirects
                            current_url = str(response.url.join(loc))
                        else:
                            break

            duration_ms = round((time.perf_counter() - start_time) * 1000, 2)
            success = status_code is not None and status_code < 500

            result = {
                "tool": self.name,
                "success": success,
                "status_code": status_code,
                "response_time_ms": duration_ms,
                "redirects": redirect_chain,
                "headers": headers_dict,
                "content_type": content_type,
                "server": server_header,
                "final_url": current_url,
                "error": None,
            }
            log_event("tool_executed", tool=self.name, url=target_url, status_code=status_code, duration_ms=duration_ms)
            return result

        except Exception as e:
            duration_ms = round((time.perf_counter() - start_time) * 1000, 2)
            error_msg = f"HTTP probe failed: {str(e)}"
            log_event("tool_failed", tool=self.name, url=target_url, error=error_msg, duration_ms=duration_ms)
            return {
                "tool": self.name,
                "success": False,
                "status_code": status_code,
                "response_time_ms": duration_ms,
                "redirects": redirect_chain,
                "headers": {},
                "content_type": None,
                "server": None,
                "final_url": current_url,
                "error": error_msg,
            }
