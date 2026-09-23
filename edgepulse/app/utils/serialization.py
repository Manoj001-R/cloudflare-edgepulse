"""JSON serialization helpers and safe dictionary converters."""
import json
from datetime import datetime
from typing import Any, Dict


class CustomJSONEncoder(json.JSONEncoder):
    def default(self, obj: Any) -> Any:
        if isinstance(obj, datetime):
            return obj.isoformat()
        return super().default(obj)


def to_json_str(obj: Any) -> str:
    return json.dumps(obj, cls=CustomJSONEncoder)


def parse_json_safely(payload: str | bytes | None, default: Any = None) -> Any:
    if not payload:
        return default or {}
    try:
        return json.loads(payload)
    except Exception:
        return default or {}
