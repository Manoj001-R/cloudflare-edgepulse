/**
 * IncidentSession Durable Object
 * SQLite-backed persistent storage for incidents, messages, investigation steps,
 * tool results, and analysis.
 */

import { DurableObject } from 'cloudflare:workers';
import type { Env } from '../types/env';
import type {
  Incident, Message, InvestigationStep, ToolResult,
  AnalysisResponse, IncidentStatus, Severity, IncidentType,
  DashboardStats, MessageRole, StepStatus,
} from '../types/index';
import { generateId, now } from '../utils/helpers';

export class IncidentSession extends DurableObject {
  private initialized = false;

  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);
  }

  private ensureInitialized(): void {
    if (this.initialized) return;

    this.ctx.storage.sql.exec(`
      CREATE TABLE IF NOT EXISTS incidents (
        id TEXT PRIMARY KEY,
        target_url TEXT NOT NULL,
        user_question TEXT NOT NULL,
        incident_type TEXT NOT NULL DEFAULT 'unknown',
        severity TEXT NOT NULL DEFAULT 'medium',
        status TEXT NOT NULL DEFAULT 'created',
        confidence REAL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      )
    `);

    this.ctx.storage.sql.exec(`
      CREATE TABLE IF NOT EXISTS messages (
        id TEXT PRIMARY KEY,
        incident_id TEXT NOT NULL,
        role TEXT NOT NULL,
        content TEXT NOT NULL,
        created_at TEXT NOT NULL
      )
    `);

    this.ctx.storage.sql.exec(`
      CREATE TABLE IF NOT EXISTS investigation_steps (
        id TEXT PRIMARY KEY,
        incident_id TEXT NOT NULL,
        step_name TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'pending',
        started_at TEXT,
        completed_at TEXT,
        error TEXT
      )
    `);

    this.ctx.storage.sql.exec(`
      CREATE TABLE IF NOT EXISTS tool_results (
        id TEXT PRIMARY KEY,
        incident_id TEXT NOT NULL,
        tool_name TEXT NOT NULL,
        result_json TEXT NOT NULL,
        created_at TEXT NOT NULL
      )
    `);

    this.ctx.storage.sql.exec(`
      CREATE TABLE IF NOT EXISTS analysis (
        incident_id TEXT PRIMARY KEY,
        summary TEXT,
        root_cause TEXT,
        confidence REAL,
        analysis_json TEXT NOT NULL,
        created_at TEXT NOT NULL
      )
    `);

    this.initialized = true;
  }

  // ─── HTTP Handler ─────────────────────────────────────────────

  async fetch(request: Request): Promise<Response> {
    this.ensureInitialized();
    const url = new URL(request.url);
    const path = url.pathname;
    const method = request.method;

    try {
      // Incident CRUD
      if (method === 'POST' && path === '/incident') {
        const data = await request.json() as {
          id: string;
          targetUrl: string;
          userQuestion: string;
        };
        return json(this.createIncident(data.id, data.targetUrl, data.userQuestion));
      }

      if (method === 'GET' && path.startsWith('/incident/')) {
        const id = path.split('/')[2];
        return json(this.getIncident(id));
      }

      if (method === 'PATCH' && path.startsWith('/incident/')) {
        const id = path.split('/')[2];
        const data = await request.json() as Partial<Incident>;
        return json(this.updateIncident(id, data));
      }

      if (method === 'GET' && path === '/incidents') {
        const limit = parseInt(url.searchParams.get('limit') || '50');
        const offset = parseInt(url.searchParams.get('offset') || '0');
        const severity = url.searchParams.get('severity') || undefined;
        const type = url.searchParams.get('type') || undefined;
        const status = url.searchParams.get('status') || undefined;
        const search = url.searchParams.get('search') || undefined;
        return json(this.listIncidents(limit, offset, severity, type, status, search));
      }

      // Messages
      if (method === 'POST' && path === '/message') {
        const data = await request.json() as {
          incidentId: string;
          role: MessageRole;
          content: string;
        };
        return json(this.addMessage(data.incidentId, data.role, data.content));
      }

      if (method === 'GET' && path.startsWith('/messages/')) {
        const incidentId = path.split('/')[2];
        return json(this.getMessages(incidentId));
      }

      // Investigation Steps
      if (method === 'POST' && path === '/step') {
        const data = await request.json() as {
          incidentId: string;
          stepName: string;
        };
        return json(this.addStep(data.incidentId, data.stepName));
      }

      if (method === 'PATCH' && path === '/step') {
        const data = await request.json() as {
          incidentId: string;
          stepName: string;
          status: StepStatus;
          error?: string;
        };
        return json(this.updateStep(data.incidentId, data.stepName, data.status, data.error));
      }

      if (method === 'GET' && path.startsWith('/steps/')) {
        const incidentId = path.split('/')[2];
        return json(this.getSteps(incidentId));
      }

      // Tool Results
      if (method === 'POST' && path === '/tool-result') {
        const data = await request.json() as {
          incidentId: string;
          toolName: string;
          result: ToolResult;
        };
        return json(this.addToolResult(data.incidentId, data.toolName, data.result));
      }

      if (method === 'GET' && path.startsWith('/tool-results/')) {
        const incidentId = path.split('/')[2];
        return json(this.getToolResults(incidentId));
      }

      // Analysis
      if (method === 'POST' && path === '/analysis') {
        const data = await request.json() as {
          incidentId: string;
          analysis: AnalysisResponse;
        };
        return json(this.saveAnalysis(data.incidentId, data.analysis));
      }

      if (method === 'GET' && path.startsWith('/analysis/')) {
        const incidentId = path.split('/')[2];
        return json(this.getAnalysis(incidentId));
      }

      // Dashboard Stats
      if (method === 'GET' && path === '/stats') {
        return json(this.getStats());
      }

      // Historical context
      if (method === 'GET' && path.startsWith('/history-context/')) {
        const targetUrl = decodeURIComponent(path.split('/')[2]);
        return json(this.getHistoricalContext(targetUrl));
      }

      return new Response('Not Found', { status: 404 });
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Unknown error';
      return new Response(JSON.stringify({ error: errorMsg }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }
  }

  // ─── Incident Methods ─────────────────────────────────────────

  private createIncident(id: string, targetUrl: string, userQuestion: string): Incident {
    const timestamp = now();
    this.ctx.storage.sql.exec(
      `INSERT INTO incidents (id, target_url, user_question, incident_type, severity, status, created_at, updated_at)
       VALUES (?, ?, ?, 'unknown', 'medium', 'created', ?, ?)`,
      id, targetUrl, userQuestion, timestamp, timestamp
    );

    return {
      id, targetUrl, userQuestion,
      incidentType: 'unknown', severity: 'medium', status: 'created',
      confidence: null, createdAt: timestamp, updatedAt: timestamp,
    };
  }

  private getIncident(id: string): Incident | null {
    const rows = this.ctx.storage.sql.exec<{
      id: string; target_url: string; user_question: string;
      incident_type: string; severity: string; status: string;
      confidence: number | null; created_at: string; updated_at: string;
    }>(`SELECT * FROM incidents WHERE id = ?`, id).toArray();

    if (rows.length === 0) return null;
    const r = rows[0];
    return {
      id: r.id, targetUrl: r.target_url, userQuestion: r.user_question,
      incidentType: r.incident_type as IncidentType, severity: r.severity as Severity,
      status: r.status as IncidentStatus, confidence: r.confidence,
      createdAt: r.created_at, updatedAt: r.updated_at,
    };
  }

  private updateIncident(id: string, updates: Partial<Incident>): Incident | null {
    const timestamp = now();
    const sets: string[] = ['updated_at = ?'];
    const values: unknown[] = [timestamp];

    if (updates.incidentType !== undefined) {
      sets.push('incident_type = ?'); values.push(updates.incidentType);
    }
    if (updates.severity !== undefined) {
      sets.push('severity = ?'); values.push(updates.severity);
    }
    if (updates.status !== undefined) {
      sets.push('status = ?'); values.push(updates.status);
    }
    if (updates.confidence !== undefined) {
      sets.push('confidence = ?'); values.push(updates.confidence);
    }

    values.push(id);
    this.ctx.storage.sql.exec(
      `UPDATE incidents SET ${sets.join(', ')} WHERE id = ?`,
      ...values
    );

    return this.getIncident(id);
  }

  private listIncidents(
    limit: number, offset: number,
    severity?: string, type?: string, status?: string, search?: string
  ): { incidents: Incident[]; total: number } {
    let where = 'WHERE 1=1';
    const params: unknown[] = [];

    if (severity) { where += ' AND severity = ?'; params.push(severity); }
    if (type) { where += ' AND incident_type = ?'; params.push(type); }
    if (status) { where += ' AND status = ?'; params.push(status); }
    if (search) {
      where += ' AND (target_url LIKE ? OR user_question LIKE ? OR id LIKE ?)';
      const pattern = `%${search}%`;
      params.push(pattern, pattern, pattern);
    }

    const countRows = this.ctx.storage.sql.exec<{ cnt: number }>(
      `SELECT COUNT(*) as cnt FROM incidents ${where}`, ...params
    ).toArray();
    const total = countRows[0]?.cnt || 0;

    const rows = this.ctx.storage.sql.exec<{
      id: string; target_url: string; user_question: string;
      incident_type: string; severity: string; status: string;
      confidence: number | null; created_at: string; updated_at: string;
    }>(`SELECT * FROM incidents ${where} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
      ...params, limit, offset
    ).toArray();

    const incidents: Incident[] = rows.map((r) => ({
      id: r.id, targetUrl: r.target_url, userQuestion: r.user_question,
      incidentType: r.incident_type as IncidentType, severity: r.severity as Severity,
      status: r.status as IncidentStatus, confidence: r.confidence,
      createdAt: r.created_at, updatedAt: r.updated_at,
    }));

    return { incidents, total };
  }

  // ─── Message Methods ──────────────────────────────────────────

  private addMessage(incidentId: string, role: MessageRole, content: string): Message {
    const id = generateId();
    const timestamp = now();
    this.ctx.storage.sql.exec(
      `INSERT INTO messages (id, incident_id, role, content, created_at)
       VALUES (?, ?, ?, ?, ?)`,
      id, incidentId, role, content, timestamp
    );
    return { id, incidentId, role, content, createdAt: timestamp };
  }

  private getMessages(incidentId: string): Message[] {
    return this.ctx.storage.sql.exec<{
      id: string; incident_id: string; role: string;
      content: string; created_at: string;
    }>(
      `SELECT * FROM messages WHERE incident_id = ? ORDER BY created_at ASC`,
      incidentId
    ).toArray().map((r) => ({
      id: r.id, incidentId: r.incident_id,
      role: r.role as MessageRole, content: r.content,
      createdAt: r.created_at,
    }));
  }

  // ─── Step Methods ─────────────────────────────────────────────

  private addStep(incidentId: string, stepName: string): InvestigationStep {
    const id = generateId();
    this.ctx.storage.sql.exec(
      `INSERT INTO investigation_steps (id, incident_id, step_name, status)
       VALUES (?, ?, ?, 'pending')`,
      id, incidentId, stepName
    );
    return {
      id, incidentId, stepName, status: 'pending',
      startedAt: null, completedAt: null, error: null,
    };
  }

  private updateStep(
    incidentId: string, stepName: string, status: StepStatus, error?: string
  ): void {
    const timestamp = now();
    if (status === 'running') {
      this.ctx.storage.sql.exec(
        `UPDATE investigation_steps SET status = ?, started_at = ? WHERE incident_id = ? AND step_name = ?`,
        status, timestamp, incidentId, stepName
      );
    } else if (status === 'completed' || status === 'failed') {
      this.ctx.storage.sql.exec(
        `UPDATE investigation_steps SET status = ?, completed_at = ?, error = ? WHERE incident_id = ? AND step_name = ?`,
        status, timestamp, error || null, incidentId, stepName
      );
    } else {
      this.ctx.storage.sql.exec(
        `UPDATE investigation_steps SET status = ? WHERE incident_id = ? AND step_name = ?`,
        status, incidentId, stepName
      );
    }
  }

  private getSteps(incidentId: string): InvestigationStep[] {
    return this.ctx.storage.sql.exec<{
      id: string; incident_id: string; step_name: string;
      status: string; started_at: string | null;
      completed_at: string | null; error: string | null;
    }>(
      `SELECT * FROM investigation_steps WHERE incident_id = ? ORDER BY rowid ASC`,
      incidentId
    ).toArray().map((r) => ({
      id: r.id, incidentId: r.incident_id, stepName: r.step_name,
      status: r.status as StepStatus, startedAt: r.started_at,
      completedAt: r.completed_at, error: r.error,
    }));
  }

  // ─── Tool Result Methods ──────────────────────────────────────

  private addToolResult(incidentId: string, toolName: string, result: ToolResult): void {
    const id = generateId();
    this.ctx.storage.sql.exec(
      `INSERT INTO tool_results (id, incident_id, tool_name, result_json, created_at)
       VALUES (?, ?, ?, ?, ?)`,
      id, incidentId, toolName, JSON.stringify(result), now()
    );
  }

  private getToolResults(incidentId: string): ToolResult[] {
    return this.ctx.storage.sql.exec<{
      result_json: string;
    }>(
      `SELECT result_json FROM tool_results WHERE incident_id = ? ORDER BY created_at ASC`,
      incidentId
    ).toArray().map((r) => JSON.parse(r.result_json) as ToolResult);
  }

  // ─── Analysis Methods ─────────────────────────────────────────

  private saveAnalysis(incidentId: string, analysis: AnalysisResponse): void {
    this.ctx.storage.sql.exec(
      `INSERT OR REPLACE INTO analysis (incident_id, summary, root_cause, confidence, analysis_json, created_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
      incidentId, analysis.summary, analysis.likelyRootCause,
      analysis.confidence, JSON.stringify(analysis), now()
    );
  }

  private getAnalysis(incidentId: string): AnalysisResponse | null {
    const rows = this.ctx.storage.sql.exec<{
      analysis_json: string;
    }>(
      `SELECT analysis_json FROM analysis WHERE incident_id = ?`,
      incidentId
    ).toArray();

    if (rows.length === 0) return null;
    return JSON.parse(rows[0].analysis_json) as AnalysisResponse;
  }

  // ─── Stats Methods ────────────────────────────────────────────

  private getStats(): DashboardStats {
    const active = this.ctx.storage.sql.exec<{ cnt: number }>(
      `SELECT COUNT(*) as cnt FROM incidents WHERE status IN ('created','planning','investigating','analyzing')`
    ).toArray()[0]?.cnt || 0;

    const completed = this.ctx.storage.sql.exec<{ cnt: number }>(
      `SELECT COUNT(*) as cnt FROM incidents WHERE status = 'completed'`
    ).toArray()[0]?.cnt || 0;

    const critical = this.ctx.storage.sql.exec<{ cnt: number }>(
      `SELECT COUNT(*) as cnt FROM incidents WHERE severity = 'critical'`
    ).toArray()[0]?.cnt || 0;

    // Average investigation time for completed incidents
    const avgRow = this.ctx.storage.sql.exec<{ avg_time: number | null }>(
      `SELECT AVG(
        (julianday(updated_at) - julianday(created_at)) * 86400000
      ) as avg_time FROM incidents WHERE status = 'completed'`
    ).toArray();
    const averageInvestigationTimeMs = Math.round(avgRow[0]?.avg_time || 0);

    return {
      activeInvestigations: active,
      completedInvestigations: completed,
      criticalIncidents: critical,
      averageInvestigationTimeMs,
    };
  }

  // ─── Historical Context ───────────────────────────────────────

  private getHistoricalContext(targetUrl: string): string {
    const rows = this.ctx.storage.sql.exec<{
      id: string; incident_type: string; severity: string;
      confidence: number | null; created_at: string;
    }>(
      `SELECT id, incident_type, severity, confidence, created_at
       FROM incidents WHERE target_url = ? AND status = 'completed'
       ORDER BY created_at DESC LIMIT 5`,
      targetUrl
    ).toArray();

    if (rows.length === 0) return '';

    return rows.map((r) =>
      `Previous incident ${r.id} (${r.created_at}): type=${r.incident_type}, severity=${r.severity}, confidence=${r.confidence}`
    ).join('\n');
  }
}

function json(data: unknown): Response {
  const payload = data === undefined ? { success: true } : data;
  return new Response(JSON.stringify(payload), {
    headers: { 'Content-Type': 'application/json' },
  });
}
