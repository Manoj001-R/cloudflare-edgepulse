import { describe, it, expect } from 'vitest';
import { validateUrl, validateRedirectUrl } from '../src/utils/url-validator';

describe('URL Validator — SSRF Protection', () => {
  // ─── Valid URLs ─────────────────────────────────────────

  it('accepts valid HTTPS URL', () => {
    const result = validateUrl('https://example.com');
    expect(result.valid).toBe(true);
    expect(result.hostname).toBe('example.com');
  });

  it('accepts valid HTTP URL', () => {
    const result = validateUrl('http://example.com');
    expect(result.valid).toBe(true);
  });

  it('accepts URL with path', () => {
    const result = validateUrl('https://example.com/path/to/page');
    expect(result.valid).toBe(true);
  });

  it('accepts URL with port', () => {
    const result = validateUrl('https://example.com:8080');
    expect(result.valid).toBe(true);
  });

  // ─── Invalid Protocols ──────────────────────────────────

  it('rejects FTP protocol', () => {
    const result = validateUrl('ftp://example.com');
    expect(result.valid).toBe(false);
    expect(result.error).toContain('http');
  });

  it('rejects file:// protocol', () => {
    const result = validateUrl('file:///etc/passwd');
    expect(result.valid).toBe(false);
  });

  it('rejects javascript: protocol', () => {
    const result = validateUrl('javascript:alert(1)');
    expect(result.valid).toBe(false);
  });

  // ─── Private IPs ───────────────────────────────────────

  it('blocks localhost', () => {
    const result = validateUrl('http://localhost');
    expect(result.valid).toBe(false);
  });

  it('blocks 127.0.0.1', () => {
    const result = validateUrl('http://127.0.0.1');
    expect(result.valid).toBe(false);
  });

  it('blocks 127.0.0.2', () => {
    const result = validateUrl('http://127.0.0.2');
    expect(result.valid).toBe(false);
  });

  it('blocks 10.x.x.x', () => {
    const result = validateUrl('http://10.0.0.1');
    expect(result.valid).toBe(false);
  });

  it('blocks 172.16.x.x', () => {
    const result = validateUrl('http://172.16.0.1');
    expect(result.valid).toBe(false);
  });

  it('blocks 192.168.x.x', () => {
    const result = validateUrl('http://192.168.1.1');
    expect(result.valid).toBe(false);
  });

  it('blocks 169.254.x.x (link-local)', () => {
    const result = validateUrl('http://169.254.169.254');
    expect(result.valid).toBe(false);
  });

  it('blocks 0.0.0.0', () => {
    const result = validateUrl('http://0.0.0.0');
    expect(result.valid).toBe(false);
  });

  // ─── Internal Hostnames ─────────────────────────────────

  it('blocks .internal suffix', () => {
    const result = validateUrl('http://service.internal');
    expect(result.valid).toBe(false);
  });

  it('blocks .local suffix', () => {
    const result = validateUrl('http://myhost.local');
    expect(result.valid).toBe(false);
  });

  it('blocks metadata endpoints', () => {
    const result = validateUrl('http://169.254.169.254/latest/meta-data');
    expect(result.valid).toBe(false);
  });

  it('blocks metadata.google.internal', () => {
    const result = validateUrl('http://metadata.google.internal/computeMetadata');
    expect(result.valid).toBe(false);
  });

  // ─── Blocked Ports ──────────────────────────────────────

  it('blocks SSH port 22', () => {
    const result = validateUrl('https://example.com:22');
    expect(result.valid).toBe(false);
  });

  it('blocks MySQL port 3306', () => {
    const result = validateUrl('https://example.com:3306');
    expect(result.valid).toBe(false);
  });

  it('blocks Redis port 6379', () => {
    const result = validateUrl('https://example.com:6379');
    expect(result.valid).toBe(false);
  });

  // ─── Credentials ───────────────────────────────────────

  it('blocks URLs with credentials', () => {
    const result = validateUrl('https://user:pass@example.com');
    expect(result.valid).toBe(false);
  });

  // ─── Edge Cases ─────────────────────────────────────────

  it('rejects empty URL', () => {
    const result = validateUrl('');
    expect(result.valid).toBe(false);
  });

  it('rejects invalid URL format', () => {
    const result = validateUrl('not-a-url');
    expect(result.valid).toBe(false);
  });

  it('rejects very long URL', () => {
    const result = validateUrl('https://example.com/' + 'a'.repeat(3000));
    expect(result.valid).toBe(false);
  });

  it('blocks trailing-dot localhost variants', () => {
    expect(validateUrl('http://localhost.').valid).toBe(false);
    expect(validateUrl('http://localhost.localdomain.').valid).toBe(false);
  });

  it('blocks IPv4-mapped IPv6 loopback addresses', () => {
    expect(validateUrl('http://[::ffff:127.0.0.1]').valid).toBe(false);
    expect(validateUrl('http://[::ffff:10.0.0.1]').valid).toBe(false);
  });

  it('rejects redirect URLs to a different host', () => {
    const result = validateUrl('https://example.com');
    expect(result.valid).toBe(true);
    const redirected = validateRedirectUrl('https://evil.example.com/', 'example.com');
    expect(redirected.valid).toBe(false);
  });
});
