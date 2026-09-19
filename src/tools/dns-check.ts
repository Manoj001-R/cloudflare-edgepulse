/**
 * DNS Check Tool
 * Performs DNS lookup via Cloudflare DNS-over-HTTPS (1.1.1.1).
 */

import type { DnsResult, DnsRecord } from '../types/index';
import { Logger } from '../utils/logger';

const DOH_ENDPOINT = 'https://cloudflare-dns.com/dns-query';
const DNS_TIMEOUT_MS = 5000;

export async function checkDns(url: string): Promise<DnsResult> {
  const log = new Logger({ toolName: 'check_dns' });
  const start = Date.now();

  try {
    const hostname = new URL(url).hostname;
    log.info('Starting DNS check', { hostname });

    // Query A records
    const aRecords = await queryDns(hostname, 'A');
    // Query AAAA records
    const aaaaRecords = await queryDns(hostname, 'AAAA');
    // Query CNAME records
    const cnameRecords = await queryDns(hostname, 'CNAME');

    const allRecords = [...aRecords, ...aaaaRecords, ...cnameRecords];
    const durationMs = Date.now() - start;

    if (allRecords.length === 0) {
      log.warn('No DNS records found', { hostname, durationMs });
      return {
        tool: 'check_dns',
        status: 'warning',
        records: [],
        responseTimeMs: durationMs,
        durationMs,
        error: 'No DNS records found for this hostname',
        isDemo: false,
      };
    }

    log.info('DNS check completed', { hostname, recordCount: allRecords.length, durationMs });

    return {
      tool: 'check_dns',
      status: 'healthy',
      records: allRecords,
      responseTimeMs: durationMs,
      durationMs,
      error: null,
      isDemo: false,
    };
  } catch (err) {
    const durationMs = Date.now() - start;
    const errorMsg = err instanceof Error ? err.message : 'DNS lookup failed';
    log.error('DNS check failed', { error: errorMsg, durationMs });

    return {
      tool: 'check_dns',
      status: 'error',
      records: [],
      responseTimeMs: durationMs,
      durationMs,
      error: errorMsg,
      isDemo: false,
    };
  }
}

async function queryDns(hostname: string, type: string): Promise<DnsRecord[]> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), DNS_TIMEOUT_MS);

  try {
    const queryUrl = `${DOH_ENDPOINT}?name=${encodeURIComponent(hostname)}&type=${type}`;
    const response = await fetch(queryUrl, {
      headers: { Accept: 'application/dns-json' },
      signal: controller.signal,
    });

    if (!response.ok) {
      return [];
    }

    const data = (await response.json()) as {
      Answer?: Array<{
        type: number;
        name: string;
        data: string;
        TTL: number;
      }>;
    };

    if (!data.Answer) return [];

    return data.Answer.map((record) => ({
      type: dnsTypeToString(record.type),
      name: record.name,
      value: record.data,
      ttl: record.TTL,
    }));
  } catch {
    return [];
  } finally {
    clearTimeout(timeout);
  }
}

function dnsTypeToString(type: number): string {
  const types: Record<number, string> = {
    1: 'A',
    5: 'CNAME',
    28: 'AAAA',
    15: 'MX',
    16: 'TXT',
    2: 'NS',
    6: 'SOA',
  };
  return types[type] || `TYPE${type}`;
}
