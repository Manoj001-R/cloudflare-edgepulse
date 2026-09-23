"""LLM Provider Base Interface."""
from abc import ABC, abstractmethod
from typing import Any, Dict, List
from app.schemas.analysis import AnalysisResult
from app.schemas.investigation import IncidentTriage


class LLMProvider(ABC):
    """Abstract interface for all LLM providers (OpenAI, Cloudflare, Custom)."""

    @abstractmethod
    async def triage_incident(self, url: str, problem_description: str) -> IncidentTriage:
        """Classify incident and select allowlisted tools."""
        pass

    @abstractmethod
    async def analyze_incident(
        self,
        url: str,
        problem_description: str,
        triage: IncidentTriage,
        evidence: List[Dict[str, Any]],
    ) -> AnalysisResult:
        """Synthesize collected diagnostic evidence into a root cause analysis."""
        pass

    @abstractmethod
    async def follow_up(
        self,
        incident_summary: Dict[str, Any],
        conversation_history: List[Dict[str, str]],
        question: str,
    ) -> str:
        """Answer follow-up questions strictly from evidence."""
        pass
