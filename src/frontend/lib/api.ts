/**
 * Frontend API Client
 * Typed HTTP client for all EdgePulse API endpoints.
 */

const API_BASE = '/api';

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const url = `${API_BASE}${path}`;
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
  });

  const data = (await res.json()) as any;

  if (!res.ok || !data.success) {
    throw new Error(data.error || `Request failed: ${res.status}`);
  }

  return data.data as T;
}

// ─── Incidents ──────────────────────────────────────────

export interface CreateIncidentPayload {
  targetUrl: string;
  userQuestion: string;
  demoMode?: boolean;
}

export async function createIncident(payload: CreateIncidentPayload) {
  return request<any>('/incidents', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function getIncident(id: string) {
  return request<{ incident: any; analysis: any }>(`/incidents/${id}`);
}

export async function listIncidents(params?: {
  limit?: number;
  offset?: number;
  severity?: string;
  type?: string;
  status?: string;
  search?: string;
}) {
  const searchParams = new URLSearchParams();
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== '') {
        searchParams.set(key, String(value));
      }
    });
  }
  const query = searchParams.toString();
  return request<{ incidents: any[]; total: number }>(
    `/incidents${query ? `?${query}` : ''}`
  );
}

// ─── Messages ───────────────────────────────────────────

export async function getMessages(incidentId: string) {
  return request<any[]>(`/incidents/${incidentId}/messages`);
}

// ─── Steps ──────────────────────────────────────────────

export async function getSteps(incidentId: string) {
  return request<any[]>(`/incidents/${incidentId}/steps`);
}

// ─── Tool Results ───────────────────────────────────────

export async function getToolResults(incidentId: string) {
  return request<any[]>(`/incidents/${incidentId}/results`);
}

// ─── Analysis ───────────────────────────────────────────

export async function getAnalysis(incidentId: string) {
  return request<any>(`/incidents/${incidentId}/analysis`);
}

// ─── Chat ───────────────────────────────────────────────

export async function sendChat(incidentId: string, message: string) {
  return request<{ answer: string; additionalContext: string | null }>(
    `/incidents/${incidentId}/chat`,
    { method: 'POST', body: JSON.stringify({ message }) }
  );
}

// ─── Replay ─────────────────────────────────────────────

export async function replayIncident(incidentId: string, demoMode?: boolean) {
  return request<{ comparisons: any[]; incident: any }>(
    `/incidents/${incidentId}/replay`,
    { method: 'POST', body: JSON.stringify({ demoMode }) }
  );
}

// ─── Stats ──────────────────────────────────────────────

export async function getStats() {
  return request<{
    activeInvestigations: number;
    completedInvestigations: number;
    criticalIncidents: number;
    averageInvestigationTimeMs: number;
  }>('/stats');
}

// ─── Health ─────────────────────────────────────────────

export async function checkHealth() {
  return request<{ status: string; timestamp: string; version: string }>('/health');
}
