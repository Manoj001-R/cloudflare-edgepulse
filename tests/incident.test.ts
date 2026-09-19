import { describe, it, expect } from 'vitest';
import { generateIncidentId, generateId, escapeHtml, truncate, extractHostname, formatDuration } from '../src/utils/helpers';
import { isAllowedTool } from '../src/tools/index';

describe('Incident ID Generation', () => {
  it('generates ID in correct format', () => {
    const id = generateIncidentId();
    expect(id).toMatch(/^INC-\d{8}-\d{4}$/);
  });

  it('generates unique IDs', () => {
    const ids = new Set<string>();
    for (let i = 0; i < 10; i++) {
      ids.add(generateIncidentId());
    }
    expect(ids.size).toBe(10);
  });
});

describe('UUID Generation', () => {
  it('generates valid UUIDs', () => {
    const id = generateId();
    expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
  });
});

describe('HTML Escaping', () => {
  it('escapes dangerous characters', () => {
    expect(escapeHtml('<script>alert("xss")</script>')).toBe(
      '&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;'
    );
  });

  it('handles safe strings', () => {
    expect(escapeHtml('hello world')).toBe('hello world');
  });
});

describe('Truncation', () => {
  it('truncates long strings', () => {
    expect(truncate('a'.repeat(100), 20)).toBe('a'.repeat(17) + '...');
  });

  it('leaves short strings unchanged', () => {
    expect(truncate('short', 20)).toBe('short');
  });
});

describe('Hostname Extraction', () => {
  it('extracts hostname from URL', () => {
    expect(extractHostname('https://example.com/path')).toBe('example.com');
  });

  it('handles invalid URL gracefully', () => {
    expect(extractHostname('not-a-url')).toBe('not-a-url');
  });
});

describe('Duration Formatting', () => {
  it('formats milliseconds', () => {
    expect(formatDuration(123)).toBe('123ms');
  });

  it('formats seconds', () => {
    expect(formatDuration(5400)).toBe('5.4s');
  });

  it('formats minutes', () => {
    expect(formatDuration(120000)).toBe('2m 0s');
  });
});

describe('Tool Allowlist', () => {
  it('allows known tools', () => {
    expect(isAllowedTool('check_dns')).toBe(true);
    expect(isAllowedTool('check_http')).toBe(true);
    expect(isAllowedTool('check_latency')).toBe(true);
    expect(isAllowedTool('check_security_headers')).toBe(true);
    expect(isAllowedTool('check_https_reachability')).toBe(true);
  });

  it('rejects unknown tools', () => {
    expect(isAllowedTool('run_shell_command')).toBe(false);
    expect(isAllowedTool('exec_code')).toBe(false);
    expect(isAllowedTool('unknown_tool')).toBe(false);
    expect(isAllowedTool('')).toBe(false);
  });
});
