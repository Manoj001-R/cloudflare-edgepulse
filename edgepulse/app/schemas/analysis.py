"""Pydantic schemas for AI Root Cause Analysis and Replay comparison."""
from datetime import datetime
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field, field_validator


class AnalysisResult(BaseModel):
    """Structured Root Cause Analysis output from the LLM."""
    summary: str = Field(..., description="High-level incident summary")
    root_cause: str = Field(..., description="Primary root-cause hypothesis (distinguishing fact from inference)")
    confidence: float = Field(..., description="Analytical confidence score between 0.0 and 1.0 (not statistical probability)", ge=0.0, le=1.0)
    evidence: List[str] = Field(..., description="Concrete observed diagnostic facts that support the conclusion")
    recommendations: List[str] = Field(..., description="Actionable remediation steps")
    limitations: List[str] = Field(..., description="Explicit limitations and uninspected systems")

    @field_validator("confidence")
    @classmethod
    def clamp_confidence(cls, v: float) -> float:
        return max(0.0, min(1.0, round(v, 2)))


class AnalysisResponse(BaseModel):
    incident_id: str
    summary: str
    root_cause: str
    confidence: float
    evidence: List[str]
    recommendations: List[str]
    limitations: List[str]
    created_at: datetime


class MetricComparison(BaseModel):
    metric: str
    previous: str
    current: str
    change: str


class ReplayResponse(BaseModel):
    incident_id: str
    timestamp: datetime
    comparisons: List[MetricComparison]
    new_results: List[Dict[str, Any]]
