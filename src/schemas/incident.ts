import { z } from 'zod';
import { ALLOWED_TOOLS } from '../types/index';

// ─── Triage Schema ────────────────────────────────────────────────

export const TriageResponseSchema = z.object({
  incidentType: z.enum([
    'availability', 'latency', 'dns', 'tls', 'http',
    'security', 'infrastructure', 'mixed', 'unknown',
  ]),
  severity: z.enum(['low', 'medium', 'high', 'critical']),
  reason: z.string().min(1).max(1000),
  investigationPlan: z.array(
    z.enum([
      'check_dns', 'check_http', 'check_latency',
      'check_security_headers', 'check_https_reachability',
    ])
  ).min(1).max(ALLOWED_TOOLS.length),
});

// ─── Analysis Schema ──────────────────────────────────────────────

export const FindingSchema = z.object({
  signal: z.string(),
  value: z.union([z.string(), z.number()]),
  interpretation: z.string(),
});

export const RecommendedActionSchema = z.object({
  problem: z.string(),
  evidence: z.string(),
  likelyCause: z.string(),
  action: z.string(),
  risk: z.string(),
  validation: z.string(),
});

export const AnalysisResponseSchema = z.object({
  summary: z.string().min(1).max(3000),
  incidentType: z.enum([
    'availability', 'latency', 'dns', 'tls', 'http',
    'security', 'infrastructure', 'mixed', 'unknown',
  ]),
  severity: z.enum(['low', 'medium', 'high', 'critical']),
  findings: z.array(FindingSchema).min(1),
  likelyRootCause: z.string().min(1).max(2000),
  confidence: z.number().min(0).max(1),
  recommendedActions: z.array(RecommendedActionSchema).min(1),
  limitations: z.array(z.string()),
});

// ─── Follow-Up Schema ────────────────────────────────────────────

export const FollowUpResponseSchema = z.object({
  answer: z.string().min(1).max(3000),
  additionalContext: z.string().nullable(),
});

// ─── API Request Schemas ──────────────────────────────────────────

export const CreateIncidentSchema = z.object({
  targetUrl: z.string().url('Must be a valid URL'),
  userQuestion: z.string().min(5, 'Problem description must be at least 5 characters').max(2000),
  demoMode: z.boolean().optional().default(false),
});

export const ChatRequestSchema = z.object({
  message: z.string().min(1, 'Message cannot be empty').max(2000),
  demoMode: z.boolean().optional().default(false),
});
