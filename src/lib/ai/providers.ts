/**
 * AI Model Registry & Execution Layer
 *
 * Centralizes model configuration for the multi-agent extraction pipeline.
 * Currently uses the existing `openai` package exclusively.
 *
 * ┌─────────────────────────────────────────────────────────────────────┐
 * │ FUTURE: When multi-provider API keys are available, replace the    │
 * │ internals of executeAgent() with Vercel AI SDK generateText().     │
 * │ Agent code stays identical — only this file changes.               │
 * └─────────────────────────────────────────────────────────────────────┘
 *
 * @module ai/providers
 */

import OpenAI from 'openai';

// ─── Types ───────────────────────────────────────────────────────────────────

export type AgentRole = 'chunker' | 'coverage' | 'financial' | 'merger';

export interface AgentModelConfig {
  /** OpenAI-compatible model identifier */
  modelId: string;
  /** Sampling temperature (0–1) */
  temperature: number;
  /** Maximum response tokens */
  maxTokens: number;
  /** Human-readable label for logs */
  label: string;
}

export interface AgentResponse {
  /** Raw text response from the model */
  text: string;
  /** Token usage for cost tracking */
  usage: {
    promptTokens: number;
    completionTokens: number;
  };
  /** Elapsed time in milliseconds */
  durationMs: number;
}

// ─── Model Registry ──────────────────────────────────────────────────────────
//
// Edit this map to swap models per agent. Each agent reads its own env var
// so operators can override per-agent without code changes.
//
// When Google / DeepSeek keys arrive:
//   1. Install @ai-sdk/openai + @ai-sdk/google (or bare SDKs)
//   2. Add provider instances here
//   3. Update executeAgent() internals
//   4. Agent files stay UNCHANGED

const AGENT_MODELS: Record<AgentRole, AgentModelConfig> = {
  chunker: {
    modelId: process.env.AGENT_CHUNKER_MODEL || 'gpt-4.1-nano',
    temperature: 0.1,
    maxTokens: 2048,
    label: 'Semantic Chunker',
  },
  coverage: {
    modelId: process.env.AGENT_COVERAGE_MODEL || 'gpt-4.1-nano',
    temperature: 0.2,
    maxTokens: 4000,
    label: 'Coverage Extractor',
  },
  financial: {
    modelId: process.env.AGENT_FINANCIAL_MODEL || 'gpt-4.1-nano',
    temperature: 0.1,
    maxTokens: 3000,
    label: 'Financial Extractor',
  },
  merger: {
    modelId: process.env.AGENT_MERGER_MODEL || 'gpt-4.1-mini',
    temperature: 0.1,
    maxTokens: 6000,
    label: 'Merger & Validator',
  },
};

/**
 * Returns the model configuration for a given agent role.
 * Useful for telemetry and logging without executing a call.
 */
export function getAgentConfig(role: AgentRole): AgentModelConfig {
  return AGENT_MODELS[role];
}

// ─── OpenAI Client (Lazy Singleton) ──────────────────────────────────────────

let _client: OpenAI | null = null;

function getClient(): OpenAI {
  if (!_client) {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error(
        'OPENAI_API_KEY not configured. Multi-agent pipeline requires an API key.',
      );
    }
    _client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }
  return _client;
}

// ─── Agent Execution ─────────────────────────────────────────────────────────

/**
 * Executes a single agent call with role-specific model config.
 *
 * Uses `response_format: { type: 'json_object' }` for reliable JSON output.
 * Includes per-agent timeout protection via `Promise.race`.
 *
 * @param role         - Agent role (determines model + params)
 * @param systemPrompt - System-level instructions
 * @param userPrompt   - User-level content (document text, agent outputs, etc.)
 * @param timeoutMs    - Per-agent timeout (default 60 s)
 * @returns AgentResponse with raw text and usage metrics
 *
 * @future Replace internals with Vercel AI SDK `generateText()` for multi-provider
 */
export async function executeAgent(
  role: AgentRole,
  systemPrompt: string,
  userPrompt: string,
  timeoutMs: number = 60_000,
): Promise<AgentResponse> {
  const config = AGENT_MODELS[role];
  const client = getClient();
  const startTime = Date.now();

  console.log(`🤖 [${config.label}] Iniciando con modelo ${config.modelId}...`);

  const requestPromise = client.chat.completions.create({
    model: config.modelId,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    temperature: config.temperature,
    max_tokens: config.maxTokens,
    response_format: { type: 'json_object' },
  });

  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(
      () =>
        reject(
          new Error(
            `Agent ${role} (${config.label}) timed out after ${timeoutMs}ms`,
          ),
        ),
      timeoutMs,
    );
  });

  const response = await Promise.race([requestPromise, timeoutPromise]);
  const durationMs = Date.now() - startTime;

  const text = response.choices[0]?.message?.content || '{}';
  const promptTokens = response.usage?.prompt_tokens ?? 0;
  const completionTokens = response.usage?.completion_tokens ?? 0;

  console.log(
    `✅ [${config.label}] Completado en ${durationMs}ms ` +
      `(${promptTokens} prompt + ${completionTokens} completion tokens)`,
  );

  return {
    text,
    usage: { promptTokens, completionTokens },
    durationMs,
  };
}
