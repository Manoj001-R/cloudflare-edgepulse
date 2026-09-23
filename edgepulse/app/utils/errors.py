"""Custom application exceptions and error handlers."""
from fastapi import HTTPException, status


class EdgePulseException(Exception):
    """Base exception for EdgePulse errors."""
    def __init__(self, code: str, message: str, status_code: int = status.HTTP_400_BAD_REQUEST):
        self.code = code
        self.message = message
        self.status_code = status_code
        super().__init__(message)


class SSRFBlockedException(EdgePulseException):
    def __init__(self, message: str = "The target URL resolves to a prohibited private or internal address."):
        super().__init__(code="SSRF_BLOCKED", message=message, status_code=status.HTTP_403_FORBIDDEN)


class InvalidURLException(EdgePulseException):
    def __init__(self, message: str = "The provided URL is invalid or uses an unsupported scheme."):
        super().__init__(code="INVALID_URL", message=message, status_code=status.HTTP_400_BAD_REQUEST)


class IncidentNotFoundException(EdgePulseException):
    def __init__(self, incident_id: str):
        super().__init__(code="INCIDENT_NOT_FOUND", message=f"Incident '{incident_id}' was not found.", status_code=status.HTTP_404_NOT_FOUND)


class LLMException(EdgePulseException):
    def __init__(self, message: str = "LLM provider failed to generate a valid structured response."):
        super().__init__(code="LLM_FAILURE", message=message, status_code=status.HTTP_502_BAD_GATEWAY)


class ToolExecutionException(EdgePulseException):
    def __init__(self, tool_name: str, message: str):
        super().__init__(code="TOOL_EXECUTION_ERROR", message=f"Tool '{tool_name}' failed: {message}", status_code=status.HTTP_500_INTERNAL_SERVER_ERROR)
