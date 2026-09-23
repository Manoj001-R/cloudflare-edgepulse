"""Diagnostic Tool 3: Latency benchmark sampling and statistical classification."""
import asyncio
import time
from typing import Any, Dict, List
import httpx
from app.core.config import settings
from app.core.logging import log_event
from app.tools.base import DiagnosticTool
from app.utils.latency import compute_latency_stats
from app.utils.url_validator import validate_url


class LatencyTool(DiagnosticTool):
    name = "latency"
    description = "Executes sequential round-trip benchmark probes to measure and classify latency variance."

    async def run(self, url: str) -> Dict[str, Any]:
        target_url = validate_url(url)

        # Demo mode support
        if settings.DEMO_MODE:
            samples = [1750.0, 1890.0, 1820.0, 1800.0, 1840.0]
            min_ms, max_ms, avg_ms, median_ms, classification = compute_latency_stats(samples)
            return {
                "tool": self.name,
                "success": True,
                "samples": samples,
                "minimum_ms": min_ms,
                "maximum_ms": max_ms,
                "average_ms": avg_ms,
                "median_ms": median_ms,
                "classification": classification,
                "error": None,
            }

        samples: List[float] = []
        errors: List[str] = []

        async with httpx.AsyncClient(
            verify=True,
            timeout=settings.REQUEST_TIMEOUT_SECONDS,
            follow_redirects=True,
            headers={"User-Agent": "EdgePulse-LatencyProbe/1.0"},
        ) as client:
            for _ in range(5):
                try:
                    t0 = time.perf_counter()
                    res = await client.head(target_url)
                    # Fallback to GET with small byte range if HEAD not supported
                    if res.status_code == 405:
                        t0 = time.perf_counter()
                        res = await client.get(target_url, headers={"Range": "bytes=0-0"})
                    elapsed_ms = round((time.perf_counter() - t0) * 1000, 2)
                    samples.append(elapsed_ms)
                except Exception as e:
                    errors.append(str(e))
                await asyncio.sleep(0.05)

        if not samples:
            return {
                "tool": self.name,
                "success": False,
                "samples": [],
                "minimum_ms": 0.0,
                "maximum_ms": 0.0,
                "average_ms": 0.0,
                "median_ms": 0.0,
                "classification": "CRITICAL",
                "error": f"Failed all 5 latency probes: {'; '.join(errors)}",
            }

        min_ms, max_ms, avg_ms, median_ms, classification = compute_latency_stats(samples)
        result = {
            "tool": self.name,
            "success": True,
            "samples": samples,
            "minimum_ms": min_ms,
            "maximum_ms": max_ms,
            "average_ms": avg_ms,
            "median_ms": median_ms,
            "classification": classification,
            "error": None if len(samples) == 5 else f"Partial samples ({len(samples)}/5)",
        }
        log_event("tool_executed", tool=self.name, url=target_url, avg_ms=avg_ms, classification=classification)
        return result
