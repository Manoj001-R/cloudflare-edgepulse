"""
Pydantic schemas and types for EdgePulse Python.
Strictly mirrors the schema validation requirements defined in textfile.txt.
"""

from __future__ import annotations
from typing import Any, Dict, List, Literal, Optional, Union
from pydantic import BaseModel, Field, field_validator


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

Severity = Literal["low", "medium", "high", "critical"]

AllowedToolName = Literal[
    "check_dns",
    "check_http",
    "check_latency",
    "check_security_headers",
    "check_https_reachability",
]

ALLOWED_TOOLS: List[AllowedToolName] = [
    "check_dns",
    "check_http",
    "check_latency",
    "check_security_headers",
    "check_https_reachability",
]


class TriageResponse(BaseModel):
    incidentType: IncidentType
    severity: Severity
    reason: str = Field(..., min_length=1, max_length=2000)
    investigationPlan: List[AllowedToolName] = Field(..., min_length=1, max_length=5)

    @field_validator("investigationPlan", mode="before")
    @classmethod
    def validate_plan(cls, v: Any) -> List[str]:
        if not isinstance(v, list):
            return ["check_dns", "check_http", "check_latency"]
        seen = set()
        deduped = []
        for tool in v:
            tool_str = str(tool).strip()
            if tool_str in ALLOWED_TOOLS and tool_str not in seen:
                seen.add(tool_str)
                deduped.append(tool_str)
        if not deduped:
            return ["check_dns", "check_http", "check_latency"]
        return deduped


class Finding(BaseModel):
    signal: str
    value: Union[str, int, float, bool]
    interpretation: str


class RecommendedAction(BaseModel):
    problem: str
    evidence: str
    likelyCause: str
    action: str
    risk: str
    validation: str


class AnalysisResponse(BaseModel):
    summary: str = Field(..., min_length=1, max_length=3000)
    incidentType: IncidentType
    severity: Severity
    findings: List[Finding] = Field(..., min_length=1)
    likelyRootCause: str = Field(..., min_length=1, max_length=2000)
    confidence: float = Field(..., ge=0.0, le=1.0)
    recommendedActions: List[RecommendedAction] = Field(..., min_length=1)
    limitations: List[str] = Field(default_factory=list)


class FollowUpResponse(BaseModel):
    answer: str = Field(..., min_length=1)
    additionalContext: Optional[str] = None


class BaseToolResult(BaseModel):
    tool: str
    status: Literal["healthy", "warning", "critical", "unknown"]
    durationMs: int = 0
    error: Optional[str] = None
    timestamp: str = ""
    extra: Dict[str, Any] = Field(default_factory=dict)


class DnsRecord(BaseModel):
    type: str
    value: str
    ttl: Optional[int] = None


class DnsCheckResult(BaseToolResult):
    tool: Literal["check_dns"] = "check_dns"
    hostname: str = ""
    records: List[DnsRecord] = Field(default_factory=list)
    recordCount: int = 0
    nameservers: List[str] = Field(default_factory=list)


class HttpCheckResult(BaseToolResult):
    tool: Literal["check_http"] = "check_http"
    targetUrl: str = ""
    httpStatus: Optional[int] = None
    statusText: Optional[str] = None
    finalUrl: Optional[str] = None
    redirectCount: int = 0
    contentType: Optional[str] = None
    server: Optional[str] = None
    contentLength: Optional[int] = None


class LatencyCheckResult(BaseToolResult):
    tool: Literal["check_latency"] = "check_latency"
    latencyMs: int = 0
    classification: Literal["low", "moderate", "high", "critical"] = "low"
    samples: List[int] = Field(default_factory=list)


class SecurityHeadersResult(BaseToolResult):
    tool: Literal["check_security_headers"] = "check_security_headers"
    score: int = 0
    maxScore: int = 6
    present: List[str] = Field(default_factory=list)
    missing: List[str] = Field(default_factory=list)
    headerDetails: Dict[str, Optional[str]] = Field(default_factory=dict)


class HttpsReachabilityResult(BaseToolResult):
    tool: Literal["check_https_reachability"] = "check_https_reachability"
    httpsSupported: bool = False
    httpAccessible: bool = False
    enforcesHttps: bool = False
    redirectsToHttps: bool = False


ToolResultUnion = Union[
    DnsCheckResult,
    HttpCheckResult,
    LatencyCheckResult,
    SecurityHeadersResult,
    HttpsReachabilityResult,
    BaseToolResult,
]
