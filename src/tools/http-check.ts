/**
 * HTTP Check Tool
 * Performs HTTP/HTTPS request to the target and collects response metadata.
 */

import type { HttpResult } from '../types/index';
import { validateRedirectUrl } from '../utils/url-validator';
import { Logger } from '../utils/logger';

const DEFAULT_TIMEOUT_MS = 10_000;
const MAX_REDIRECTS = 5;

export async function checkHttp(url: string, timeoutMs?: number): Promise<HttpResult> {
  const log = new Logger({ toolName: 'check_http' });
  const start = Date.now();
  const timeout = timeoutMs ?? DEFAULT_TIMEOUT_MS;

  try {
    log.info('Starting HTTP check', { url });

    let currentUrl = url;
    let response: Response;
    let redirectCount = 0;

    while (true) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeout);

      response = await fetch(currentUrl, {
        method: 'GET',
        redirect: 'manual',
        signal: controller.signal,
        headers: {
          'User-Agent': 'EdgePulse/1.0 (Internet Incident Investigator)',
          Accept: 'text/html,application/json,*/*',
        },
      });

      clearTimeout(timer);

      if (response.status >= 300 && response.status < 400) {
        const location = response.headers.get('location');
        if (!location) {
          break;
        }
        if (redirectCount >= MAX_REDIRECTS) {
          throw new Error(`Too many redirects while checking ${url}`);
        }
        const originalHost = new URL(currentUrl).hostname;
        const redirectTarget = new URL(location, currentUrl).toString();
        const redirectResult = validateRedirectUrl(redirectTarget, originalHost);
        if (!redirectResult.valid) {
          throw new Error(redirectResult.error ?? 'Unsafe redirect target');
        }
        currentUrl = redirectTarget;
        redirectCount += 1;
        continue;
      }

      break;
    }

    const durationMs = Date.now() - start;
    const finalUrl = currentUrl !== url ? currentUrl : response.url || url;
    const redirected = finalUrl !== url;
    const contentType = response.headers.get('content-type');
    const server = response.headers.get('server');

    // Classify status
    let status: HttpResult['status'];
    if (response.status >= 200 && response.status < 300) {
      status = 'healthy';
    } else if (response.status >= 300 && response.status < 400) {
      status = 'warning';
    } else if (response.status >= 400 && response.status < 500) {
      status = 'warning';
    } else {
      status = 'critical';
    }

    log.info('HTTP check completed', {
      httpStatus: response.status,
      durationMs,
      redirected,
    });

    return {
      tool: 'check_http',
      status,
      httpStatus: response.status,
      latencyMs: durationMs,
      finalUrl: redirected ? finalUrl : null,
      contentType,
      server,
      redirected,
      durationMs,
      error: null,
      isDemo: false,
    };
  } catch (err) {
    const durationMs = Date.now() - start;
    let errorMsg: string;

    if (err instanceof DOMException && err.name === 'AbortError') {
      errorMsg = `Request timed out after ${timeout}ms`;
    } else {
      errorMsg = err instanceof Error ? err.message : 'HTTP request failed';
    }

    log.error('HTTP check failed', { error: errorMsg, durationMs });

    return {
      tool: 'check_http',
      status: 'error',
      httpStatus: null,
      latencyMs: durationMs,
      finalUrl: null,
      contentType: null,
      server: null,
      redirected: false,
      durationMs,
      error: errorMsg,
      isDemo: false,
    };
  }
}
