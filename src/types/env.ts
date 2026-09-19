import { IncidentInvestigationWorkflow } from '../workflows/investigation-workflow';
import { IncidentSession } from '../durable-objects/incident-session';

export interface Env {
  // Workers AI
  AI: Ai;

  // Durable Objects
  INCIDENT_SESSION: DurableObjectNamespace<IncidentSession>;

  // Workflows
  INVESTIGATION_WORKFLOW: Workflow;

  // Environment variables
  ENVIRONMENT: string;
  AI_MODEL: string;
  MAX_INCIDENT_HISTORY: string;
  REQUEST_TIMEOUT_MS: string;
  LATENCY_LOW_MS: string;
  LATENCY_MODERATE_MS: string;
  LATENCY_HIGH_MS: string;
  DEMO_MODE: string;
  PYTHON_LLM_URL?: string;
  PYTHON_LLM_TOKEN?: string;
}

// Re-export for convenience
export type { IncidentInvestigationWorkflow, IncidentSession };
