/**
 * Tool Registry
 * Maps tool names to their implementations with allowlist enforcement.
 */

import type { ToolName, ToolResult } from '../types/index';
import { ALLOWED_TOOLS } from '../types/index';
import { checkDns } from './dns-check';
import { checkHttp } from './http-check';
import { checkLatency } from './latency-check';
import { checkSecurityHeaders } from './security-headers-check';
import { checkHttpsReachability } from './https-reachability-check';
import { getDemoResult } from './demo-data';
import { Logger } from '../utils/logger';

type ToolFunction = (url: string) => Promise<ToolResult>;

const TOOL_MAP: Record<ToolName, ToolFunction> = {
  check_dns: checkDns,
  check_http: checkHttp,
  check_latency: checkLatency as ToolFunction,
  check_security_headers: checkSecurityHeaders,
  check_https_reachability: checkHttpsReachability,
};

const TOOL_DISPLAY_NAMES: Record<ToolName, string> = {
  check_dns: 'DNS Check',
  check_http: 'HTTP Check',
  check_latency: 'Latency Check',
  check_security_headers: 'Security Headers Check',
  check_https_reachability: 'HTTPS Reachability Check',
};

/**
 * Execute a diagnostic tool by name.
 * Enforces the tool allowlist — rejects unknown tool names.
 */
export async function executeTool(
  toolName: string,
  url: string,
  demoMode: boolean = false
): Promise<ToolResult> {
  const log = new Logger({ toolName });

  // Allowlist enforcement
  if (!isAllowedTool(toolName)) {
    log.error('Attempted to execute disallowed tool', { toolName });
    throw new Error(`Tool "${toolName}" is not in the allowed tool list`);
  }

  const validatedName = toolName as ToolName;

  // Use demo data if demo mode is enabled
  if (demoMode) {
    log.info('Using demo data', { toolName: validatedName });
    return getDemoResult(validatedName);
  }

  const toolFn = TOOL_MAP[validatedName];
  if (!toolFn) {
    throw new Error(`Tool "${validatedName}" not implemented`);
  }

  const start = Date.now();
  try {
    const result = await toolFn(url);
    log.info('Tool executed successfully', {
      toolName: validatedName,
      durationMs: Date.now() - start,
      status: result.status,
    });
    return result;
  } catch (err) {
    log.error('Tool execution failed', {
      toolName: validatedName,
      durationMs: Date.now() - start,
      error: err instanceof Error ? err.message : 'Unknown error',
    });
    throw err;
  }
}

/**
 * Check if a tool name is in the allowed list
 */
export function isAllowedTool(toolName: string): toolName is ToolName {
  return ALLOWED_TOOLS.includes(toolName as ToolName);
}

/**
 * Get display name for a tool
 */
export function getToolDisplayName(toolName: ToolName): string {
  return TOOL_DISPLAY_NAMES[toolName] || toolName;
}

/**
 * Get all available tools
 */
export function getAvailableTools(): { name: ToolName; displayName: string }[] {
  return ALLOWED_TOOLS.map((name) => ({
    name,
    displayName: TOOL_DISPLAY_NAMES[name],
  }));
}
