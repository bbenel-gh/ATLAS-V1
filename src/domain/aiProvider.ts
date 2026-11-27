/**
 * Which AI answers an Edge Function call (D-50). Pure TypeScript.
 *
 * Claude is the provider (CLAUDE.md Stack, rule 1). Until Bright sets
 * ANTHROPIC_API_KEY, atlas-dev may use a chain of free OpenRouter models as a
 * stand-in, with fake test pupils only. As soon as the Claude key is set,
 * Claude is used and the stand-in is never called. The stand-in must be off
 * before any real pupil uses ATLAS (pilot 9 December).
 */

/** Bright's chain, tried in order: OpenRouter moves to the next one on any error, a used-up limit included. */
export const DEFAULT_OPENROUTER_MODELS = [
  'nvidia/nemotron-3-ultra:free',
  'baidu/ernie-5.5-flash-preview:free',
  'recursive/flint-v1.0:free',
  'inclusionai/ling-3.2-flash:free',
] as const;

/** Marks stand-in calls in ai_calls.model, so they are never taken for Claude. */
export const OPENROUTER_PREFIX = 'openrouter/';

const MODEL_COLUMN_MAX = 80;

export type Provider = { kind: 'anthropic' } | { kind: 'openrouter'; models: string[] } | { kind: 'none' };

export function pickProvider(env: { anthropicKey?: string; openrouterKey?: string; openrouterModels?: string }): Provider {
  if ((env.anthropicKey ?? '').trim() !== '') return { kind: 'anthropic' };
  if ((env.openrouterKey ?? '').trim() === '') return { kind: 'none' };
  const listed = [...new Set((env.openrouterModels ?? '').split(',').map((m) => m.trim()).filter((m) => m !== ''))];
  return { kind: 'openrouter', models: listed.length > 0 ? listed : [...DEFAULT_OPENROUTER_MODELS] };
}

/** What goes in ai_calls.model: the Claude model, or the stand-in model that answered. */
export function loggedModel(provider: Provider, claudeModel: string, servedModel?: string): string {
  if (provider.kind !== 'openrouter') return claudeModel;
  return `${OPENROUTER_PREFIX}${servedModel ?? provider.models[0] ?? 'unknown'}`.slice(0, MODEL_COLUMN_MAX);
}
