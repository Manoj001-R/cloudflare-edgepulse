/**
 * HTTPS Reachability Check Tool
 * Tests whether HTTPS and HTTP are accessible, and detects redirect behavior.
 */

import type { HttpsReachabilityResult } from '../types/index';
import { Logger } from '../utils/logger';

const REQUEST_TIMEOUT_MS = 10_000;

export async function checkHttpsReachability(url: string): Promise<HttpsReachabilityResult> {
  const log = new Logger({ toolName: 'check_https_reachability' });
  const start = Date.now();

  try {
    const parsedUrl = new URL(url);
    const hostname = parsedUrl.hostname;
    const pathname = parsedUrl.pathname || '/';
    const search = parsedUrl.search || '';
    log.info('Starting HTTPS reachability check', { hostname });

    // Check HTTPS
    const httpsResult = await testProtocol(`https://${hostname}${pathname}${search}`, 'HTTPS');

    // Check HTTP
    const httpResult = await testProtocol(`http://${hostname}${pathname}${search}`, 'HTTP');

    // Detect redirect to HTTPS
    let redirectsToHttps = false;
    if (httpResult.accessible && httpResult.finalUrl) {
      redirectsToHttps = httpResult.finalUrl.startsWith('https://');
    }

    const durationMs = Date.now() - start;

    let status: HttpsReachabilityResult['status'];
    if (httpsResult.accessible) {
      status = 'healthy';
    } else if (httpResult.accessible) {
      status = 'warning';
    } else {
      status = 'critical';
    }

    log.info('HTTPS reachability check completed', {
      httpsAccessible: httpsResult.accessible,
      httpAccessible: httpResult.accessible,
      redirectsToHttps,
      durationMs,
    });

    return {
      tool: 'check_https_reachability',
      status,
      httpsAccessible: httpsResult.accessible,
      httpAccessible: httpResult.accessible,
      redirectsToHttps,
      finalUrl: httpsResult.finalUrl || httpResult.finalUrl,
      durationMs,
      error: httpsResult.error || httpResult.error,
      isDemo: false,
    };
  } catch (err) {
    const durationMs = Date.now() - start;
    const errorMsg = err instanceof Error ? err.message : 'HTTPS reachability check failed';
    log.error('HTTPS reachability check failed', { error: errorMsg, durationMs });

    return {
      tool: 'check_https_reachability',
      status: 'error',
      httpsAccessible: false,
      httpAccessible: false,
      redirectsToHttps: false,
      finalUrl: null,
      durationMs,
      error: errorMsg,
      isDemo: false,
    };
  }
}

interface ProtocolCheckResult {
  accessible: boolean;
  finalUrl: string | null;
  error: string | null;
}

async function testProtocol(url: string, label: string): Promise<ProtocolCheckResult> {
  try {
    const methods: Array<'HEAD' | 'GET'> = ['HEAD', 'GET'];

    for (const method of methods) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

      try {
        const response = await fetch(url, {
          method,
          redirect: 'manual',
          signal: controller.signal,
          headers: {
            'User-Agent': 'EdgePulse/1.0 (HTTPS Reachability Check)',
            Accept: 'text/html,application/json,*/*',
          },
        });

        clearTimeout(timer);

        if (response.status >= 300 && response.status < 400) {
          const location = response.headers.get('location');
          if (location) {
            const resolved = new URL(location, url).toString();
            return {
              accessible: true,
              finalUrl: resolved,
              error: null,
            };
          }
        }

        return {
          accessible: response.status < 500,
          finalUrl: response.url || url,
          error: null,
        };
      } catch (err) {
        clearTimeout(timer);
        if (method === 'GET') {
          return {
            accessible: false,
            finalUrl: null,
            error: err instanceof Error ? err.message : `${label} check failed`,
          };
        }
      }
    }

    return {
      accessible: false,
      finalUrl: null,
      error: `${label} check failed`,
    };
  } catch (err) {
    return {
      accessible: false,
      finalUrl: null,
      error: err instanceof Error ? err.message : `${label} check failed`,
    };
  }
}
