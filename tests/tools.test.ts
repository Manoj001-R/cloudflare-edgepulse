import { describe, it, expect } from 'vitest';
import { classifyLatency } from '../src/tools/latency-check';
import { getDemoResult, getDemoTriage, getDemoAnalysis } from '../src/tools/demo-data';
import { ALLOWED_TOOLS } from '../src/types/index';

describe('Latency Classification', () => {
  it('classifies < 300ms as low', () => {
    expect(classifyLatency(100)).toBe('low');
    expect(classifyLatency(299)).toBe('low');
  });

  it('classifies 300-999ms as moderate', () => {
    expect(classifyLatency(300)).toBe('moderate');
    expect(classifyLatency(500)).toBe('moderate');
    expect(classifyLatency(999)).toBe('moderate');
  });

  it('classifies 1000-1999ms as high', () => {
    expect(classifyLatency(1000)).toBe('high');
    expect(classifyLatency(1500)).toBe('high');
    expect(classifyLatency(1999)).toBe('high');
  });

  it('classifies >= 2000ms as critical', () => {
    expect(classifyLatency(2000)).toBe('critical');
    expect(classifyLatency(5000)).toBe('critical');
  });

  it('uses custom thresholds', () => {
    expect(classifyLatency(100, { lowMs: 50, moderateMs: 150, highMs: 200 })).toBe('moderate');
    expect(classifyLatency(10, { lowMs: 50, moderateMs: 150, highMs: 200 })).toBe('low');
  });
});

describe('Demo Data', () => {
  it('provides demo results for all allowed tools', () => {
    for (const tool of ALLOWED_TOOLS) {
      const result = getDemoResult(tool);
      expect(result).toBeDefined();
      expect(result.tool).toBe(tool);
      expect(result.isDemo).toBe(true);
    }
  });

  it('demo DNS result has records', () => {
    const result = getDemoResult('check_dns') as any;
    expect(result.records.length).toBeGreaterThan(0);
  });

  it('demo HTTP result has status code', () => {
    const result = getDemoResult('check_http') as any;
    expect(result.httpStatus).toBe(200);
  });

  it('demo latency has classification', () => {
    const result = getDemoResult('check_latency') as any;
    expect(result.classification).toBe('high');
  });

  it('demo security headers has score', () => {
    const result = getDemoResult('check_security_headers') as any;
    expect(result.score).toBe(5);
    expect(result.maxScore).toBe(6);
  });

  it('demo triage has valid investigation plan', () => {
    const triage = getDemoTriage();
    expect(triage.incidentType).toBeDefined();
    expect(triage.severity).toBeDefined();
    expect(triage.investigationPlan.length).toBeGreaterThan(0);
    for (const tool of triage.investigationPlan) {
      expect(ALLOWED_TOOLS).toContain(tool);
    }
  });

  it('demo analysis has required fields', () => {
    const analysis = getDemoAnalysis();
    expect(analysis.summary).toBeDefined();
    expect(analysis.likelyRootCause).toBeDefined();
    expect(analysis.confidence).toBeGreaterThan(0);
    expect(analysis.confidence).toBeLessThanOrEqual(1);
    expect(analysis.recommendedActions.length).toBeGreaterThan(0);
    expect(analysis.limitations.length).toBeGreaterThan(0);
  });
});
