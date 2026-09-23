"""OpenAI and OpenAI-compatible LLM Provider."""
import json
import re
from typing import Any, Dict, List
import httpx
from app.core.config import settings
from app.core.logging import log_event
from app.prompts.analysis import ANALYSIS_SYSTEM_PROMPT, build_analysis_user_prompt
from app.prompts.followup import FOLLOWUP_SYSTEM_PROMPT, build_followup_prompt
from app.prompts.triage import TRIAGE_SYSTEM_PROMPT, build_triage_user_prompt
from app.schemas.analysis import AnalysisResult
from app.schemas.investigation import IncidentTriage
from app.services.llm.base import LLMProvider
from app.utils.errors import LLMException


def extract_json_block(text: str) -> str:
    """Extract JSON object from markdown fenced code blocks if present."""
    text = text.strip()
    match = re.search(r"```(?:json)?\s*([\s\S]*?)\s*```", text)
    if match:
        return match.group(1).strip()
    return text


class OpenAIProvider(LLMProvider):
    def __init__(
        self,
        api_key: str = "",
        model: str = "gpt-4o-mini",
        base_url: str = "https://api.openai.com/v1",
    ):
        self.api_key = api_key or settings.OPENAI_API_KEY
        self.model = model or settings.OPENAI_MODEL
        self.base_url = (base_url or settings.OPENAI_BASE_URL).rstrip("/")

    async def _send_chat_completion(self, messages: List[Dict[str, str]], json_mode: bool = True) -> str:
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
        }
        payload: Dict[str, Any] = {
            "model": self.model,
            "messages": messages,
            "temperature": 0.1,
        }
        if json_mode:
            payload["response_format"] = {"type": "json_object"}

        async with httpx.AsyncClient(timeout=30.0) as client:
            res = await client.post(f"{self.base_url}/chat/completions", headers=headers, json=payload)
            if res.status_code != 200:
                raise LLMException(f"OpenAI API returned HTTP {res.status_code}: {res.text}")
            data = res.json()
            return data["choices"][0]["message"]["content"]

    async def triage_incident(self, url: str, problem_description: str) -> IncidentTriage:
        if settings.DEMO_MODE or not self.api_key:
            # Deterministic mock triage
            return IncidentTriage(
                incident_type="latency",
                severity="high",
                reasoning_summary="The user reports significant response time degradation and slow page loads.",
                selected_tools=["dns", "http", "latency", "security_headers", "https"],
            )

        messages = [
            {"role": "system", "content": TRIAGE_SYSTEM_PROMPT},
            {"role": "user", "content": build_triage_user_prompt(url, problem_description)},
        ]

        raw_output = await self._send_chat_completion(messages, json_mode=True)
        try:
            parsed = json.loads(extract_json_block(raw_output))
            return IncidentTriage.model_validate(parsed)
        except Exception as e:
            log_event("triage_parse_retry", error=str(e), raw_output=raw_output)
            # Retry with fallback default tools
            return IncidentTriage(
                incident_type="latency",
                severity="medium",
                reasoning_summary="Default diagnostic plan assigned due to structured triage fallback.",
                selected_tools=["dns", "http", "latency", "security_headers", "https"],
            )

    async def analyze_incident(
        self,
        url: str,
        problem_description: str,
        triage: IncidentTriage,
        evidence: List[Dict[str, Any]],
    ) -> AnalysisResult:
        if settings.DEMO_MODE or not self.api_key:
            # Deterministic mock analysis matching prompt
            return AnalysisResult(
                summary="The website is reachable and DNS resolves correctly, but exhibits elevated HTTP response latency.",
                root_cause="Possible origin performance degradation or database connection contention",
                confidence=0.84,
                evidence=[
                    "DNS resolution completed in 45ms across Cloudflare 1.1.1.1",
                    "HTTP response time observed at 1,820ms (P99 spike)",
                    "HTTPS TLS 1.3 handshake successful",
                    "Security headers score 5/6 (Permissions-Policy omitted)",
                ],
                recommendations=[
                    "Investigate origin server CPU utilization and connection pool limits",
                    "Review database query execution plans for slow queries",
                    "Deploy temporary Edge Cache-Everything rule (120s TTL) on Cloudflare to shed load",
                ],
                limitations=[
                    "Origin server internals and database query logs were not directly inspected",
                    "Analysis is based entirely on external edge-to-origin telemetry",
                ],
            )

        messages = [
            {"role": "system", "content": ANALYSIS_SYSTEM_PROMPT},
            {
                "role": "user",
                "content": build_analysis_user_prompt(
                    url,
                    problem_description,
                    triage.model_dump(),
                    evidence,
                ),
            },
        ]

        raw_output = await self._send_chat_completion(messages, json_mode=True)
        try:
            parsed = json.loads(extract_json_block(raw_output))
            return AnalysisResult.model_validate(parsed)
        except Exception as e:
            log_event("analysis_parse_failed", error=str(e), raw_output=raw_output)
            raise LLMException(f"Failed to parse LLM analysis JSON: {e}")

    async def follow_up(
        self,
        incident_summary: Dict[str, Any],
        conversation_history: List[Dict[str, str]],
        question: str,
    ) -> str:
        if settings.DEMO_MODE or not self.api_key:
            q_lower = question.lower()
            if "slow" in q_lower or "latency" in q_lower or "why" in q_lower:
                return (
                    "Based on the collected evidence, the 1,820ms response time is concentrated at the origin web service. "
                    "DNS resolution (45ms) and edge routing are healthy, which isolates the issue to backend server processing or database contention."
                )
            elif "evidence" in q_lower:
                return (
                    "The supporting evidence includes: (1) HTTP response duration of 1,820ms, (2) Consistent latency spike across 4 PoPs, "
                    "(3) Healthy 45ms DNS resolution on 1.1.1.1, and (4) Valid HTTPS TLS 1.3 connectivity."
                )
            elif "check" in q_lower or "action" in q_lower:
                return (
                    "Recommended initial action: Check the origin server CPU load and Postgres connection pool contention. "
                    "You can also activate a 120s TTL edge cache rule on Cloudflare to immediately shed 85% of incoming load."
                )
            return "I don't have enough evidence to determine details outside the observed telemetry."

        messages = [
            {"role": "system", "content": FOLLOWUP_SYSTEM_PROMPT},
            {
                "role": "user",
                "content": build_followup_prompt(incident_summary, conversation_history, question),
            },
        ]

        return await self._send_chat_completion(messages, json_mode=False)
