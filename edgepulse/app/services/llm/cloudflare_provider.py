"""Cloudflare Workers AI Provider."""
import json
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
from app.services.llm.openai_provider import extract_json_block
from app.utils.errors import LLMException


class CloudflareProvider(LLMProvider):
    def __init__(
        self,
        account_id: str = "",
        api_token: str = "",
        model: str = "@cf/meta/llama-3.1-8b-instruct",
    ):
        self.account_id = account_id or settings.CLOUDFLARE_ACCOUNT_ID
        self.api_token = api_token or settings.CLOUDFLARE_API_TOKEN
        self.model = model or settings.CLOUDFLARE_MODEL

    async def _run_ai(self, messages: List[Dict[str, str]]) -> str:
        if not self.account_id or not self.api_token:
            raise LLMException("Cloudflare Account ID or API Token not configured.")

        url = f"https://api.cloudflare.com/client/v4/accounts/{self.account_id}/ai/run/{self.model}"
        headers = {
            "Authorization": f"Bearer {self.api_token}",
            "Content-Type": "application/json",
        }
        payload = {"messages": messages}

        async with httpx.AsyncClient(timeout=30.0) as client:
            res = await client.post(url, headers=headers, json=payload)
            if res.status_code != 200:
                raise LLMException(f"Cloudflare Workers AI returned HTTP {res.status_code}: {res.text}")
            data = res.json()
            return data.get("result", {}).get("response", "")

    async def triage_incident(self, url: str, problem_description: str) -> IncidentTriage:
        if settings.DEMO_MODE or not self.api_token:
            return IncidentTriage(
                incident_type="latency",
                severity="high",
                reasoning_summary="Workers AI: High response times reported on target endpoint.",
                selected_tools=["dns", "http", "latency", "security_headers", "https"],
            )

        messages = [
            {"role": "system", "content": TRIAGE_SYSTEM_PROMPT},
            {"role": "user", "content": build_triage_user_prompt(url, problem_description)},
        ]
        raw_output = await self._run_ai(messages)
        parsed = json.loads(extract_json_block(raw_output))
        return IncidentTriage.model_validate(parsed)

    async def analyze_incident(
        self,
        url: str,
        problem_description: str,
        triage: IncidentTriage,
        evidence: List[Dict[str, Any]],
    ) -> AnalysisResult:
        if settings.DEMO_MODE or not self.api_token:
            return AnalysisResult(
                summary="The website is reachable with valid DNS and HTTPS, but HTTP responses exhibit 1,820ms latency.",
                root_cause="Origin server performance saturation",
                confidence=0.84,
                evidence=[
                    "Cloudflare 1.1.1.1 DNS resolved in 45ms",
                    "HTTP layer TTFB was 1,820ms",
                    "HTTPS negotiated cleanly",
                ],
                recommendations=[
                    "Inspect origin CPU and database pool",
                    "Apply Cloudflare Page Rule for 120s Edge Cache",
                ],
                limitations=[
                    "Origin server internal diagnostics were not directly reachable",
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
        raw_output = await self._run_ai(messages)
        parsed = json.loads(extract_json_block(raw_output))
        return AnalysisResult.model_validate(parsed)

    async def follow_up(
        self,
        incident_summary: Dict[str, Any],
        conversation_history: List[Dict[str, str]],
        question: str,
    ) -> str:
        if settings.DEMO_MODE or not self.api_token:
            return (
                "Based on the diagnostic telemetry, DNS and TLS are healthy while origin latency is 1,820ms. "
                "The delay is isolated to the application origin layer."
            )

        messages = [
            {"role": "system", "content": FOLLOWUP_SYSTEM_PROMPT},
            {
                "role": "user",
                "content": build_followup_prompt(incident_summary, conversation_history, question),
            },
        ]
        return await self._run_ai(messages)
