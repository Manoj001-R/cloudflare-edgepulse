"""HTTP bridge that exposes the Python LLM client to the EdgePulse Worker."""

from __future__ import annotations

import json
import os
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from typing import Any

from .llm import LlmClient


def _json_bytes(value: Any) -> bytes:
    return json.dumps(value, ensure_ascii=True).encode("utf-8")


class LlmBridgeHandler(BaseHTTPRequestHandler):
    server_version = "EdgePulsePythonBridge/1.0"

    def do_GET(self) -> None:  # noqa: N802
        if self.path != "/health":
            self._send_json(404, {"success": False, "error": "Not found"})
            return

        self._send_json(200, {"success": True, "data": {"status": "healthy"}})

    def do_POST(self) -> None:  # noqa: N802
        if self.path != "/v1/llm":
            self._send_json(404, {"success": False, "error": "Not found"})
            return

        expected_token = os.getenv("PYTHON_LLM_TOKEN")
        if expected_token and self.headers.get("Authorization") != f"Bearer {expected_token}":
            self._send_json(401, {"success": False, "error": "Unauthorized"})
            return

        try:
            content_length = int(self.headers.get("Content-Length", "0"))
            if content_length > 1_000_000:
                raise ValueError("Request body is too large")
            body = json.loads(self.rfile.read(content_length))
            operation = body.get("operation")
            system_prompt = body.get("systemPrompt", "")
            user_prompt = body.get("userPrompt", "")
            demo_mode = bool(body.get("demoMode", False))

            if operation not in {"triage", "analyze", "followup"}:
                raise ValueError("operation must be triage, analyze, or followup")
            if not isinstance(system_prompt, str) or not isinstance(user_prompt, str):
                raise ValueError("systemPrompt and userPrompt must be strings")

            client = LlmClient(demo_mode=demo_mode)
            if operation == "triage":
                result = client.triage(system_prompt, user_prompt, demo=demo_mode)
            elif operation == "analyze":
                result = client.analyze(system_prompt, user_prompt, demo=demo_mode)
            else:
                result = client.followup(system_prompt, user_prompt, demo=demo_mode)

            self._send_json(200, {"success": True, "data": result.model_dump()})
        except (ValueError, TypeError, json.JSONDecodeError) as exc:
            self._send_json(400, {"success": False, "error": str(exc)})
        except Exception as exc:  # noqa: BLE001
            self._send_json(502, {"success": False, "error": f"Python LLM request failed: {exc}"})

    def _send_json(self, status: int, payload: dict[str, Any]) -> None:
        response = _json_bytes(payload)
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(response)))
        self.end_headers()
        self.wfile.write(response)

    def log_message(self, format: str, *args: Any) -> None:
        return


def main() -> None:
    host = os.getenv("PYTHON_LLM_HOST", "127.0.0.1")
    port = int(os.getenv("PYTHON_LLM_PORT", "8090"))
    server = ThreadingHTTPServer((host, port), LlmBridgeHandler)
    print(f"EdgePulse Python LLM bridge listening on http://{host}:{port}")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()


if __name__ == "__main__":
    main()