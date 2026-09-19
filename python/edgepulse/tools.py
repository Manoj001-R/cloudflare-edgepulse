"""
Diagnostic tools for EdgePulse Python.
Implements the 5 core diagnostic tools defined in textfile.txt:
1. check_dns
2. check_http
3. check_latency
4. check_security_headers
5. check_https_reachability
Plus deterministic offline mock/demo support.
"""

from __future__ import annotations
import datetime
import time
from typing import Any, Dict, List, Optional
from urllib.parse import urlparse
import httpx

from .schemas import (
    DnsCheckResult,
    DnsRecord,
    HttpCheckResult,
    LatencyCheckResult,
    SecurityHeadersResult,
    HttpsReachabilityResult,
)
from .validator import validate_url, validate_redirect_url


def _now_iso() -> str:
    return datetime.datetime.now(datetime.timezone.utc).isoformat()


# ─── DNS CHECK ───────────────────────────────────────────────────

def check_dns(url: str, demo: bool = False) -> DnsCheckResult:
    start_time = time.perf_counter()
    validation = validate_url(url)
    if not validation.valid:
        return DnsCheckResult(
            status="critical",
            error=validation.error,
            durationMs=int((time.perf_counter() - start_time) * 1000),
            timestamp=_now_iso(),
        )

    hostname = validation.hostname or ""

    if demo:
        return DnsCheckResult(
            status="healthy",
            hostname=hostname,
            records=[
                DnsRecord(type="A", value="93.184.216.34", ttl=3600),
                DnsRecord(type="AAAA", value="2606:2800:220:1:248:1893:25c8:1946", ttl=3600),
                DnsRecord(type="TXT", value="v=spf1 -all", ttl=3600),
            ],
            recordCount=3,
            nameservers=["1.1.1.1", "1.0.0.1"],
            durationMs=42,
            timestamp=_now_iso(),
        )

    records: List[DnsRecord] = []
    nameservers = ["1.1.1.1", "8.8.8.8"]

    try:
        # First try DNS-over-HTTPS via Cloudflare 1.1.1.1 for reliable DoH
        with httpx.Client(timeout=5.0) as client:
            for qtype in ("A", "AAAA", "MX", "TXT"):
                resp = client.get(
                    "https://cloudflare-dns.com/dns-query",
                    params={"name": hostname, "type": qtype},
                    headers={"accept": "application/dns-json"},
                )
                if resp.status_code == 200:
                    data = resp.json()
                    for ans in data.get("Answer", []):
                        records.append(
                            DnsRecord(
                                type=qtype,
                                value=str(ans.get("data", "")),
                                ttl=ans.get("TTL"),
                            )
                        )

        # Fallback if no records found or DoH blocked: use dnspython
        if not records:
            import dns.resolver
            resolver = dns.resolver.Resolver()
            resolver.lifetime = 4.0
            for qtype in ("A", "AAAA", "TXT"):
                try:
                    answers = resolver.resolve(hostname, qtype)
                    for rdata in answers:
                        records.append(
                            DnsRecord(
                                type=qtype,
                                value=rdata.to_text().strip('"'),
                                ttl=answers.ttl,
                            )
                        )
                except Exception:
                    pass

        duration = int((time.perf_counter() - start_time) * 1000)

        if not records:
            return DnsCheckResult(
                status="warning",
                hostname=hostname,
                records=[],
                recordCount=0,
                error=f"No DNS records resolved for {hostname}",
                durationMs=duration,
                timestamp=_now_iso(),
            )

        return DnsCheckResult(
            status="healthy",
            hostname=hostname,
            records=records,
            recordCount=len(records),
            nameservers=nameservers,
            durationMs=duration,
            timestamp=_now_iso(),
        )

    except Exception as exc:
        duration = int((time.perf_counter() - start_time) * 1000)
        return DnsCheckResult(
            status="critical",
            hostname=hostname,
            records=[],
            recordCount=0,
            error=f"DNS resolution failure: {exc}",
            durationMs=duration,
            timestamp=_now_iso(),
        )


# ─── HTTP CHECK ──────────────────────────────────────────────────

def check_http(url: str, demo: bool = False) -> HttpCheckResult:
    start_time = time.perf_counter()
    validation = validate_url(url)
    if not validation.valid:
        return HttpCheckResult(
            status="critical",
            error=validation.error,
            durationMs=int((time.perf_counter() - start_time) * 1000),
            timestamp=_now_iso(),
        )

    sanitized = validation.sanitized_url or url

    if demo:
        return HttpCheckResult(
            status="healthy",
            targetUrl=sanitized,
            httpStatus=200,
            statusText="OK",
            finalUrl=sanitized,
            redirectCount=0,
            contentType="text/html; charset=utf-8",
            server="cloudflare",
            contentLength=1256,
            durationMs=185,
            timestamp=_now_iso(),
        )

    try:
        redirect_count = 0
        current_url = sanitized
        final_response = None

        with httpx.Client(timeout=8.0, follow_redirects=False) as client:
            while redirect_count <= 5:
                # Validate redirect targets against SSRF
                chk = validate_redirect_url(current_url, sanitized)
                if not chk.valid:
                    raise ValueError(f"SSRF violation on redirect: {chk.error}")

                resp = client.get(
                    current_url,
                    headers={"User-Agent": "EdgePulse-Investigator/1.0 (+https://edgepulse.local)"},
                )
                final_response = resp

                if 300 <= resp.status_code < 400 and "location" in resp.headers:
                    redirect_count += 1
                    current_url = str(resp.url.join(resp.headers["location"]))
                else:
                    break

        duration = int((time.perf_counter() - start_time) * 1000)
        status_code = final_response.status_code if final_response else 0

        # Classification
        if 200 <= status_code < 400:
            status_cls = "healthy"
        elif 400 <= status_code < 500:
            status_cls = "warning"
        else:
            status_cls = "critical"

        return HttpCheckResult(
            status=status_cls,
            targetUrl=sanitized,
            httpStatus=status_code,
            statusText=final_response.reason_phrase if final_response else None,
            finalUrl=str(final_response.url) if final_response else current_url,
            redirectCount=redirect_count,
            contentType=final_response.headers.get("content-type") if final_response else None,
            server=final_response.headers.get("server") if final_response else None,
            contentLength=int(final_response.headers.get("content-length", 0)) if final_response and "content-length" in final_response.headers else None,
            durationMs=duration,
            timestamp=_now_iso(),
        )

    except Exception as exc:
        duration = int((time.perf_counter() - start_time) * 1000)
        return HttpCheckResult(
            status="critical",
            targetUrl=sanitized,
            error=f"HTTP request failed: {exc}",
            durationMs=duration,
            timestamp=_now_iso(),
        )


# ─── LATENCY CHECK ───────────────────────────────────────────────

def check_latency(url: str, demo: bool = False) -> LatencyCheckResult:
    start_time = time.perf_counter()
    validation = validate_url(url)
    if not validation.valid:
        return LatencyCheckResult(
            status="critical",
            error=validation.error,
            durationMs=0,
            timestamp=_now_iso(),
        )

    sanitized = validation.sanitized_url or url

    if demo:
        return LatencyCheckResult(
            status="warning",
            latencyMs=1450,
            classification="high",
            samples=[1420, 1490, 1440],
            durationMs=1450,
            timestamp=_now_iso(),
        )

    samples: List[int] = []
    try:
        with httpx.Client(timeout=8.0) as client:
            for _ in range(3):
                t0 = time.perf_counter()
                client.get(
                    sanitized,
                    headers={"User-Agent": "EdgePulse-LatencyProbe/1.0"},
                )
                sample_ms = int((time.perf_counter() - t0) * 1000)
                samples.append(sample_ms)

        avg_latency = int(sum(samples) / len(samples)) if samples else 0

        # Classification thresholds defined in textfile.txt section 10:
        # < 300ms = low, 300-1000ms = moderate, 1000-2000ms = high, > 2000ms = critical
        if avg_latency < 300:
            classification = "low"
            status = "healthy"
        elif avg_latency <= 1000:
            classification = "moderate"
            status = "healthy"
        elif avg_latency <= 2000:
            classification = "high"
            status = "warning"
        else:
            classification = "critical"
            status = "critical"

        return LatencyCheckResult(
            status=status,
            latencyMs=avg_latency,
            classification=classification,
            samples=samples,
            durationMs=int((time.perf_counter() - start_time) * 1000),
            timestamp=_now_iso(),
        )

    except Exception as exc:
        duration = int((time.perf_counter() - start_time) * 1000)
        return LatencyCheckResult(
            status="critical",
            error=f"Latency probe error: {exc}",
            latencyMs=0,
            classification="critical",
            samples=samples,
            durationMs=duration,
            timestamp=_now_iso(),
        )


# ─── SECURITY HEADERS CHECK ──────────────────────────────────────

SECURITY_HEADERS = [
    "Strict-Transport-Security",
    "Content-Security-Policy",
    "X-Content-Type-Options",
    "Referrer-Policy",
    "Permissions-Policy",
    "X-Frame-Options",
]

def check_security_headers(url: str, demo: bool = False) -> SecurityHeadersResult:
    start_time = time.perf_counter()
    validation = validate_url(url)
    if not validation.valid:
        return SecurityHeadersResult(
            status="critical",
            error=validation.error,
            durationMs=0,
            timestamp=_now_iso(),
        )

    sanitized = validation.sanitized_url or url

    if demo:
        return SecurityHeadersResult(
            status="healthy",
            score=5,
            maxScore=6,
            present=[
                "Strict-Transport-Security",
                "X-Content-Type-Options",
                "Referrer-Policy",
                "Permissions-Policy",
                "X-Frame-Options",
            ],
            missing=["Content-Security-Policy"],
            headerDetails={
                "Strict-Transport-Security": "max-age=31536000; includeSubDomains; preload",
                "X-Content-Type-Options": "nosniff",
                "Referrer-Policy": "strict-origin-when-cross-origin",
                "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
                "X-Frame-Options": "DENY",
                "Content-Security-Policy": None,
            },
            durationMs=120,
            timestamp=_now_iso(),
        )

    try:
        with httpx.Client(timeout=8.0, follow_redirects=True) as client:
            resp = client.get(sanitized, headers={"User-Agent": "EdgePulse-HeaderInspector/1.0"})

        present: List[str] = []
        missing: List[str] = []
        details: Dict[str, Optional[str]] = {}

        for hdr in SECURITY_HEADERS:
            val = resp.headers.get(hdr)
            if val:
                present.append(hdr)
                details[hdr] = val
            else:
                missing.append(hdr)
                details[hdr] = None

        score = len(present)
        if score >= 4:
            status = "healthy"
        elif score >= 2:
            status = "warning"
        else:
            status = "critical"

        return SecurityHeadersResult(
            status=status,
            score=score,
            maxScore=len(SECURITY_HEADERS),
            present=present,
            missing=missing,
            headerDetails=details,
            durationMs=int((time.perf_counter() - start_time) * 1000),
            timestamp=_now_iso(),
        )

    except Exception as exc:
        duration = int((time.perf_counter() - start_time) * 1000)
        return SecurityHeadersResult(
            status="critical",
            error=f"Header check error: {exc}",
            score=0,
            maxScore=len(SECURITY_HEADERS),
            present=[],
            missing=SECURITY_HEADERS,
            durationMs=duration,
            timestamp=_now_iso(),
        )


# ─── HTTPS REACHABILITY CHECK ────────────────────────────────────

def check_https_reachability(url: str, demo: bool = False) -> HttpsReachabilityResult:
    start_time = time.perf_counter()
    validation = validate_url(url)
    if not validation.valid:
        return HttpsReachabilityResult(
            status="critical",
            error=validation.error,
            durationMs=0,
            timestamp=_now_iso(),
        )

    hostname = validation.hostname or ""

    if demo:
        return HttpsReachabilityResult(
            status="healthy",
            httpsSupported=True,
            httpAccessible=True,
            enforcesHttps=True,
            redirectsToHttps=True,
            durationMs=210,
            timestamp=_now_iso(),
        )

    https_url = f"https://{hostname}/"
    http_url = f"http://{hostname}/"

    https_ok = False
    http_ok = False
    redirects_to_https = False

    try:
        with httpx.Client(timeout=6.0, verify=True) as client:
            try:
                r_https = client.get(https_url)
                https_ok = r_https.status_code < 500
            except Exception:
                https_ok = False

            try:
                r_http = client.get(http_url, follow_redirects=False)
                http_ok = r_http.status_code < 500
                if 300 <= r_http.status_code < 400:
                    loc = r_http.headers.get("location", "")
                    if loc.startswith("https://"):
                        redirects_to_https = True
            except Exception:
                http_ok = False

        duration = int((time.perf_counter() - start_time) * 1000)
        status = "healthy" if https_ok else "critical"

        return HttpsReachabilityResult(
            status=status,
            httpsSupported=https_ok,
            httpAccessible=http_ok,
            enforcesHttps=redirects_to_https or not http_ok,
            redirectsToHttps=redirects_to_https,
            durationMs=duration,
            timestamp=_now_iso(),
        )

    except Exception as exc:
        duration = int((time.perf_counter() - start_time) * 1000)
        return HttpsReachabilityResult(
            status="critical",
            error=f"HTTPS reachability probe error: {exc}",
            httpsSupported=False,
            httpAccessible=False,
            enforcesHttps=False,
            redirectsToHttps=False,
            durationMs=duration,
            timestamp=_now_iso(),
        )


def execute_tool(tool_name: str, url: str, demo: bool = False) -> Dict[str, Any]:
    """Universal dispatcher for the 5 diagnostic tools."""
    if tool_name == "check_dns":
        return check_dns(url, demo).model_dump()
    elif tool_name == "check_http":
        return check_http(url, demo).model_dump()
    elif tool_name == "check_latency":
        return check_latency(url, demo).model_dump()
    elif tool_name == "check_security_headers":
        return check_security_headers(url, demo).model_dump()
    elif tool_name == "check_https_reachability":
        return check_https_reachability(url, demo).model_dump()
    else:
        raise ValueError(f"Tool {tool_name} is not in the allowed tool list")
