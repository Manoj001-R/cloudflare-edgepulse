"""Pydantic schemas for Diagnostic Tools execution results."""
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


class ToolTestRequest(BaseModel):
    url: str = Field(..., description="Target URL to test", json_schema_extra={"example": "https://example.com"})
    tool: str = Field(..., description="Diagnostic tool name (dns, http, latency, security_headers, https)", json_schema_extra={"example": "dns"})


class DNSResult(BaseModel):
    tool: str = "dns"
    success: bool
    domain: str
    records: Dict[str, List[str]] = Field(default_factory=dict)
    response_time_ms: float
    resolver: str = "https://1.1.1.1/dns-query"
    error: Optional[str] = None


class HTTPResult(BaseModel):
    tool: str = "http"
    success: bool
    status_code: Optional[int] = None
    response_time_ms: float
    redirects: List[str] = Field(default_factory=list)
    headers: Dict[str, str] = Field(default_factory=dict)
    content_type: Optional[str] = None
    server: Optional[str] = None
    final_url: Optional[str] = None
    error: Optional[str] = None


class LatencyResult(BaseModel):
    tool: str = "latency"
    success: bool
    samples: List[float] = Field(default_factory=list)
    minimum_ms: float
    maximum_ms: float
    average_ms: float
    median_ms: float
    classification: str  # LOW, MODERATE, HIGH, CRITICAL
    error: Optional[str] = None


class SecurityHeadersResult(BaseModel):
    tool: str = "security_headers"
    success: bool
    score: int
    total: int = 6
    present: List[str] = Field(default_factory=list)
    missing: List[str] = Field(default_factory=list)
    details: Dict[str, str] = Field(default_factory=dict)
    error: Optional[str] = None


class HTTPSResult(BaseModel):
    tool: str = "https"
    success: bool
    https_accessible: bool
    http_accessible: bool
    redirect_to_https: bool
    final_url: str
    status_code: Optional[int] = None
    error: Optional[str] = None
