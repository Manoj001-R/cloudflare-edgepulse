"""Pydantic schemas for Incident creation, updates, and responses."""
from datetime import datetime
from typing import Any, Dict, List, Literal, Optional
from pydantic import BaseModel, Field

IncidentType = Literal[
    "availability",
    "latency",
    "dns",
    "tls",
    "http",
    "security",
    "infrastructure",
    "mixed",
    "unknown",
]

IncidentSeverity = Literal["low", "medium", "high", "critical"]

IncidentStatus = Literal[
    "created",
    "planning",
    "investigating",
    "analyzing",
    "completed",
    "failed",
]


class IncidentCreateRequest(BaseModel):
    url: str = Field(..., description="Target website URL (e.g., https://example.com)", json_schema_extra={"example": "https://example.com"})
    problem: str = Field(..., description="Description of the observed problem", json_schema_extra={"example": "Users report slow website responses."})


class IncidentResponse(BaseModel):
    id: str = Field(..., alias="incident_id")
    url: str
    problem: str = Field(..., alias="problem_description")
    type: str = Field(..., alias="incident_type")
    severity: str
    status: str
    confidence: Optional[float] = None
    created_at: datetime
    updated_at: datetime
    completed_at: Optional[datetime] = None
    analysis: Optional[Dict[str, Any]] = None
    steps: Optional[List[Dict[str, Any]]] = None
    results: Optional[List[Dict[str, Any]]] = None

    model_config = {"populate_by_name": True, "from_attributes": True}


class IncidentListResponse(BaseModel):
    incidents: List[IncidentResponse]
    total: int
    limit: int
    offset: int
