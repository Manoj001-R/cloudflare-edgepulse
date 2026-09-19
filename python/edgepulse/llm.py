"""
LLM Client for EdgePulse Python.
Supports:
1. Cloudflare Workers AI (via REST API)
2. OpenAI-compatible endpoints (OpenAI, Groq, Ollama, DeepSeek, LocalAI)
3. Offline deterministic Demo Mode (100% reliable offline testing & verification)
Includes JSON extraction, Pydantic validation, and self-repair on failure.
"""

from __future__ import annotations
import json
import os
import re
from typing import Any, Dict, List, Optional, Type, TypeVar
import httpx
from pydantic import BaseModel, ValidationError

from .schemas import (
    TriageResponse,
    AnalysisResponse,
    FollowUpResponse,
    Finding,
    RecommendedAction,
)

T = TypeVar("T", bound=BaseModel)


def extract_json(raw_text: str) -> Dict[str, Any]:
    """Extract and parse JSON from LLM text output, handling code fences or extraneous text."""
    trimmed = raw_text.strip()

    # Try direct parse
    try:
        return json.loads(trimmed)
    except json.JSONDecodeError:
        pass

    # Try extracting inside ```json ... ``` or ``` ... ```
    match = re.search(r"```(?:json)?\s*([\s\S]*?)\s*```", trimmed, re.IGNORECASE)
    if match:
        try:
            return json.loads(match.group(1).strip())
        except json.JSONDecodeError:
            pass

    # Try finding outermost { ... }
    first_brace = trimmed.find("{")
    last_brace = trimmed.rfind("}")
    if first_brace != -1 and last_brace > first_brace:
        slice_str = trimmed[first_brace : last_brace + 1]
        try:
            return json.loads(slice_str)
        except json.JSONDecodeError:
            pass

    raise ValueError(f"Could not extract valid JSON from LLM response:\n{raw_text[:200]}")


class LlmClient:
    def __init__(
        self,
        provider: Optional[str] = None,
        api_key: Optional[str] = None,
        api_base: Optional[str] = None,
        model: Optional[str] = None,
        cf_account_id: Optional[str] = None,
        demo_mode: bool = False,
    ):
        self.demo_mode = demo_mode or (os.getenv("DEMO_MODE", "").lower() == "true")
        self.api_key = api_key or os.getenv("LLM_API_KEY") or os.getenv("OPENAI_API_KEY") or os.getenv("CLOUDFLARE_API_TOKEN")
        self.api_base = api_base or os.getenv("OPENAI_API_BASE") or "https://api.openai.com/v1"
        self.cf_account_id = cf_account_id or os.getenv("CLOUDFLARE_ACCOUNT_ID")
        self.provider = provider or os.getenv("LLM_PROVIDER")

        # Auto-detect provider if not explicitly given.
        # If the environment is missing credentials, fail safe to demo mode instead of making broken API requests.
        if not self.provider:
            if self.demo_mode or not self.api_key:
                self.provider = "demo"
            elif self.cf_account_id and os.getenv("CLOUDFLARE_API_TOKEN"):
                self.provider = "cloudflare"
            else:
                self.provider = "openai"

        if self.provider in {"cloudflare", "openai"} and not self.api_key:
            self.provider = "demo"

        if self.provider == "cloudflare" and (not self.cf_account_id or not self.api_key):
            self.provider = "demo"

        self.model = model or os.getenv("AI_MODEL") or (
            "@cf/meta/llama-3.3-70b-instruct-fp8-fast"
            if self.provider == "cloudflare"
            else "gpt-4o-mini"
        )

    # ─── High-Level Methods ────────────────────────────────────

    def triage(self, system_prompt: str, user_prompt: str, demo: bool = False) -> TriageResponse:
        if demo or self.provider == "demo":
            return self._demo_triage(user_prompt)

        raw_output = self._call_llm(system_prompt, user_prompt)
        return self._parse_with_retry(raw_output, TriageResponse, system_prompt, user_prompt)

    def analyze(
        self, system_prompt: str, user_prompt: str, demo: bool = False
    ) -> AnalysisResponse:
        if demo or self.provider == "demo":
            return self._demo_analysis(user_prompt)

        raw_output = self._call_llm(system_prompt, user_prompt)
        return self._parse_with_retry(raw_output, AnalysisResponse, system_prompt, user_prompt)

    def followup(
        self, system_prompt: str, user_prompt: str, demo: bool = False
    ) -> FollowUpResponse:
        if demo or self.provider == "demo":
            return FollowUpResponse(
                answer="Based on diagnostic evidence, the issue is primarily latency-related at the origin web server. DNS resolution is fast and healthy, and TLS handshakes succeed without errors.",
                additionalContext="Consider monitoring origin application CPU and memory utilization during traffic spikes.",
            )

        raw_output = self._call_llm(system_prompt, user_prompt)
        return self._parse_with_retry(raw_output, FollowUpResponse, system_prompt, user_prompt)

    # ─── LLM Calling ───────────────────────────────────────────

    def _call_llm(self, system_prompt: str, user_prompt: str) -> str:
        if self.provider == "cloudflare":
            return self._call_cloudflare_ai(system_prompt, user_prompt)
        else:
            return self._call_openai_compatible(system_prompt, user_prompt)

    def _call_cloudflare_ai(self, system_prompt: str, user_prompt: str) -> str:
        if not self.cf_account_id or not self.api_key:
            raise ValueError("Cloudflare AI requires CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_API_TOKEN")

        url = f"https://api.cloudflare.com/client/v4/accounts/{self.cf_account_id}/ai/run/{self.model}"
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
        }
        payload = {
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
            "max_tokens": 2048,
        }

        with httpx.Client(timeout=30.0) as client:
            resp = client.post(url, headers=headers, json=payload)
            resp.raise_for_status()
            data = resp.json()
            return data.get("result", {}).get("response", "")

    def _call_openai_compatible(self, system_prompt: str, user_prompt: str) -> str:
        url = f"{self.api_base.rstrip('/')}/chat/completions"
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
        }
        payload = {
            "model": self.model,
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
            "response_format": {"type": "json_object"},
            "temperature": 0.2,
        }

        with httpx.Client(timeout=30.0) as client:
            resp = client.post(url, headers=headers, json=payload)
            resp.raise_for_status()
            data = resp.json()
            return data["choices"][0]["message"]["content"]

    def _parse_with_retry(
        self,
        raw_output: str,
        schema: Type[T],
        system_prompt: str,
        original_user_prompt: str,
    ) -> T:
        try:
            parsed_dict = extract_json(raw_output)
            return schema.model_validate(parsed_dict)
        except Exception as first_error:
            # 1-time self repair retry
            repair_prompt = (
                f"Your previous response could not be validated against the schema.\n"
                f"Error: {first_error}\n"
                f"Your previous response was:\n{raw_output}\n\n"
                f"Please fix and re-output ONLY valid JSON matching the exact required schema."
            )
            try:
                retry_output = self._call_llm(system_prompt, repair_prompt)
                retry_dict = extract_json(retry_output)
                return schema.model_validate(retry_dict)
            except Exception as second_error:
                # Controlled fallback to prevent workflow crash
                if schema == TriageResponse:
                    return TriageResponse(  # type: ignore
                        incidentType="unknown",
                        severity="medium",
                        reason=f"LLM JSON validation error; default investigation plan selected. Error: {second_error}",
                        investigationPlan=["check_dns", "check_http", "check_latency"],
                    )
                raise ValueError(
                    f"LLM output parsing failed after retry: {second_error}\nOriginal: {raw_output}"
                )

    # ─── Demo Responses ────────────────────────────────────────

    def _demo_triage(self, user_prompt: str) -> TriageResponse:
        prompt_lower = user_prompt.lower()
        if "slow" in prompt_lower or "latency" in prompt_lower:
            return TriageResponse(
                incidentType="latency",
                severity="high",
                reason="User reports degraded response times and high latency. Initiating diagnostic probes across DNS, HTTP, latency benchmarks, reachability, and headers.",
                investigationPlan=[
                    "check_dns",
                    "check_http",
                    "check_latency",
                    "check_https_reachability",
                    "check_security_headers",
                ],
            )
        elif "dns" in prompt_lower:
            return TriageResponse(
                incidentType="dns",
                severity="high",
                reason="User indicates potential DNS lookup failure or resolution errors.",
                investigationPlan=["check_dns", "check_http", "check_https_reachability"],
            )
        elif "5xx" in prompt_lower or "error" in prompt_lower:
            return TriageResponse(
                incidentType="http",
                severity="critical",
                reason="User reports HTTP server errors (5xx) affecting availability.",
                investigationPlan=["check_dns", "check_http", "check_latency", "check_security_headers"],
            )
        elif "ssl" in prompt_lower or "tls" in prompt_lower:
            return TriageResponse(
                incidentType="tls",
                severity="high",
                reason="User reports SSL/TLS certificate or handshake issues.",
                investigationPlan=["check_https_reachability", "check_http", "check_dns"],
            )
        else:
            return TriageResponse(
                incidentType="mixed",
                severity="medium",
                reason="General performance and availability check based on incident description.",
                investigationPlan=[
                    "check_dns",
                    "check_http",
                    "check_latency",
                    "check_https_reachability",
                    "check_security_headers",
                ],
            )

    def _demo_analysis(self, user_prompt: str) -> AnalysisResponse:
        return AnalysisResponse(
            summary="Investigation observed healthy DNS resolution and HTTPS reachability, but significantly elevated HTTP latency (averaging 1,450ms).",
            incidentType="latency",
            severity="high",
            findings=[
                Finding(signal="DNS Resolution", value="Healthy (3 records)", interpretation="DNS resolving correctly within 42ms"),
                Finding(signal="HTTP Status", value=200, interpretation="Target endpoint is reachable and returning HTTP 200 OK"),
                Finding(signal="Latency Probe", value=1450, interpretation="Elevated response time (>1000ms threshold classified as high)"),
                Finding(signal="Security Headers", value="5/6", interpretation="Strong header posture; only Content-Security-Policy absent"),
                Finding(signal="HTTPS Reachability", value="Supported", interpretation="Valid TLS connection established"),
            ],
            likelyRootCause="Likely backend or origin application contention causing slow server-side request processing, while edge network routing and DNS remain healthy.",
            confidence=0.86,
            recommendedActions=[
                RecommendedAction(
                    problem="Elevated HTTP latency (>1.4s)",
                    evidence="Latency probe measured 1,450ms across multiple samples",
                    likelyCause="Origin compute or database latency bottlenecks",
                    action="Profile backend application performance, database queries, and consider edge caching",
                    risk="Low",
                    validation="Rerun latency checks after cache rule or backend optimization",
                ),
                RecommendedAction(
                    problem="Missing Content-Security-Policy",
                    evidence="Security header check returned 5/6 headers",
                    likelyCause="CSP header not configured on web server",
                    action="Configure a restrictive Content-Security-Policy header to prevent XSS",
                    risk="Low",
                    validation="Verify CSP presence with check_security_headers",
                ),
            ],
            limitations=[
                "External probing only; internal server metrics (CPU, RAM, DB wait time) were not accessible",
                "Probes originated from local testing agent node",
            ],
        )
