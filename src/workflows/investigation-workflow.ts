/**
 * Incident Investigation Workflow
 * Cloudflare Workflow with durable, independently retryable steps.
 */

import { WorkflowEntrypoint, WorkflowEvent, WorkflowStep } from 'cloudflare:workers';
import type { Env } from '../types/env';
import type { WorkflowInput, ToolResult, TriageResponse, AnalysisResponse } from '../types/index';
import { AiService } from '../ai/ai-service';
import { getTriageSystemPrompt, getTriageUserPrompt } from '../prompts/triage';
import { getAnalysisSystemPrompt, getAnalysisUserPrompt } from '../prompts/analysis';
import { executeTool } from '../tools/index';
import { Logger } from '../utils/logger';

export class IncidentInvestigationWorkflow extends WorkflowEntrypoint<Env, WorkflowInput> {
  async run(event: WorkflowEvent<WorkflowInput>, step: WorkflowStep): Promise<void> {
    const { incidentId, targetUrl, userQuestion, demoMode } = event.payload;
    const log = new Logger({ incidentId, workflow: 'IncidentInvestigation' });

    // Helper to call Durable Object safely
    const callDO = async (path: string, method: string, body?: unknown): Promise<unknown> => {
      const doId = this.env.INCIDENT_SESSION.idFromName('global');
      const doStub = this.env.INCIDENT_SESSION.get(doId);
      const opts: RequestInit = { method, headers: { 'Content-Type': 'application/json' } };
      if (body !== undefined) opts.body = JSON.stringify(body);
      const resp = await doStub.fetch(`http://do${path}`, opts);
      const text = await resp.text();
      if (!resp.ok) {
        throw new Error(`DO call failed [${method} ${path}] (${resp.status}): ${text}`);
      }
      return text ? JSON.parse(text) : { success: true };
    };

    // ── Step 1: Update status to planning ──
    await step.do('update-status-planning', async () => {
      log.info('Step 1: Updating status to planning');
      await callDO(`/incident/${incidentId}`, 'PATCH', { status: 'planning' });
      await callDO('/step', 'POST', { incidentId, stepName: 'AI Triage' });
      await callDO('/step', 'PATCH', { incidentId, stepName: 'AI Triage', status: 'running' });
      return { step: 'planning', ok: true };
    });

    // ── Step 2: LLM Incident Triage ──
    const triage = await step.do('llm-triage', async () => {
      log.info('Step 2: Running LLM triage');
      const aiService = new AiService(this.env);
      const systemPrompt = getTriageSystemPrompt();
      const userPrompt = getTriageUserPrompt(targetUrl, userQuestion);
      const result = await aiService.triage(systemPrompt, userPrompt, demoMode);
      log.info('Triage completed', {
        incidentType: result.incidentType,
        severity: result.severity,
        toolCount: result.investigationPlan.length,
      });
      return result;
    }) as TriageResponse;

    // ── Step 3: Persist investigation plan ──
    await step.do('persist-plan', async () => {
      log.info('Step 3: Persisting investigation plan');

      // Update incident with triage results
      await callDO(`/incident/${incidentId}`, 'PATCH', {
        incidentType: triage.incidentType,
        severity: triage.severity,
        status: 'investigating',
      });

      // Complete the triage step
      await callDO('/step', 'PATCH', { incidentId, stepName: 'AI Triage', status: 'completed' });

      // Add AI triage message
      await callDO('/message', 'POST', {
        incidentId,
        role: 'assistant',
        content: `**Incident Classification:** ${triage.incidentType}\n**Initial Severity:** ${triage.severity}\n**Reasoning:** ${triage.reason}\n\nI'll now run the following diagnostics: ${triage.investigationPlan.join(', ')}`,
      });

      // Create steps for each planned tool
      for (const tool of triage.investigationPlan) {
        await callDO('/step', 'POST', { incidentId, stepName: tool });
      }

      return { step: 'persist-plan', ok: true };
    });

    // ── Step 4: Run diagnostic tools ──
    const toolResults = await step.do('run-diagnostics', async () => {
      log.info('Step 4: Running diagnostic tools', {
        tools: triage.investigationPlan,
      });

      const results: ToolResult[] = [];

      // Run tools (sequentially for durability, each with error handling)
      for (const toolName of triage.investigationPlan) {
        await callDO('/step', 'PATCH', { incidentId, stepName: toolName, status: 'running' });

        try {
          const result = await executeTool(toolName, targetUrl, demoMode);
          results.push(result);

          // Persist individual result
          await callDO('/tool-result', 'POST', { incidentId, toolName, result });
          await callDO('/step', 'PATCH', { incidentId, stepName: toolName, status: 'completed' });

          log.info(`Tool ${toolName} completed`, { status: result.status });
        } catch (err) {
          const errorMsg = err instanceof Error ? err.message : 'Tool execution failed';
          log.error(`Tool ${toolName} failed`, { error: errorMsg });
          await callDO('/step', 'PATCH', {
            incidentId, stepName: toolName, status: 'failed', error: errorMsg,
          });
          // Continue with other tools — don't fail the whole workflow
        }
      }

      return results;
    }) as ToolResult[];

    // ── Step 5: Persist diagnostic results summary ──
    await step.do('persist-results', async () => {
      log.info('Step 5: Persisting diagnostic results');

      const resultSummary = toolResults.map((r) => {
        const lines = [`**${r.tool}**: ${r.status}`];
        if (r.error) lines.push(`  Error: ${r.error}`);
        if ('httpStatus' in r && r.httpStatus) lines.push(`  HTTP Status: ${r.httpStatus}`);
        if ('latencyMs' in r) lines.push(`  Latency: ${r.latencyMs}ms`);
        if ('records' in r) lines.push(`  Records: ${r.records.length} found`);
        if ('score' in r) lines.push(`  Score: ${r.score}/${r.maxScore}`);
        return lines.join('\n');
      }).join('\n\n');

      await callDO('/message', 'POST', {
        incidentId,
        role: 'assistant',
        content: `**Diagnostic Results:**\n\n${resultSummary}`,
      });

      return { step: 'persist-results', ok: true };
    });

    // ── Step 6: Load historical context ──
    const historicalContext = await step.do('load-history', async () => {
      log.info('Step 6: Loading historical context');
      const context = await callDO(
        `/history-context/${encodeURIComponent(targetUrl)}`, 'GET'
      );
      return (context as string) || '';
    }) as string;

    // ── Step 7: Update status to analyzing ──
    await step.do('update-status-analyzing', async () => {
      log.info('Step 7: Updating status to analyzing');
      await callDO(`/incident/${incidentId}`, 'PATCH', { status: 'analyzing' });
      await callDO('/step', 'POST', { incidentId, stepName: 'AI Analysis' });
      await callDO('/step', 'PATCH', { incidentId, stepName: 'AI Analysis', status: 'running' });
      return { step: 'analyzing', ok: true };
    });

    // ── Step 8: LLM Root Cause Analysis ──
    const analysis = await step.do('llm-analysis', async () => {
      log.info('Step 8: Running LLM root cause analysis');
      const aiService = new AiService(this.env);
      const incident = await callDO(`/incident/${incidentId}`, 'GET') as {
        id: string; targetUrl: string; userQuestion: string;
        incidentType: string; severity: string; status: string;
        confidence: number | null; createdAt: string; updatedAt: string;
      };

      const systemPrompt = getAnalysisSystemPrompt();
      const userPrompt = getAnalysisUserPrompt(
        incident as any,
        toolResults,
        historicalContext || undefined
      );

      const result = await aiService.analyze(systemPrompt, userPrompt, demoMode);
      log.info('Analysis completed', {
        confidence: result.confidence,
        severity: result.severity,
      });
      return result;
    }) as AnalysisResponse;

    // ── Step 9: Persist final report ──
    await step.do('persist-report', async () => {
      log.info('Step 9: Persisting final report');

      // Save analysis
      await callDO('/analysis', 'POST', { incidentId, analysis });

      // Update incident with final analysis data
      await callDO(`/incident/${incidentId}`, 'PATCH', {
        severity: analysis.severity,
        confidence: analysis.confidence,
        incidentType: analysis.incidentType,
      });

      // Mark analysis step completed
      await callDO('/step', 'PATCH', { incidentId, stepName: 'AI Analysis', status: 'completed' });

      // Add analysis message
      const actionsText = analysis.recommendedActions
        .map((a, i) => `${i + 1}. **${a.problem}**: ${a.action}`)
        .join('\n');

      const limitationsText = analysis.limitations
        .map((l) => `- ${l}`)
        .join('\n');

      await callDO('/message', 'POST', {
        incidentId,
        role: 'assistant',
        content: `**Investigation Complete**\n\n**Summary:** ${analysis.summary}\n\n**Likely Root Cause:** ${analysis.likelyRootCause}\n\n**Confidence:** ${Math.round(analysis.confidence * 100)}%\n\n**Recommended Actions:**\n${actionsText}\n\n**Limitations:**\n${limitationsText}`,
      });

      return { step: 'persist-report', ok: true };
    });

    // ── Step 10: Mark incident completed ──
    await step.do('mark-completed', async () => {
      log.info('Step 10: Marking incident completed');
      await callDO(`/incident/${incidentId}`, 'PATCH', { status: 'completed' });
      log.info('Workflow completed successfully', { incidentId });
      return { step: 'completed', ok: true };
    });
  }
}
