/**
 * Security Headers Check Tool
 * Analyzes the presence of standard security headers.
 */

import type { SecurityHeadersResult, SecurityHeader } from '../types/index';
import { Logger } from '../utils/logger';

const EXPECTED_HEADERS = [
  'strict-transport-security',
  'content-security-policy',
  'x-content-type-options',
  'referrer-policy',
  'permissions-policy',
  'x-frame-options',
] as const;

const HEADER_DISPLAY_NAMES: Record<string, string> = {
  'strict-transport-security': 'Strict-Transport-Security',
  'content-security-policy': 'Content-Security-Policy',
  'x-content-type-options': 'X-Content-Type-Options',
  'referrer-policy': 'Referrer-Policy',
  'permissions-policy': 'Permissions-Policy',
  'x-frame-options': 'X-Frame-Options',
};

const REQUEST_TIMEOUT_MS = 10_000;

export async function checkSecurityHeaders(url: string): Promise<SecurityHeadersResult> {
  const log = new Logger({ toolName: 'check_security_headers' });
  const start = Date.now();

  try {
    log.info('Starting security headers check', { url });

    const response = await fetchWithFallback(url, 'HEAD', 'GET');
    const durationMs = Date.now() - start;

    const present: SecurityHeader[] = [];
    const missing: string[] = [];

    for (const header of EXPECTED_HEADERS) {
      const value = response.headers.get(header);
      if (value) {
        present.push({
          name: HEADER_DISPLAY_NAMES[header] || header,
          value,
        });
      } else {
        missing.push(HEADER_DISPLAY_NAMES[header] || header);
      }
    }

    const score = present.length;
    const maxScore = EXPECTED_HEADERS.length;

    let status: SecurityHeadersResult['status'];
    if (score === maxScore) status = 'healthy';
    else if (score >= maxScore * 0.5) status = 'warning';
    else status = 'critical';

    log.info('Security headers check completed', {
      present: present.length,
      missing: missing.length,
      score: `${score}/${maxScore}`,
      durationMs,
    });

    return {
      tool: 'check_security_headers',
      status,
      present,
      missing,
      score,
      maxScore,
      durationMs,
      error: null,
      isDemo: false,
    };
  } catch (err) {
    const durationMs = Date.now() - start;
    const errorMsg = err instanceof Error ? err.message : 'Security headers check failed';
    log.error('Security headers check failed', { error: errorMsg, durationMs });

    return {
      tool: 'check_security_headers',
      status: 'error',
      present: [],
      missing: EXPECTED_HEADERS.map((h) => HEADER_DISPLAY_NAMES[h] || h),
      score: 0,
      maxScore: EXPECTED_HEADERS.length,
      durationMs,
      error: errorMsg,
      isDemo: false,
    };
  }
}

async function fetchWithFallback(url: string, primaryMethod: 'HEAD' | 'GET', fallbackMethod: 'HEAD' | 'GET'): Promise<Response> {
  const methods = [primaryMethod, fallbackMethod];

  for (const method of methods) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    try {
      const response = await fetch(url, {
        method,
        redirect: 'follow',
        signal: controller.signal,
        headers: {
          'User-Agent': 'EdgePulse/1.0 (Security Header Check)',
          Accept: 'text/html,application/json,*/*',
        },
      });
      clearTimeout(timer);

      if (response.status >= 400 && method === primaryMethod) {
        continue;
      }

      return response;
    } catch (err) {
      clearTimeout(timer);
      if (method === fallbackMethod) {
        throw err;
      }
    }
  }

  throw new Error(`Request to ${url} failed for both HEAD and GET`);
}
