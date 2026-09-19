// ─── Incident Types ───────────────────────────────────────────────

export type IncidentStatus = 'created' | 'planning' | 'investigating' | 'analyzing' | 'completed' | 'failed';
export type Severity = 'low' | 'medium' | 'high' | 'critical';
export type IncidentType = 'availability' | 'latency' | 'dns' | 'tls' | 'http' | 'security' | 'infrastructure' | 'mixed' | 'unknown';

export type ToolName = 'check_dns' | 'check_http' | 'check_latency' | 'check_security_headers' | 'check_https_reachability';

export const ALLOWED_TOOLS: ToolName[] = [
  'check_dns',
  'check_http',
  'check_latency',
  'check_security_headers',
  'check_https_reachability',
];

export type ToolStatus = 'healthy' | 'warning' | 'critical' | 'error' | 'unknown';
export type LatencyClassification = 'low' | 'moderate' | 'high' | 'critical';

// ─── Incident ─────────────────────────────────────────────────────

export interface Incident {
  id: string;
  targetUrl: string;
  userQuestion: string;
  incidentType: IncidentType;
  severity: Severity;
  status: IncidentStatus;
  confidence: number | null;
  createdAt: string;
  updatedAt: string;
}

// ─── Messages ─────────────────────────────────────────────────────

export type MessageRole = 'user' | 'assistant' | 'system';

export interface Message {
  id: string;
  incidentId: string;
  role: MessageRole;
  content: string;
  createdAt: string;
}

// ─── Investigation ────────────────────────────────────────────────

export type StepStatus = 'pending' | 'running' | 'completed' | 'failed' | 'skipped';

export interface InvestigationStep {
  id: string;
  incidentId: string;
  stepName: string;
  status: StepStatus;
  startedAt: string | null;
  completedAt: string | null;
  error: string | null;
}

// ─── Tool Results ─────────────────────────────────────────────────

export interface BaseToolResult {
  tool: ToolName;
  status: ToolStatus;
  durationMs: number;
  error: string | null;
  isDemo: boolean;
}

export interface DnsResult extends BaseToolResult {
  tool: 'check_dns';
  records: DnsRecord[];
  responseTimeMs: number;
}

export interface DnsRecord {
  type: string;
  name: string;
  value: string;
  ttl: number;
}

export interface HttpResult extends BaseToolResult {
  tool: 'check_http';
  httpStatus: number | null;
  latencyMs: number;
  finalUrl: string | null;
  contentType: string | null;
  server: string | null;
  redirected: boolean;
}

export interface LatencyResult extends BaseToolResult {
  tool: 'check_latency';
  latencyMs: number;
  classification: LatencyClassification;
  measurements: number[];
}

export interface SecurityHeadersResult extends BaseToolResult {
  tool: 'check_security_headers';
  present: SecurityHeader[];
  missing: string[];
  score: number;
  maxScore: number;
}

export interface SecurityHeader {
  name: string;
  value: string;
}

export interface HttpsReachabilityResult extends BaseToolResult {
  tool: 'check_https_reachability';
  httpsAccessible: boolean;
  httpAccessible: boolean;
  redirectsToHttps: boolean;
  finalUrl: string | null;
}

export type ToolResult = DnsResult | HttpResult | LatencyResult | SecurityHeadersResult | HttpsReachabilityResult;

// ─── LLM Types ────────────────────────────────────────────────────

export interface TriageResponse {
  incidentType: IncidentType;
  severity: Severity;
  reason: string;
  investigationPlan: ToolName[];
}

export interface Finding {
  signal: string;
  value: string | number;
  interpretation: string;
}

export interface RecommendedAction {
  problem: string;
  evidence: string;
  likelyCause: string;
  action: string;
  risk: string;
  validation: string;
}

export interface AnalysisResponse {
  summary: string;
  incidentType: IncidentType;
  severity: Severity;
  findings: Finding[];
  likelyRootCause: string;
  confidence: number;
  recommendedActions: RecommendedAction[];
  limitations: string[];
}

export interface FollowUpResponse {
  answer: string;
  additionalContext: string | null;
}

// ─── Analysis Record ──────────────────────────────────────────────

export interface AnalysisRecord {
  incidentId: string;
  summary: string;
  rootCause: string;
  confidence: number;
  analysisJson: string;
  createdAt: string;
}

// ─── API Types ────────────────────────────────────────────────────

export interface CreateIncidentRequest {
  targetUrl: string;
  userQuestion: string;
  demoMode?: boolean;
}

export interface ChatRequest {
  message: string;
  demoMode?: boolean;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string | null;
}

// ─── Workflow Types ───────────────────────────────────────────────

export interface WorkflowInput {
  incidentId: string;
  targetUrl: string;
  userQuestion: string;
  demoMode: boolean;
}

// ─── Replay Types ─────────────────────────────────────────────────

export interface ReplayComparison {
  tool: ToolName;
  previous: ToolResult;
  current: ToolResult;
  changes: ComparisonChange[];
}

export interface ComparisonChange {
  field: string;
  previousValue: string | number;
  currentValue: string | number;
  difference: string;
}

// ─── Dashboard Types ──────────────────────────────────────────────

export interface DashboardStats {
  activeInvestigations: number;
  completedInvestigations: number;
  criticalIncidents: number;
  averageInvestigationTimeMs: number;
}
