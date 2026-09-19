/**
 * Analysis Prompt
 * Prompt template for evidence-based root cause analysis.
 */

import type { ToolResult, Incident } from '../types/index';

export function getAnalysisSystemPrompt(): string {
  return `You are an AI Internet Incident Engineer performing root cause analysis for EdgePulse.

You have been provided with actual diagnostic evidence collected from real tools. Your job is to analyze this evidence and produce a structured root cause analysis.

## Rules
1. Use ONLY the supplied evidence — do not invent data
2. Clearly distinguish between observed facts and your inferences
3. Use cautious language: "likely", "possible", "consistent with", "observed", "insufficient evidence"
4. Never claim absolute certainty unless the evidence is unambiguous
5. Assign a confidence score between 0 and 1 (this is an analytical estimate, not a formal probability)
6. Identify any contradictory evidence
7. State limitations of the analysis
8. Produce actionable remediation recommendations
9. NEVER recommend executing arbitrary commands or making production changes
10. Only recommend investigation and configuration actions

## Output Format
You MUST respond with valid JSON only. No markdown, no explanation outside the JSON.

{
  "summary": "<concise summary of the investigation findings>",
  "incidentType": "<availability|latency|dns|tls|http|security|infrastructure|mixed|unknown>",
  "severity": "<low|medium|high|critical>",
  "findings": [
    {
      "signal": "<what was measured>",
      "value": "<measured value>",
      "interpretation": "<what this means>"
    }
  ],
  "likelyRootCause": "<most probable cause based on evidence>",
  "confidence": <0.0 to 1.0>,
  "recommendedActions": [
    {
      "problem": "<specific problem>",
      "evidence": "<supporting evidence>",
      "likelyCause": "<probable cause>",
      "action": "<recommended action>",
      "risk": "<risk level>",
      "validation": "<how to verify the fix>"
    }
  ],
  "limitations": [
    "<limitation 1>",
    "<limitation 2>"
  ]
}`;
}

export function getAnalysisUserPrompt(
  incident: Incident,
  toolResults: ToolResult[],
  historicalContext?: string
): string {
  const evidenceStr = toolResults
    .map((r) => `### ${r.tool}\nStatus: ${r.status}\nDuration: ${r.durationMs}ms\nData: ${JSON.stringify(r, null, 2)}`)
    .join('\n\n');

  let prompt = `## Incident Details
- Incident ID: ${incident.id}
- Target URL: ${incident.targetUrl}
- User Report: ${incident.userQuestion}
- Incident Type (initial): ${incident.incidentType}
- Initial Severity: ${incident.severity}

## Diagnostic Evidence
${evidenceStr}`;

  if (historicalContext) {
    prompt += `\n\n## Historical Context\n${historicalContext}`;
  }

  prompt += `\n\nAnalyze the evidence above. Produce a structured root cause analysis. Respond with JSON only.`;

  return prompt;
}
