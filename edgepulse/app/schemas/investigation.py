"""Pydantic schemas for LLM Triage and Investigation orchestration."""
from datetime import datetime
from typing import List, Literal, Optional
from pydantic import BaseModel, Field, field_validator
from app.schemas.incident import IncidentSeverity, IncidentType

ALLOWLISTED_TOOLS = ["dns", "http", "latency", "security_headers", "https"]


class IncidentTriage(BaseModel):
    """Structured LLM triage classification and tool selection."""
    incident_type: IncidentType = Field(..., description="Classified incident category")
    severity: IncidentSeverity = Field(..., description="Estimated incident severity")
    reasoning_summary: str = Field(..., description="Concise justification without chain-of-thought", max_length=500)
    selected_tools: List[str] = Field(..., description="Allowlisted diagnostic tools to execute")

    @field_validator("selected_tools")
    @classmethod
    def validate_tools(cls, tools: List[str]) -> List[str]:
        if not tools:
            # Default to all tools if empty
            return list(ALLOWLISTED_TOOLS)
        invalid = [t for t in tools if t not in ALLOWLISTED_TOOLS]
        if invalid:
            raise ValueError(f"Selected tools contain disallowed items: {invalid}. Only allowlisted: {ALLOWLISTED_TOOLS}")
        # Deduplicate preserving order
        seen = set()
        deduped = []
        for t in tools:
            if t not in seen:
                seen.add(t)
                deduped.append(t)
        return deduped


class InvestigationStepResponse(BaseModel):
    id: int
    incident_id: str
    step_number: int
    tool_name: str
    status: str
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    duration_ms: Optional[float] = None
    error: Optional[str] = None
    result_summary: Optional[str] = None

    model_config = {"from_attributes": True}
