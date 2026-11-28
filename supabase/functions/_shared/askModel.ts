/**
 * One call to the model for an Edge Function, Claude or the D-50 stand-in.
 * Never throws: a failure is an attempt with no output and an error to log.
 *
 * Claude (rule 1: the key is a Supabase secret, the app never calls Anthropic):
 * official SDK, maxRetries 0 and a 20 s limit (the function retries once
 * itself, rule 3), server-side refusal fallback (`fallbacks: "default"`), and
 * stop_reason must be end_turn. The stand-in (OpenRouter free chain) is used
 * only while ANTHROPIC_API_KEY is unset, on atlas-dev with fake pupils.
 *
 * Used by ai-check (S19). ai-overview still has its own copy (D-52).
 */
import Anthropic from '@anthropic-ai/sdk';

import { AI_TIMEOUT_MS } from '../../../src/domain/overview.ts';
import { loggedModel, type Provider } from '../../../src/domain/aiProvider.ts';

export type ModelAttempt<T> = { output: T | null; logged: Record<string, unknown>; ms: number; model: string };

export type AskOptions<T> = {
  provider: Provider;
  anthropic: Anthropic | null;
  openrouterKey: string;
  model: string;
  system: string;
  userMessage: string;
  effort: 'low' | 'medium' | 'high';
  maxTokens: number;
  /** JSON schema of the model's answer, for Claude structured outputs. zod still parses it (rule 3). */
  jsonSchema?: Record<string, unknown>;
  parse: (text: string) => T | null;
};

const message = (e: unknown) => (e instanceof Error ? e.message.slice(0, 300) : null);

export function askModel<T>(o: AskOptions<T>): Promise<ModelAttempt<T>> {
  if (o.provider.kind === 'openrouter') return askOpenRouter(o, o.provider.models);
  return askClaude(o);
}

async function askClaude<T>(o: AskOptions<T>): Promise<ModelAttempt<T>> {
  const t0 = Date.now();
  if (!o.anthropic) return { output: null, logged: { error: 'no AI key is set' }, ms: 0, model: o.model };
  try {
    const res = await o.anthropic.beta.messages.create({
      model: o.model,
      max_tokens: o.maxTokens,
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default',
      output_config: {
        effort: o.effort,
        ...(o.jsonSchema ? { format: { type: 'json_schema', schema: o.jsonSchema } } : {}),
      },
      system: o.system,
      messages: [{ role: 'user', content: o.userMessage }],
    } as unknown as Anthropic.Beta.MessageCreateParamsNonStreaming);
    const text = res.content.map((b) => (b.type === 'text' ? b.text : '')).join('');
    const output = res.stop_reason === 'end_turn' ? o.parse(text) : null;
    return {
      output,
      logged: output
        ? { result: output, stop_reason: res.stop_reason, served_by: res.model, usage: res.usage }
        : { error: 'bad_output', stop_reason: res.stop_reason, text: text.slice(0, 2000) },
      ms: Date.now() - t0,
      model: o.model,
    };
  } catch (e) {
    const status = e instanceof Anthropic.APIError ? e.status : undefined;
    const kind =
      e instanceof Anthropic.APIConnectionTimeoutError ? 'timeout' : e instanceof Anthropic.APIError ? 'api_error' : 'error';
    return { output: null, logged: { error: kind, status: status ?? null, message: message(e) }, ms: Date.now() - t0, model: o.model };
  }
}

/** The D-50 stand-in: OpenRouter with a model chain, no app name or referrer, same prompt, limit and zod check. */
async function askOpenRouter<T>(o: AskOptions<T>, models: string[]): Promise<ModelAttempt<T>> {
  const t0 = Date.now();
  const chain = { kind: 'openrouter' as const, models };
  try {
    const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${o.openrouterKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: models[0],
        models: models.slice(1),
        max_tokens: o.maxTokens,
        messages: [
          { role: 'system', content: o.system },
          { role: 'user', content: o.userMessage },
        ],
      }),
      signal: AbortSignal.timeout(AI_TIMEOUT_MS),
    });
    const body = (await res.json().catch(() => null)) as {
      model?: string;
      choices?: { message?: { content?: unknown }; finish_reason?: string | null }[];
      usage?: unknown;
      error?: { code?: unknown; message?: unknown };
    } | null;
    const model = loggedModel(chain, o.model, typeof body?.model === 'string' ? body.model : undefined);
    if (!res.ok || !body?.choices?.[0]) {
      const msg = typeof body?.error?.message === 'string' ? body.error.message.slice(0, 300) : null;
      return { output: null, logged: { error: 'api_error', status: res.status, code: body?.error?.code ?? null, message: msg }, ms: Date.now() - t0, model };
    }
    const choice = body.choices[0];
    const text = typeof choice.message?.content === 'string' ? choice.message.content : '';
    const output = choice.finish_reason === 'stop' ? o.parse(text) : null;
    return {
      output,
      logged: output
        ? { result: output, finish_reason: choice.finish_reason, usage: body.usage ?? null }
        : { error: 'bad_output', finish_reason: choice.finish_reason ?? null, text: text.slice(0, 2000) },
      ms: Date.now() - t0,
      model,
    };
  } catch (e) {
    const kind = e instanceof DOMException && e.name === 'TimeoutError' ? 'timeout' : 'error';
    return { output: null, logged: { error: kind }, ms: Date.now() - t0, model: loggedModel(chain, o.model) };
  }
}
