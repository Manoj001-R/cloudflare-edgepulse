/**
 * AI Service
 * Wrapper around Workers AI with JSON parsing, retry, and Zod validation.
 */

import type { Env } from '../types/env';
import type { TriageResponse, AnalysisResponse, FollowUpResponse } from '../types/index';
import { TriageResponseSchema, AnalysisResponseSchema, FollowUpResponseSchema } from '../schemas/incident';
import { getDemoTriage, getDemoAnalysis } from '../tools/demo-data';
import { Logger } from '../utils/logger';

const MAX_RETRIES = 1;

export class AiService {
  private ai: Ai;
  private model: string;
  private pythonLlmUrl?: string;
  private pythonLlmToken?: string;
  private log: Logger;

  constructor(env: Env) {
    this.ai = env.AI;
    this.model = env.AI_MODEL || '@cf/meta/llama-3.3-70b-instruct-fp8-fast';
    this.pythonLlmUrl = env.PYTHON_LLM_URL?.replace(/\/$/, '');
    this.pythonLlmToken = env.PYTHON_LLM_TOKEN;
    this.log = new Logger({ service: 'AiService' });
  }

  /**
   * Run LLM triage to classify the incident and plan investigation
   */
  async triage(
    systemPrompt: string,
    userPrompt: string,
    demoMode: boolean = false
  ): Promise<TriageResponse> {
    if (demoMode) {
      this.log.info('Using demo triage data');
      return getDemoTriage();
    }

    if (this.pythonLlmUrl) {
      return this.callPython('triage', systemPrompt, userPrompt, TriageResponseSchema);
    }

    return this.runWithValidation(
      systemPrompt,
      userPrompt,
      TriageResponseSchema,
      'triage'
    );
  }

  /**
   * Run LLM analysis on collected evidence
   */
  async analyze(
    systemPrompt: string,
    userPrompt: string,
    demoMode: boolean = false
  ): Promise<AnalysisResponse> {
    if (demoMode) {
      this.log.info('Using demo analysis data');
      return getDemoAnalysis();
    }

    if (this.pythonLlmUrl) {
      return this.callPython('analyze', systemPrompt, userPrompt, AnalysisResponseSchema);
    }

    return this.runWithValidation(
      systemPrompt,
      userPrompt,
      AnalysisResponseSchema,
      'analysis'
    );
  }

  /**
   * Handle follow-up conversation
   */
  async followUp(
    systemPrompt: string,
    userPrompt: string,
    demoMode: boolean = false
  ): Promise<FollowUpResponse> {
    if (demoMode) {
      return {
        answer: '[DEMO MODE] This is a simulated response. In production, the AI would analyze the incident context and provide a detailed answer to your question based on the collected evidence.',
        additionalContext: null,
      };
    }

    if (this.pythonLlmUrl) {
      return this.callPython('followup', systemPrompt, userPrompt, FollowUpResponseSchema);
    }

    return this.runWithValidation(
      systemPrompt,
      userPrompt,
      FollowUpResponseSchema,
      'followup'
    );
  }

  /**
   * Core method: call Workers AI, parse JSON, validate with Zod, retry on failure
   */
  private async runWithValidation<T>(
    systemPrompt: string,
    userPrompt: string,
    schema: { parse: (data: unknown) => T },
    label: string
  ): Promise<T> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      try {
        this.log.info(`AI ${label} attempt ${attempt + 1}`, { model: this.model });

        const response = await this.ai.run(this.model as any, {
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: attempt === 0 ? userPrompt : this.getRepairPrompt(userPrompt, lastError) },
          ],
          max_tokens: 2048,
          temperature: 0.3,
        });

        // Extract text from response
        const rawText = this.extractText(response);
        this.log.debug(`AI ${label} raw response`, { length: rawText.length });

        // Parse JSON
        const parsed = this.extractJson(rawText);

        // Validate with Zod
        const validated = schema.parse(parsed);
        this.log.info(`AI ${label} validated successfully`);

        return validated;
      } catch (err) {
        lastError = err instanceof Error ? err : new Error(String(err));
        this.log.warn(`AI ${label} attempt ${attempt + 1} failed`, {
          error: lastError.message,
        });
      }
    }

    throw new Error(`AI ${label} failed after ${MAX_RETRIES + 1} attempts: ${lastError?.message}`);
  }

  private async callPython<T>(
    operation: 'triage' | 'analyze' | 'followup',
    systemPrompt: string,
    userPrompt: string,
    schema: { parse: (data: unknown) => T },
  ): Promise<T> {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (this.pythonLlmToken) {
      headers.Authorization = `Bearer ${this.pythonLlmToken}`;
    }

    const response = await fetch(`${this.pythonLlmUrl}/v1/llm`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ operation, systemPrompt, userPrompt }),
    });
    const payload = await response.json() as { success?: boolean; data?: unknown; error?: string };
    if (!response.ok || !payload.success) {
      throw new Error(payload.error || `Python LLM request failed: ${response.status}`);
    }

    const validated = schema.parse(payload.data);
    this.log.info(`Python LLM ${operation} validated successfully`);
    return validated;
  }

  /**
   * Extract text from Workers AI response
   */
  private extractText(response: unknown): string {
    if (typeof response === 'string') return response;

    const resp = response as Record<string, unknown>;

    if (resp && typeof resp.response === 'string') {
      return resp.response;
    }

    if (resp && Array.isArray(resp.choices)) {
      const choice = resp.choices[0] as { message?: { content?: string } };
      if (choice?.message?.content) {
        return choice.message.content;
      }
    }

    return JSON.stringify(response);
  }

  /**
   * Extract JSON from response text that may contain markdown or extra text
   */
  private extractJson(text: string): unknown {
    // Try direct parse first
    try {
      return JSON.parse(text);
    } catch {
      // Try to find JSON block in markdown code fences
      const jsonMatch = text.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[1].trim());
      }

      // Try to find JSON object in the text
      const objectMatch = text.match(/\{[\s\S]*\}/);
      if (objectMatch) {
        return JSON.parse(objectMatch[0]);
      }

      throw new Error('Could not extract JSON from AI response');
    }
  }

  /**
   * Generate a repair prompt for retry
   */
  private getRepairPrompt(originalPrompt: string, error: Error | null): string {
    return `${originalPrompt}

IMPORTANT: Your previous response was invalid. Error: ${error?.message || 'Unknown error'}
Please respond with ONLY valid JSON matching the required schema. No markdown code fences, no extra text.`;
  }
}
