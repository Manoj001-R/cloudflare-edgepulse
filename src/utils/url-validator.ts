/**
 * URL Validator with SSRF Protection
 *
 * Validates URLs and blocks access to private/internal networks,
 * metadata endpoints, and other dangerous targets.
 */

// Private / reserved IP ranges to block
const BLOCKED_IP_PATTERNS = [
  // IPv4 loopback
  /^127\.\d{1,3}\.\d{1,3}\.\d{1,3}$/,
  // IPv4 private: 10.0.0.0/8
  /^10\.\d{1,3}\.\d{1,3}\.\d{1,3}$/,
  // IPv4 private: 172.16.0.0/12
  /^172\.(1[6-9]|2\d|3[01])\.\d{1,3}\.\d{1,3}$/,
  // IPv4 private: 192.168.0.0/16
  /^192\.168\.\d{1,3}\.\d{1,3}$/,
  // IPv4 link-local: 169.254.0.0/16
  /^169\.254\.\d{1,3}\.\d{1,3}$/,
  // IPv4 CGNAT: 100.64.0.0/10
  /^100\.(6[4-9]|[7-9]\d|1[01]\d|12[0-7])\.\d{1,3}\.\d{1,3}$/,
  // IPv4 zero
  /^0\.0\.0\.0$/,
];

const BLOCKED_HOSTNAMES = new Set([
  'localhost',
  'localhost.localdomain',
  'ip6-localhost',
  'ip6-loopback',
  'metadata.google.internal',
  'metadata.google',
  'kubernetes.default.svc',
  'kubernetes.default',
  'kubernetes',
]);

const BLOCKED_HOSTNAME_SUFFIXES = [
  '.internal',
  '.local',
  '.localhost',
  '.arpa',
];

// Cloud metadata endpoints
const BLOCKED_PATHS = [
  '/latest/meta-data',
  '/metadata/v1',
  '/computeMetadata',
  '/openstack',
];

export interface UrlValidationResult {
  valid: boolean;
  sanitizedUrl: string | null;
  hostname: string | null;
  error: string | null;
}

export function validateUrl(rawUrl: string): UrlValidationResult {
  const fail = (error: string): UrlValidationResult => ({
    valid: false,
    sanitizedUrl: null,
    hostname: null,
    error,
  });

  // Basic length check
  if (!rawUrl || rawUrl.length > 2048) {
    return fail('URL is empty or too long (max 2048 characters)');
  }

  // Parse
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    return fail('Invalid URL format');
  }

  // Protocol check — only http/https
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    return fail('Only http:// and https:// protocols are allowed');
  }

  // No credentials in URL
  if (url.username || url.password) {
    return fail('URLs with credentials are not allowed');
  }

  const hostname = normalizeHostname(url.hostname);

  // Empty hostname
  if (!hostname) {
    return fail('Hostname is required');
  }

  // Check blocked hostnames
  if (BLOCKED_HOSTNAMES.has(hostname)) {
    return fail(`Blocked hostname: ${hostname}`);
  }

  // Check blocked suffixes
  for (const suffix of BLOCKED_HOSTNAME_SUFFIXES) {
    if (hostname.endsWith(suffix)) {
      return fail(`Blocked hostname suffix: ${suffix}`);
    }
  }

  // Check if hostname is an IP address
  if (isIpAddress(hostname)) {
    if (isBlockedIp(hostname)) {
      return fail('Access to private/internal IP addresses is not allowed');
    }
  }

  // Check IPv6 / mapped IPv4 addresses
  if (hostname.includes(':') || url.hostname.includes('[')) {
    const cleanIp = hostname.replace(/[[\]]/g, '');
    if (isBlockedIpv6(cleanIp)) {
      return fail('Access to private/internal IPv6 addresses is not allowed');
    }
  }

  // Check blocked paths (cloud metadata)
  for (const blockedPath of BLOCKED_PATHS) {
    if (url.pathname.toLowerCase().startsWith(blockedPath)) {
      return fail('Access to metadata endpoints is not allowed');
    }
  }

  // Port restrictions — block common internal service ports
  if (url.port) {
    const port = parseInt(url.port, 10);
    const blockedPorts = new Set([22, 23, 25, 110, 143, 445, 3306, 5432, 6379, 27017]);
    if (blockedPorts.has(port)) {
      return fail(`Port ${port} is not allowed`);
    }
  }

  return {
    valid: true,
    sanitizedUrl: url.toString(),
    hostname,
    error: null,
  };
}

function normalizeHostname(hostname: string): string {
  return hostname.toLowerCase().replace(/\.$/, '');
}

function isIpAddress(hostname: string): boolean {
  return /^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(hostname);
}

function isBlockedIp(ip: string): boolean {
  return BLOCKED_IP_PATTERNS.some((pattern) => pattern.test(ip));
}

function isBlockedIpv6(ip: string): boolean {
  const lower = ip.toLowerCase();

  if (lower === '::' || lower === '0:0:0:0:0:0:0:0') return true;
  if (lower === '::1' || lower === '0:0:0:0:0:0:0:1') return true;

  const mappedIp = extractMappedIpv4(lower);
  if (mappedIp && isBlockedIp(mappedIp)) {
    return true;
  }

  // Unique local (fc00::/7)
  if (lower.startsWith('fc') || lower.startsWith('fd')) return true;
  // Link-local (fe80::/10)
  if (lower.startsWith('fe80')) return true;
  return false;
}

function extractMappedIpv4(ip: string): string | null {
  const lower = ip.toLowerCase().replace(/^\[|\]$/g, '');
  if (!lower.includes('::ffff:')) return null;

  const suffix = lower.split('::ffff:')[1];
  if (!suffix) return null;

  const ipv4Match = suffix.match(/^(\d{1,3}(?:\.\d{1,3}){3})$/);
  if (ipv4Match) {
    return ipv4Match[1];
  }

  const parts = suffix.split(':').filter(Boolean);
  if (parts.length >= 2) {
    const [firstHex, secondHex] = parts.slice(-2);
    const first = parseInt(firstHex, 16);
    const second = parseInt(secondHex, 16);

    if (!Number.isNaN(first) && !Number.isNaN(second)) {
      return `${Math.floor(first / 256)}.${first % 256}.${Math.floor(second / 256)}.${second % 256}`;
    }
  }

  return null;
}

/**
 * Validate a redirect destination to prevent SSRF via redirect.
 * Redirects are only allowed to the same hostname so an open redirect cannot exfiltrate to another origin.
 */
export function validateRedirectUrl(redirectUrl: string, originalHostname: string): UrlValidationResult {
  const rawTarget = redirectUrl.trim();
  if (!rawTarget) {
    return { valid: false, sanitizedUrl: null, hostname: null, error: 'Redirect URL is empty' };
  }

  let targetUrl: URL;
  try {
    targetUrl = new URL(rawTarget, `http://${originalHostname}`);
  } catch {
    return { valid: false, sanitizedUrl: null, hostname: null, error: 'Invalid redirect URL format' };
  }

  const targetHostname = normalizeHostname(targetUrl.hostname);
  if (targetHostname !== normalizeHostname(originalHostname)) {
    return {
      valid: false,
      sanitizedUrl: null,
      hostname: null,
      error: `Redirect target host ${targetHostname} does not match original host ${normalizeHostname(originalHostname)}`,
    };
  }

  return validateUrl(targetUrl.toString());
}
