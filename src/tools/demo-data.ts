/**
 * Demo Data
 * Deterministic mock diagnostic results for offline demonstration.
 * All results are clearly marked as demo data.
 */

import type {
  ToolName, ToolResult, DnsResult, HttpResult,
  LatencyResult, SecurityHeadersResult, HttpsReachabilityResult,
} from '../types/index';

const DEMO_DNS: DnsResult = {
  tool: 'check_dns',
  status: 'healthy',
  records: [
    { type: 'A', name: 'example.com', value: '93.184.216.34', ttl: 3600 },
    { type: 'AAAA', name: 'example.com', value: '2606:2800:220:1:248:1893:25c8:1946', ttl: 3600 },
  ],
  responseTimeMs: 45,
  durationMs: 45,
  error: null,
  isDemo: true,
};

const DEMO_HTTP: HttpResult = {
  tool: 'check_http',
  status: 'healthy',
  httpStatus: 200,
  latencyMs: 1820,
  finalUrl: null,
  contentType: 'text/html; charset=UTF-8',
  server: 'ECS (dab/4B96)',
  redirected: false,
  durationMs: 1820,
  error: null,
  isDemo: true,
};

const DEMO_LATENCY: LatencyResult = {
  tool: 'check_latency',
  status: 'critical',
  latencyMs: 1820,
  classification: 'high',
  measurements: [1750, 1890, 1820],
  durationMs: 5500,
  error: null,
  isDemo: true,
};

const DEMO_SECURITY_HEADERS: SecurityHeadersResult = {
  tool: 'check_security_headers',
  status: 'warning',
  present: [
    { name: 'X-Content-Type-Options', value: 'nosniff' },
    { name: 'Referrer-Policy', value: 'no-referrer' },
    { name: 'X-Frame-Options', value: 'DENY' },
    { name: 'Strict-Transport-Security', value: 'max-age=31536000' },
    { name: 'Content-Security-Policy', value: "default-src 'self'" },
  ],
  missing: ['Permissions-Policy'],
  score: 5,
  maxScore: 6,
  durationMs: 320,
  error: null,
  isDemo: true,
};

const DEMO_HTTPS: HttpsReachabilityResult = {
  tool: 'check_https_reachability',
  status: 'healthy',
  httpsAccessible: true,
  httpAccessible: true,
  redirectsToHttps: true,
  finalUrl: 'https://example.com/',
  durationMs: 280,
  error: null,
  isDemo: true,
};

const DEMO_RESULTS: Record<ToolName, ToolResult> = {
  check_dns: DEMO_DNS,
  check_http: DEMO_HTTP,
  check_latency: DEMO_LATENCY,
  check_security_headers: DEMO_SECURITY_HEADERS,
  check_https_reachability: DEMO_HTTPS,
};

/**
 * Get deterministic demo result for a tool.
 * Results are clearly marked with isDemo: true.
 */
export function getDemoResult(toolName: ToolName): ToolResult {
  const result = DEMO_RESULTS[toolName];
  if (!result) {
    throw new Error(`No demo data available for tool: ${toolName}`);
  }
  return { ...result };
}

/**
 * Get demo analysis data for when Workers AI is unavailable
 */
export function getDemoAnalysis() {
  return {
    summary: '[DEMO DATA] Based on the simulated diagnostic evidence, the target website shows elevated HTTP response latency of approximately 1,820ms, which is consistent with the user-reported performance degradation. DNS resolution is healthy, HTTPS is accessible with proper redirect behavior, and security headers are largely in place with one missing header.',
    incidentType: 'latency' as const,
    severity: 'high' as const,
    findings: [
      {
        signal: 'HTTP Latency',
        value: 1820,
        interpretation: 'Elevated response time observed — consistent with user-reported slowness',
      },
      {
        signal: 'DNS Resolution',
        value: 'Healthy',
        interpretation: 'DNS records resolve correctly, ruling out DNS-level issues',
      },
      {
        signal: 'HTTPS Accessibility',
        value: 'Accessible',
        interpretation: 'HTTPS connection established successfully with proper redirect',
      },
      {
        signal: 'Security Headers',
        value: '5/6',
        interpretation: 'Most security headers present; Permissions-Policy is missing',
      },
    ],
    likelyRootCause: '[DEMO DATA] The likely root cause is performance degradation at the application or origin server layer. The elevated HTTP response time (1,820ms) suggests possible high CPU usage, slow database queries, or resource contention at the origin. DNS and TLS layers appear healthy.',
    confidence: 0.84,
    recommendedActions: [
      {
        problem: 'Elevated HTTP Latency',
        evidence: 'HTTP response time ~1,820ms across multiple measurements',
        likelyCause: 'Application/origin server performance degradation',
        action: 'Investigate origin server CPU, memory, and database query performance',
        risk: 'Low',
        validation: 'Repeat latency checks after remediation to verify improvement',
      },
      {
        problem: 'Missing Security Header',
        evidence: 'Permissions-Policy header not present',
        likelyCause: 'Configuration oversight',
        action: 'Add Permissions-Policy header to server configuration',
        risk: 'Low',
        validation: 'Re-check security headers after configuration change',
      },
    ],
    limitations: [
      'DEMO DATA — These results are simulated and do not reflect real diagnostic evidence',
      'No direct access to origin server metrics (CPU, memory, disk I/O)',
      'Cannot determine if latency is caused by network path or origin processing',
      'External measurement point only — internal application tracing not available',
    ],
  };
}

export function getDemoTriage() {
  return {
    incidentType: 'latency' as const,
    severity: 'high' as const,
    reason: '[DEMO DATA] The user reports that the website is slow, which indicates a potential latency or performance issue. A comprehensive investigation of DNS, HTTP response, latency measurements, security headers, and HTTPS reachability is recommended.',
    investigationPlan: [
      'check_dns' as const,
      'check_http' as const,
      'check_latency' as const,
      'check_security_headers' as const,
      'check_https_reachability' as const,
    ],
  };
}
