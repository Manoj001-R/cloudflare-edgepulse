/**
 * Latency Check Tool
 * Measures request duration with multiple samples and classifies the result.
 */

import type { LatencyResult, LatencyClassification } from '../types/index';
import { Logger } from '../utils/logger';

const NUM_SAMPLES = 3;
const REQUEST_TIMEOUT_MS = 10_000;

interface LatencyThresholds {
  lowMs: number;
  moderateMs: number;
  highMs: number;
}

const DEFAULT_THRESHOLDS: LatencyThresholds = {
  lowMs: 300,
  moderateMs: 1000,
  highMs: 2000,
};

export async function checkLatency(
  url: string,
  thresholds?: Partial<LatencyThresholds>
): Promise<LatencyResult> {
  const log = new Logger({ toolName: 'check_latency' });
  const start = Date.now();
  const config = { ...DEFAULT_THRESHOLDS, ...thresholds };

  try {
    log.info('Starting latency check', { url, samples: NUM_SAMPLES });

    const measurements: number[] = [];

    for (let i = 0; i < NUM_SAMPLES; i++) {
      const sampleStart = Date.now();

      try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

        await fetch(url, {
          method: 'HEAD',
          redirect: 'follow',
          signal: controller.signal,
          headers: {
            'User-Agent': 'EdgePulse/1.0 (Latency Check)',
          },
        });

        clearTimeout(timer);
        measurements.push(Date.now() - sampleStart);
      } catch {
        measurements.push(Date.now() - sampleStart);
      }
    }

    const avgLatency = Math.round(
      measurements.reduce((sum, m) => sum + m, 0) / measurements.length
    );

    const classification = classifyLatency(avgLatency, config);
    const durationMs = Date.now() - start;

    let status: LatencyResult['status'];
    switch (classification) {
      case 'low':
        status = 'healthy';
        break;
      case 'moderate':
        status = 'warning';
        break;
      case 'high':
        status = 'critical';
        break;
      case 'critical':
        status = 'critical';
        break;
    }

    log.info('Latency check completed', {
      avgLatency,
      classification,
      samples: measurements.length,
      durationMs,
    });

    return {
      tool: 'check_latency',
      status,
      latencyMs: avgLatency,
      classification,
      measurements,
      durationMs,
      error: null,
      isDemo: false,
    };
  } catch (err) {
    const durationMs = Date.now() - start;
    const errorMsg = err instanceof Error ? err.message : 'Latency check failed';
    log.error('Latency check failed', { error: errorMsg, durationMs });

    return {
      tool: 'check_latency',
      status: 'error',
      latencyMs: 0,
      classification: 'critical',
      measurements: [],
      durationMs,
      error: errorMsg,
      isDemo: false,
    };
  }
}

export function classifyLatency(
  latencyMs: number,
  thresholds: LatencyThresholds = DEFAULT_THRESHOLDS
): LatencyClassification {
  if (latencyMs < thresholds.lowMs) return 'low';
  if (latencyMs < thresholds.moderateMs) return 'moderate';
  if (latencyMs < thresholds.highMs) return 'high';
  return 'critical';
}
