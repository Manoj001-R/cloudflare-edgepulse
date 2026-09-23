"""Base interface for all EdgePulse Diagnostic Tools."""
from abc import ABC, abstractmethod
from typing import Any, Dict


class DiagnosticTool(ABC):
    """Abstract base class for diagnostic tools."""

    name: str
    description: str

    @abstractmethod
    async def run(self, url: str) -> Dict[str, Any]:
        """Executes the diagnostic probe against the given validated URL."""
        pass
