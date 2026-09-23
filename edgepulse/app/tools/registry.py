"""Registry for diagnostic tools with strict allowlisting."""
from typing import Dict, List, Optional
from app.tools.base import DiagnosticTool
from app.tools.dns import DNSTool
from app.tools.http import HTTPTool
from app.tools.https import HTTPSTool
from app.tools.latency import LatencyTool
from app.tools.security_headers import SecurityHeadersTool
from app.utils.errors import ToolExecutionException

AVAILABLE_TOOLS: Dict[str, DiagnosticTool] = {
    "dns": DNSTool(),
    "http": HTTPTool(),
    "latency": LatencyTool(),
    "security_headers": SecurityHeadersTool(),
    "https": HTTPSTool(),
}


def get_tool(tool_name: str) -> DiagnosticTool:
    """Retrieves tool from registry or raises exception if not allowlisted."""
    tool = AVAILABLE_TOOLS.get(tool_name.lower().strip())
    if not tool:
        raise ToolExecutionException(
            tool_name=tool_name,
            message=f"Tool '{tool_name}' is not in the approved allowlist ({list(AVAILABLE_TOOLS.keys())}).",
        )
    return tool


def get_all_tool_names() -> List[str]:
    return list(AVAILABLE_TOOLS.keys())
