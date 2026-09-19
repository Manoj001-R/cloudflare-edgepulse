"""
EdgePulse Incident Investigator Agent.
Orchestrates the entire investigation workflow matching textfile.txt:
1. SSRF URL validation
2. LLM triage & investigation planning
3. Diagnostic tool execution with error tolerance
4. Evidence aggregation & historical comparison
5. LLM root-cause analysis & structured remediation
6. Persistent SQLite commit & follow-up chat
"""

from __future__ import annotations
import datetime
import random
import time
from typing import Any, Callable, Dict, List, Optional

from .llm import LlmClient
from .prompts import (
    get_triage_system_prompt,
    get_triage_user_prompt,
    get_analysis_system_prompt,
    get_analysis_user_prompt,
    get_followup_system_prompt,
    get_followup_user_prompt,
)
from .schemas import (
    TriageResponse,
    AnalysisResponse,
    FollowUpResponse,
    ALLOWED_TOOLS,
)
from .storage import Storage
from .tools import execute_tool
from .validator import validate_url


def generate_incident_id() -> str:
    today_str = datetime.datetime.now(datetime.timezone.utc).strftime("%Y%m%d")
    rand_num = random.randint(1000, 9999)
    return f"INC-{today_str}-{rand_num}"


class IncidentAgent:
    def __init__(
        self,
        storage: Optional[Storage] = None,
        llm_client: Optional[LlmClient] = None,
        demo_mode: bool = False,
    ):
        self.storage = storage or Storage()
        self.llm = llm_client or LlmClient(demo_mode=demo_mode)
        self.demo_mode = demo_mode

    def investigate(
        self,
        target_url: str,
        user_question: str,
        progress_callback: Optional[Callable[[str, str], None]] = None,
    ) -> Dict[str, Any]:
        """
        Run the complete end-to-end incident investigation.
        """
        def report(step_name: str, status: str) -> None:
            if progress_callback:
                progress_callback(step_name, status)

        # ── 1. SSRF URL Validation ──
        report("SSRF Protection", "running")
        val = validate_url(target_url)
        if not val.valid:
            report("SSRF Protection", "failed")
            raise ValueError(f"URL Validation Failed: {val.error}")
        sanitized_url = val.sanitized_url or target_url
        report("SSRF Protection", "completed")

        # ── 2. Create Incident ──
        incident_id = generate_incident_id()
        self.storage.create_incident(incident_id, sanitized_url, user_question)
        self.storage.add_message(
            incident_id,
            "user",
            f"**Target:** {sanitized_url}\n**Problem:** {user_question}",
        )

        # ── 3. LLM Triage ──
        report("AI Triage", "running")
        self.storage.update_incident(incident_id, status="planning")
        self.storage.add_or_update_step(incident_id, "AI Triage", "running")

        triage_sys = get_triage_system_prompt()
        triage_usr = get_triage_user_prompt(sanitized_url, user_question)
        triage: TriageResponse = self.llm.triage(triage_sys, triage_usr, demo=self.demo_mode)

        self.storage.update_incident(
            incident_id,
            incident_type=triage.incidentType,
            severity=triage.severity,
            status="investigating",
        )
        self.storage.add_or_update_step(incident_id, "AI Triage", "completed")
        self.storage.add_message(
            incident_id,
            "assistant",
            f"**Incident Classification:** {triage.incidentType}\n"
            f"**Initial Severity:** {triage.severity}\n"
            f"**Reasoning:** {triage.reason}\n\n"
            f"**Selected Diagnostic Plan:** {', '.join(triage.investigationPlan)}",
        )
        report("AI Triage", "completed")

        # ── 4. Run Diagnostic Tools ──
        tool_results: List[Dict[str, Any]] = []
        for tool_name in triage.investigationPlan:
            report(tool_name, "running")
            self.storage.add_or_update_step(incident_id, tool_name, "running")

            try:
                result = execute_tool(tool_name, sanitized_url, demo=self.demo_mode)
                tool_results.append(result)
                self.storage.save_tool_result(incident_id, tool_name, result)
                self.storage.add_or_update_step(incident_id, tool_name, "completed")
                report(tool_name, "completed")
            except Exception as exc:
                err_msg = str(exc)
                self.storage.add_or_update_step(incident_id, tool_name, "failed", error=err_msg)
                report(tool_name, f"failed: {err_msg}")
                # Continue with other tools — don't crash the workflow

        # ── 5. Historical Context ──
        historical_context = self.storage.get_history_context_for_url(
            sanitized_url, exclude_id=incident_id
        )

        # ── 6. LLM Root Cause Analysis ──
        report("AI Root Cause Analysis", "running")
        self.storage.update_incident(incident_id, status="analyzing")
        self.storage.add_or_update_step(incident_id, "AI Analysis", "running")

        incident_record = self.storage.get_incident(incident_id) or {}
        analysis_sys = get_analysis_system_prompt()
        analysis_usr = get_analysis_user_prompt(
            incident_record, tool_results, historical_context or None
        )
        analysis: AnalysisResponse = self.llm.analyze(
            analysis_sys, analysis_usr, demo=self.demo_mode
        )

        # ── 7. Persist Final Report ──
        analysis_dict = analysis.model_dump()
        self.storage.save_analysis(incident_id, analysis_dict)
        self.storage.update_incident(
            incident_id,
            status="completed",
            severity=analysis.severity,
            confidence=analysis.confidence,
            incident_type=analysis.incidentType,
        )
        self.storage.add_or_update_step(incident_id, "AI Analysis", "completed")

        # Format assistant summary message
        rec_actions_text = "\n".join(
            f"{i+1}. **{a.problem}**: {a.action} (Risk: {a.risk})"
            for i, a in enumerate(analysis.recommendedActions)
        )
        self.storage.add_message(
            incident_id,
            "assistant",
            f"**Investigation Complete**\n\n"
            f"**Summary:** {analysis.summary}\n\n"
            f"**Likely Root Cause:** {analysis.likelyRootCause}\n\n"
            f"**Confidence:** {int(analysis.confidence * 100)}%\n\n"
            f"**Recommended Actions:**\n{rec_actions_text}",
        )
        report("AI Root Cause Analysis", "completed")

        return {
            "incident": self.storage.get_incident(incident_id),
            "triage": triage.model_dump(),
            "tool_results": tool_results,
            "analysis": analysis_dict,
            "steps": self.storage.get_steps(incident_id),
            "messages": self.storage.get_messages(incident_id),
        }

    def replay(self, incident_id: str) -> Dict[str, Any]:
        """
        Replay an existing incident:
        Loads previous tools, reruns diagnostics, and computes delta comparisons.
        """
        incident = self.storage.get_incident(incident_id)
        if not incident:
            raise ValueError(f"Incident {incident_id} not found")

        old_tool_rows = self.storage.get_tool_results(incident_id)
        if not old_tool_rows:
            raise ValueError(f"No diagnostic records found for {incident_id}")

        target_url = incident["target_url"]
        comparisons = []

        for row in old_tool_rows:
            tool_name = row["tool_name"]
            old_res = row["result"]

            # Re-run the tool safely
            new_res = execute_tool(tool_name, target_url, demo=self.demo_mode)

            comparison: Dict[str, Any] = {
                "tool": tool_name,
                "old_status": old_res.get("status"),
                "new_status": new_res.get("status"),
                "changed": old_res.get("status") != new_res.get("status"),
            }

            # Latency delta
            if "latencyMs" in old_res and "latencyMs" in new_res:
                old_lat = old_res["latencyMs"]
                new_lat = new_res["latencyMs"]
                delta = new_lat - old_lat
                comparison["old_latency"] = old_lat
                comparison["new_latency"] = new_lat
                comparison["latency_delta"] = delta
                comparison["changed"] = comparison["changed"] or abs(delta) > 50

            # HTTP status delta
            if "httpStatus" in old_res and "httpStatus" in new_res:
                comparison["old_httpStatus"] = old_res.get("httpStatus")
                comparison["new_httpStatus"] = new_res.get("httpStatus")

            comparisons.append(comparison)

        return {
            "incident_id": incident_id,
            "target_url": target_url,
            "replayed_at": datetime.datetime.now(datetime.timezone.utc).isoformat(),
            "comparisons": comparisons,
        }

    def chat(self, incident_id: str, user_message: str) -> FollowUpResponse:
        """
        Handle a follow-up conversation about an incident.
        """
        incident = self.storage.get_incident(incident_id)
        if not incident:
            raise ValueError(f"Incident {incident_id} not found")

        tool_rows = self.storage.get_tool_results(incident_id)
        tool_results = [r["result"] for r in tool_rows]
        analysis = self.storage.get_analysis(incident_id)

        # Save user message
        self.storage.add_message(incident_id, "user", user_message)

        sys_prompt = get_followup_system_prompt()
        usr_prompt = get_followup_user_prompt(incident, tool_results, analysis, user_message)

        resp = self.llm.followup(sys_prompt, usr_prompt, demo=self.demo_mode)

        # Save assistant message
        self.storage.add_message(incident_id, "assistant", resp.answer)
        return resp
