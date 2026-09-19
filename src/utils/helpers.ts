/**
 * Utility helpers for EdgePulse
 */

/**
 * Generate a unique incident ID in the format INC-YYYYMMDD-NNNN
 */
let dailyCounter = Math.floor(Math.random() * 9000) + 1000;
let lastDate = '';

export function generateIncidentId(): string {
  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');

  if (dateStr !== lastDate) {
    dailyCounter = Math.floor(Math.random() * 9000) + 1000;
    lastDate = dateStr;
  }

  dailyCounter = ((dailyCounter + 1) % 9000) + 1000;
  const counter = String(dailyCounter).padStart(4, '0');
  return `INC-${dateStr}-${counter}`;
}

/**
 * Generate a UUID v4
 */
export function generateId(): string {
  return crypto.randomUUID();
}

/**
 * Get current ISO timestamp
 */
export function now(): string {
  return new Date().toISOString();
}

/**
 * Safe JSON parse with fallback
 */
export function safeJsonParse<T>(raw: string, fallback: T): T {
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

/**
 * Extract hostname from URL
 */
export function extractHostname(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return url;
  }
}

/**
 * Format milliseconds to human-readable duration
 */
export function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60_000) return `${(ms / 1000).toFixed(1)}s`;
  const minutes = Math.floor(ms / 60_000);
  const seconds = Math.round((ms % 60_000) / 1000);
  return `${minutes}m ${seconds}s`;
}

/**
 * Sleep utility for workflows
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Clamp a number between min and max
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/**
 * Escape HTML entities for safe rendering
 */
export function escapeHtml(str: string): string {
  const entities: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  };
  return str.replace(/[&<>"']/g, (ch) => entities[ch] || ch);
}

/**
 * Truncate a string to a maximum length
 */
export function truncate(str: string, maxLength: number): string {
  if (str.length <= maxLength) return str;
  return str.slice(0, maxLength - 3) + '...';
}
