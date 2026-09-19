"""
Persistent SQLite Storage for EdgePulse Python.
Mirrors the Durable Object SQLite schema specified in textfile.txt section 16.
"""

from __future__ import annotations
import datetime
import json
import sqlite3
from contextlib import contextmanager
from pathlib import Path
from typing import Any, Dict, List, Optional


def _now_iso() -> str:
    return datetime.datetime.now(datetime.timezone.utc).isoformat()


class Storage:
    def __init__(self, db_path: str = "edgepulse_incidents.db"):
        self.db_path = Path(db_path)
        self._init_db()

    @contextmanager
    def _get_connection(self):
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        conn.execute("PRAGMA foreign_keys = ON")
        try:
            yield conn
            conn.commit()
        finally:
            conn.close()

    def _init_db(self) -> None:
        with self._get_connection() as conn:
            conn.executescript(
                """
                CREATE TABLE IF NOT EXISTS incidents (
                    id TEXT PRIMARY KEY,
                    target_url TEXT NOT NULL,
                    user_question TEXT NOT NULL,
                    incident_type TEXT DEFAULT 'unknown',
                    severity TEXT DEFAULT 'medium',
                    status TEXT DEFAULT 'created',
                    confidence REAL,
                    created_at TEXT NOT NULL,
                    updated_at TEXT NOT NULL
                );

                CREATE TABLE IF NOT EXISTS messages (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    incident_id TEXT NOT NULL,
                    role TEXT NOT NULL,
                    content TEXT NOT NULL,
                    created_at TEXT NOT NULL,
                    FOREIGN KEY (incident_id) REFERENCES incidents(id) ON DELETE CASCADE
                );

                CREATE TABLE IF NOT EXISTS investigation_steps (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    incident_id TEXT NOT NULL,
                    step_name TEXT NOT NULL,
                    status TEXT NOT NULL,
                    started_at TEXT NOT NULL,
                    completed_at TEXT,
                    error TEXT,
                    FOREIGN KEY (incident_id) REFERENCES incidents(id) ON DELETE CASCADE
                );

                CREATE TABLE IF NOT EXISTS tool_results (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    incident_id TEXT NOT NULL,
                    tool_name TEXT NOT NULL,
                    result_json TEXT NOT NULL,
                    created_at TEXT NOT NULL,
                    FOREIGN KEY (incident_id) REFERENCES incidents(id) ON DELETE CASCADE
                );

                CREATE TABLE IF NOT EXISTS analysis (
                    incident_id TEXT PRIMARY KEY,
                    summary TEXT NOT NULL,
                    root_cause TEXT NOT NULL,
                    confidence REAL NOT NULL,
                    analysis_json TEXT NOT NULL,
                    created_at TEXT NOT NULL,
                    FOREIGN KEY (incident_id) REFERENCES incidents(id) ON DELETE CASCADE
                );

                CREATE INDEX IF NOT EXISTS idx_incidents_target_url ON incidents(target_url);
                CREATE INDEX IF NOT EXISTS idx_incidents_created_at ON incidents(created_at DESC);
                """
            )

    # ─── Incidents ─────────────────────────────────────────────

    def create_incident(
        self, incident_id: str, target_url: str, user_question: str
    ) -> Dict[str, Any]:
        now = _now_iso()
        with self._get_connection() as conn:
            conn.execute(
                """
                INSERT INTO incidents (id, target_url, user_question, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?)
                """,
                (incident_id, target_url, user_question, now, now),
            )
        return self.get_incident(incident_id)  # type: ignore

    def update_incident(self, incident_id: str, **kwargs: Any) -> None:
        if not kwargs:
            return
        kwargs["updated_at"] = _now_iso()
        fields = [f"{k} = ?" for k in kwargs.keys()]
        values = list(kwargs.values()) + [incident_id]
        with self._get_connection() as conn:
            conn.execute(
                f"UPDATE incidents SET {', '.join(fields)} WHERE id = ?",
                values,
            )

    def get_incident(self, incident_id: str) -> Optional[Dict[str, Any]]:
        with self._get_connection() as conn:
            cur = conn.execute("SELECT * FROM incidents WHERE id = ?", (incident_id,))
            row = cur.fetchone()
            if not row:
                return None
            return dict(row)

    def list_incidents(
        self,
        limit: int = 50,
        severity: Optional[str] = None,
        incident_type: Optional[str] = None,
        search: Optional[str] = None,
    ) -> List[Dict[str, Any]]:
        query = "SELECT * FROM incidents WHERE 1=1"
        params: List[Any] = []

        if severity:
            query += " AND severity = ?"
            params.append(severity)
        if incident_type:
            query += " AND incident_type = ?"
            params.append(incident_type)
        if search:
            query += " AND (target_url LIKE ? OR user_question LIKE ?)"
            params.extend([f"%{search}%", f"%{search}%"])

        query += " ORDER BY created_at DESC LIMIT ?"
        params.append(limit)

        with self._get_connection() as conn:
            cur = conn.execute(query, params)
            return [dict(r) for r in cur.fetchall()]

    # ─── Messages ──────────────────────────────────────────────

    def add_message(self, incident_id: str, role: str, content: str) -> None:
        with self._get_connection() as conn:
            conn.execute(
                "INSERT INTO messages (incident_id, role, content, created_at) VALUES (?, ?, ?, ?)",
                (incident_id, role, content, _now_iso()),
            )

    def get_messages(self, incident_id: str) -> List[Dict[str, Any]]:
        with self._get_connection() as conn:
            cur = conn.execute(
                "SELECT * FROM messages WHERE incident_id = ? ORDER BY id ASC",
                (incident_id,),
            )
            return [dict(r) for r in cur.fetchall()]

    # ─── Steps ─────────────────────────────────────────────────

    def add_or_update_step(
        self,
        incident_id: str,
        step_name: str,
        status: str,
        error: Optional[str] = None,
    ) -> None:
        now = _now_iso()
        with self._get_connection() as conn:
            cur = conn.execute(
                "SELECT id FROM investigation_steps WHERE incident_id = ? AND step_name = ?",
                (incident_id, step_name),
            )
            row = cur.fetchone()
            if row:
                completed_at = now if status in ("completed", "failed") else None
                conn.execute(
                    """
                    UPDATE investigation_steps
                    SET status = ?, completed_at = COALESCE(?, completed_at), error = ?
                    WHERE id = ?
                    """,
                    (status, completed_at, error, row["id"]),
                )
            else:
                conn.execute(
                    """
                    INSERT INTO investigation_steps (incident_id, step_name, status, started_at, error)
                    VALUES (?, ?, ?, ?, ?)
                    """,
                    (incident_id, step_name, status, now, error),
                )

    def get_steps(self, incident_id: str) -> List[Dict[str, Any]]:
        with self._get_connection() as conn:
            cur = conn.execute(
                "SELECT * FROM investigation_steps WHERE incident_id = ? ORDER BY id ASC",
                (incident_id,),
            )
            return [dict(r) for r in cur.fetchall()]

    # ─── Tool Results ──────────────────────────────────────────

    def save_tool_result(self, incident_id: str, tool_name: str, result_dict: Dict[str, Any]) -> None:
        with self._get_connection() as conn:
            conn.execute(
                "INSERT INTO tool_results (incident_id, tool_name, result_json, created_at) VALUES (?, ?, ?, ?)",
                (incident_id, tool_name, json.dumps(result_dict), _now_iso()),
            )

    def get_tool_results(self, incident_id: str) -> List[Dict[str, Any]]:
        with self._get_connection() as conn:
            cur = conn.execute(
                "SELECT * FROM tool_results WHERE incident_id = ? ORDER BY id ASC",
                (incident_id,),
            )
            rows = cur.fetchall()
            results = []
            for r in rows:
                item = dict(r)
                item["result"] = json.loads(item["result_json"])
                results.append(item)
            return results

    # ─── Analysis ──────────────────────────────────────────────

    def save_analysis(self, incident_id: str, analysis_dict: Dict[str, Any]) -> None:
        with self._get_connection() as conn:
            conn.execute(
                """
                INSERT OR REPLACE INTO analysis (incident_id, summary, root_cause, confidence, analysis_json, created_at)
                VALUES (?, ?, ?, ?, ?, ?)
                """,
                (
                    incident_id,
                    analysis_dict.get("summary", ""),
                    analysis_dict.get("likelyRootCause", ""),
                    float(analysis_dict.get("confidence", 0.0)),
                    json.dumps(analysis_dict),
                    _now_iso(),
                ),
            )

    def get_analysis(self, incident_id: str) -> Optional[Dict[str, Any]]:
        with self._get_connection() as conn:
            cur = conn.execute("SELECT * FROM analysis WHERE incident_id = ?", (incident_id,))
            row = cur.fetchone()
            if not row:
                return None
            return json.loads(row["analysis_json"])

    # ─── History Context for URL ───────────────────────────────

    def get_history_context_for_url(self, target_url: str, exclude_id: Optional[str] = None) -> str:
        with self._get_connection() as conn:
            query = """
                SELECT i.id, i.incident_type, i.severity, i.confidence, a.summary, a.root_cause, i.created_at
                FROM incidents i
                JOIN analysis a ON i.id = a.incident_id
                WHERE i.target_url = ? AND i.status = 'completed'
            """
            params: List[Any] = [target_url]
            if exclude_id:
                query += " AND i.id != ?"
                params.append(exclude_id)
            query += " ORDER BY i.created_at DESC LIMIT 3"

            cur = conn.execute(query, params)
            rows = cur.fetchall()
            if not rows:
                return ""

            lines = ["Previous investigations for this target:"]
            for r in rows:
                lines.append(
                    f"- [{r['id']}] {r['created_at'][:10]}: Type={r['incident_type']}, "
                    f"Severity={r['severity']}, Confidence={int(r['confidence']*100)}%. "
                    f"Root cause: {r['root_cause']}"
                )
            return "\n".join(lines)
