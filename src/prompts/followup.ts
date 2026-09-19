/**
 * Follow-Up Prompt
 * Prompt for answering user follow-up questions using incident context.
 */

import type { Incident, AnalysisResponse, ToolResult } from '../types/index';

export function getFollowUpSystemPrompt(): string {
  return `You are an AI Internet Incident Engineer at EdgePulse. You are answering a follow-up question about a previously investigated incident.

## Rules
1. Use the incident context provided to answer the question
2. Do not invent evidence that was not collected
3. Be honest about limitations of the investigation
4. If the question is outside the scope of the investigation, say so
5. Use clear, professional language
6. Do not recommend executing arbitrary commands or making production changes

## Output Format
You MUST respond with valid JSON only.

{
  "answer": "<your detailed answer to the follow-up question>",
  "additionalContext": "<any relevant additional context, or null>"
}`;
}

export function getFollowUpUserPrompt(
  incident: Incident,
  analysis: AnalysisResponse | null,
  toolResults: ToolResult[],
  conversationHistory: Array<{ role: string; content: string }>,
  userQuestion: string
): string {
  const evidenceSummary = toolResults
    .map((r) => `- ${r.tool}: ${r.status} (${r.durationMs}ms)`)
    .join('\n');

  const recentHistory = conversationHistory.slice(-6)
    .map((m) => `${m.role}: ${m.content}`)
    .join('\n');

  return `## Incident Context
- Incident ID: ${incident.id}
- Target URL: ${incident.targetUrl}
- Original Problem: ${incident.userQuestion}
- Type: ${incident.incidentType}
- Severity: ${incident.severity}
- Status: ${incident.status}

## Evidence Summary
${evidenceSummary}

${analysis ? `## Analysis Summary
${analysis.summary}

Root Cause: ${analysis.likelyRootCause}
Confidence: ${Math.round(analysis.confidence * 100)}%` : '## No analysis available yet'}

## Recent Conversation
${recentHistory || 'No previous conversation'}

## Follow-Up Question
${userQuestion}

Answer the follow-up question using the incident context above. Respond with JSON only.`;
}
