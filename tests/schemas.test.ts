import { describe, it, expect } from 'vitest';
import { TriageResponseSchema, AnalysisResponseSchema, FollowUpResponseSchema, CreateIncidentSchema } from '../src/schemas/incident';

describe('Triage Response Schema', () => {
  it('validates a correct triage response', () => {
    const valid = {
      incidentType: 'latency',
      severity: 'high',
      reason: 'User reports slow website',
      investigationPlan: ['check_dns', 'check_http', 'check_latency'],
    };
    expect(() => TriageResponseSchema.parse(valid)).not.toThrow();
  });

  it('rejects missing fields', () => {
    expect(() => TriageResponseSchema.parse({})).toThrow();
  });

  it('rejects invalid incident type', () => {
    const invalid = {
      incidentType: 'invalid_type',
      severity: 'high',
      reason: 'test',
      investigationPlan: ['check_dns'],
    };
    expect(() => TriageResponseSchema.parse(invalid)).toThrow();
  });

  it('rejects invalid tool name', () => {
    const invalid = {
      incidentType: 'latency',
      severity: 'high',
      reason: 'test',
      investigationPlan: ['check_dns', 'run_shell_command'],
    };
    expect(() => TriageResponseSchema.parse(invalid)).toThrow();
  });

  it('rejects empty investigation plan', () => {
    const invalid = {
      incidentType: 'latency',
      severity: 'high',
      reason: 'test',
      investigationPlan: [],
    };
    expect(() => TriageResponseSchema.parse(invalid)).toThrow();
  });
});

describe('Analysis Response Schema', () => {
  it('validates a correct analysis response', () => {
    const valid = {
      summary: 'Investigation found elevated latency',
      incidentType: 'latency',
      severity: 'high',
      findings: [
        { signal: 'HTTP Latency', value: 1820, interpretation: 'Elevated' },
      ],
      likelyRootCause: 'Origin server performance issues',
      confidence: 0.84,
      recommendedActions: [
        {
          problem: 'High latency',
          evidence: '1820ms',
          likelyCause: 'Server overload',
          action: 'Investigate origin CPU',
          risk: 'Low',
          validation: 'Re-check latency',
        },
      ],
      limitations: ['No origin metrics'],
    };
    expect(() => AnalysisResponseSchema.parse(valid)).not.toThrow();
  });

  it('rejects confidence > 1', () => {
    const invalid = {
      summary: 'test',
      incidentType: 'latency',
      severity: 'high',
      findings: [{ signal: 's', value: 1, interpretation: 'i' }],
      likelyRootCause: 'test',
      confidence: 1.5,
      recommendedActions: [{ problem: 'p', evidence: 'e', likelyCause: 'l', action: 'a', risk: 'r', validation: 'v' }],
      limitations: [],
    };
    expect(() => AnalysisResponseSchema.parse(invalid)).toThrow();
  });

  it('rejects confidence < 0', () => {
    const invalid = {
      summary: 'test',
      incidentType: 'latency',
      severity: 'high',
      findings: [{ signal: 's', value: 1, interpretation: 'i' }],
      likelyRootCause: 'test',
      confidence: -0.1,
      recommendedActions: [{ problem: 'p', evidence: 'e', likelyCause: 'l', action: 'a', risk: 'r', validation: 'v' }],
      limitations: [],
    };
    expect(() => AnalysisResponseSchema.parse(invalid)).toThrow();
  });
});

describe('Follow-Up Schema', () => {
  it('validates correct follow-up', () => {
    const valid = { answer: 'The latency is likely due to...', additionalContext: null };
    expect(() => FollowUpResponseSchema.parse(valid)).not.toThrow();
  });

  it('rejects empty answer', () => {
    expect(() => FollowUpResponseSchema.parse({ answer: '', additionalContext: null })).toThrow();
  });
});

describe('Create Incident Schema', () => {
  it('validates correct input', () => {
    const valid = {
      targetUrl: 'https://example.com',
      userQuestion: 'The website is slow and users are reporting issues',
    };
    expect(() => CreateIncidentSchema.parse(valid)).not.toThrow();
  });

  it('rejects invalid URL', () => {
    expect(() => CreateIncidentSchema.parse({
      targetUrl: 'not-a-url',
      userQuestion: 'some problem',
    })).toThrow();
  });

  it('rejects short question', () => {
    expect(() => CreateIncidentSchema.parse({
      targetUrl: 'https://example.com',
      userQuestion: 'hi',
    })).toThrow();
  });
});
