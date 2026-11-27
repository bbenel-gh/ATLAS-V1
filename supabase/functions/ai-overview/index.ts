/**
 * ai-overview: listens to what a pupil took from a topic overview video
 * (specs/framework.md Stage 3; specs/prd.md FR-11 to FR-13; runbook S17; D-49).
 *
 * POST { pupil_id, topic_code, response_id, summary_text, confusing_text, client_created_at? }
 * with the pupil's own session in Authorization.
 *   { ok: true }                      saved (and, unless skipped, the profile updated)
 *   { fallback: true, retry: true }   saved, the AI did not answer: the phone may send again later
 *   { fallback: true, retry: false }  saved, a daily AI cap is reached: do not send again
 *   403 forbidden                     not this pupil, or no consent: nothing saved
 *   400 bad_input, 401, 500           nothing to keep from this call
 *
 * Rules kept here: the key is a Supabase secret (1), no name or class goes to
 * the AI (2), zod on every output with one retry (3), 20-second limit (5),
 * every call logged in ai_calls (9), caps before every call (13), a
 * safeguarding verdict makes a flag and nothing else (14). The pupil never
 * waits for this: the phone has already said thanks.
 *
 * Provider (D-50): Claude when ANTHROPIC_API_KEY is set. Until then, on
 * atlas-dev with fake test pupils only, a chain of free OpenRouter models
 * (OPENROUTER_API_KEY, optional OPENROUTER_MODELS). Stand-in calls are logged
 * as "openrouter/<model>". Off before any real pupil uses ATLAS.
 */
import Anthropic from '@anthropic-ai/sdk';
import { createClient } from '@supabase/supabase-js';

import {
  AI_TIMEOUT_MS,
  buildOverviewUserMessage,
  capCheck,
  isSkipped,
  mergeProfile,
  OVERVIEW_MODEL,
  OVERVIEW_SYSTEM_PROMPT,
  overviewInputSchema,
  type OverviewOutput,
  type OverviewReply,
  parseOverviewOutput,
  type SegmentRef,
  startOfUtcDay,
  titlesToCodes,
} from '../../../src/domain/overview.ts';
import { loggedModel, pickProvider } from '../../../src/domain/aiProvider.ts';

/** New projects give JSON maps of keys ({"default": "sb_..."}); older ones give single keys. */
function keyFromEnv(single: string, map: string): string {
  const direct = Deno.env.get(single);
  if (direct) return direct;
  try {
    const keys = JSON.parse(Deno.env.get(map) ?? '{}') as Record<string, string>;
    return keys.default ?? Object.values(keys)[0] ?? '';
  } catch {
    return '';
  }
}

const url = Deno.env.get('SUPABASE_URL') ?? '';
const serviceKey = keyFromEnv('SUPABASE_SERVICE_ROLE_KEY', 'SUPABASE_SECRET_KEYS');
const apiKey = Deno.env.get('ANTHROPIC_API_KEY') ?? '';
const openrouterKey = Deno.env.get('OPENROUTER_API_KEY') ?? '';

// Claude when its key is set; until then the free OpenRouter chain on atlas-dev only (D-50).
const provider = pickProvider({ anthropicKey: apiKey, openrouterKey, openrouterModels: Deno.env.get('OPENROUTER_MODELS') });

const admin = createClient(url, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
});
const anthropic = provider.kind === 'anthropic' ? new Anthropic({ apiKey, maxRetries: 0, timeout: AI_TIMEOUT_MS }) : null;

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

/** Logs only the outcome, the pupil id and the time: never the pupil's words. */
function reply(status: number, body: OverviewReply, outcome: string, started: number, pupilId?: string): Response {
  console.log(JSON.stringify({ outcome, pupil_id: pupilId ?? null, ms: Date.now() - started }));
  return new Response(JSON.stringify(body), { status, headers: { ...CORS, 'Content-Type': 'application/json' } });
}

/** model is what goes in ai_calls.model: the Claude model, or the stand-in model that answered. */
type Attempt = { output: OverviewOutput | null; logged: Record<string, unknown>; ms: number; model: string };

/** One call to the model. Never throws: a failure is an attempt with no output. */
function askModel(userMessage: string): Promise<Attempt> {
  if (provider.kind === 'openrouter') return askOpenRouter(provider.models, userMessage);
  return askClaude(userMessage);
}

async function askClaude(userMessage: string): Promise<Attempt> {
  const t0 = Date.now();
  if (!anthropic) return { output: null, logged: { error: 'no AI key is set' }, ms: 0, model: OVERVIEW_MODEL };
  try {
    const res = await anthropic.messages.create({
      model: OVERVIEW_MODEL,
      max_tokens: 2000,
      output_config: { effort: 'low' },
      system: OVERVIEW_SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userMessage }],
    });
    const text = res.content.map((b) => (b.type === 'text' ? b.text : '')).join('');
    const output = res.stop_reason === 'end_turn' ? parseOverviewOutput(text) : null;
    return {
      output,
      logged: output
        ? { result: output, stop_reason: res.stop_reason, usage: res.usage }
        : { error: 'bad_output', stop_reason: res.stop_reason, text: text.slice(0, 2000) },
      ms: Date.now() - t0,
      model: OVERVIEW_MODEL,
    };
  } catch (e) {
    const status = e instanceof Anthropic.APIError ? e.status : undefined;
    const kind = e instanceof Anthropic.APIConnectionTimeoutError ? 'timeout' : e instanceof Anthropic.APIError ? 'api_error' : 'error';
    return { output: null, logged: { error: kind, status: status ?? null }, ms: Date.now() - t0, model: OVERVIEW_MODEL };
  }
}

/**
 * The stand-in (D-50): OpenRouter chat completions with a model chain. The
 * first model is tried, and OpenRouter moves to the next on any error, a
 * used-up free limit included. No app name or referrer is sent. The same
 * prompt, 20-second limit and zod check as Claude.
 */
async function askOpenRouter(models: string[], userMessage: string): Promise<Attempt> {
  const t0 = Date.now();
  const chain = { kind: 'openrouter' as const, models };
  try {
    const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${openrouterKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: models[0],
        models: models.slice(1),
        max_tokens: 2000,
        messages: [
          { role: 'system', content: OVERVIEW_SYSTEM_PROMPT },
          { role: 'user', content: userMessage },
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
    const served = typeof body?.model === 'string' ? body.model : undefined;
    const model = loggedModel(chain, OVERVIEW_MODEL, served);
    if (!res.ok || !body?.choices?.[0]) {
      return { output: null, logged: { error: 'api_error', status: res.status, code: body?.error?.code ?? null }, ms: Date.now() - t0, model };
    }
    const choice = body.choices[0];
    const text = typeof choice.message?.content === 'string' ? choice.message.content : '';
    const output = choice.finish_reason === 'stop' ? parseOverviewOutput(text) : null;
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
    return { output: null, logged: { error: kind }, ms: Date.now() - t0, model: loggedModel(chain, OVERVIEW_MODEL) };
  }
}

Deno.serve(async (req) => {
  const started = Date.now();
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS });
  if (req.method !== 'POST') return reply(405, { error: 'bad_input' }, 'bad_method', started);

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return reply(400, { error: 'bad_input' }, 'bad_json', started);
  }
  const parsed = overviewInputSchema.safeParse(body);
  if (!parsed.success) return reply(400, { error: 'bad_input' }, 'bad_input', started);
  const input = parsed.data;

  try {
    if (!url || !serviceKey) throw new Error('function is not configured');

    // The caller must be this pupil (verify_jwt is off, as for pupil-signin; the token is checked here).
    const token = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '');
    const user = token ? await admin.auth.getUser(token) : null;
    if (!user || user.error || !user.data.user) return reply(401, { error: 'forbidden' }, 'no_session', started);
    const pupil = await admin.from('pupils').select('id, status').eq('user_id', user.data.user.id).maybeSingle();
    if (pupil.error) throw new Error('pupil lookup failed');
    if (!pupil.data || pupil.data.id !== input.pupil_id || pupil.data.status !== 'active') {
      return reply(403, { error: 'forbidden' }, 'not_this_pupil', started);
    }
    const pupilId = pupil.data.id;

    // No consent, no pupil text kept and nothing sent to the AI (FR-4).
    const consent = await admin.from('consents').select('id').eq('pupil_id', pupilId).is('withdrawn_at', null).limit(1);
    if (consent.error) throw new Error('consent lookup failed');
    if (consent.data.length === 0) return reply(403, { error: 'forbidden' }, 'no_consent', started, pupilId);

    const topic = await admin.from('topics').select('id').eq('code', input.topic_code).maybeSingle();
    if (topic.error) throw new Error('topic lookup failed');
    if (!topic.data) return reply(400, { error: 'bad_input' }, 'unknown_topic', started, pupilId);
    const topicId = topic.data.id;

    // Save the row first, once per response_id, so the texts are never lost (FR-13).
    const existing = await admin.from('overview_responses').select('pupil_id, ai_result').eq('id', input.response_id).maybeSingle();
    if (existing.error) throw new Error('response lookup failed');
    if (existing.data && existing.data.pupil_id !== pupilId) return reply(403, { error: 'forbidden' }, 'not_their_response', started, pupilId);
    if (existing.data?.ai_result) return reply(200, { ok: true }, 'already_done', started, pupilId);
    const skipped = isSkipped(input);
    if (!existing.data) {
      const saved = await admin.from('overview_responses').insert({
        id: input.response_id,
        pupil_id: pupilId,
        topic_id: topicId,
        summary_text: input.summary_text || null,
        confusing_text: input.confusing_text || null,
        skipped,
        client_created_at: input.client_created_at ?? null,
      });
      if (saved.error && saved.error.code !== '23505') throw new Error('could not save the response');
    }
    if (skipped) return reply(200, { ok: true }, 'skipped', started, pupilId);

    const segments = await admin.from('segments').select('code, title').eq('topic_id', topicId).order('sort_order');
    if (segments.error) throw new Error('segment lookup failed');
    const segs: SegmentRef[] = segments.data;

    // Rule 13: count today's calls before asking.
    const since = startOfUtcDay(new Date()).toISOString();
    const [mine, all, settings] = await Promise.all([
      admin.from('ai_calls').select('id', { count: 'exact', head: true }).eq('pupil_id', pupilId).gte('created_at', since),
      admin.from('ai_calls').select('id', { count: 'exact', head: true }).gte('created_at', since),
      admin.from('app_settings').select('global_daily_ai_cap').maybeSingle(),
    ]);
    if (mine.error || all.error || settings.error) throw new Error('cap lookup failed');
    const globalCap = settings.data?.global_daily_ai_cap ?? 0;

    // Rule 2: only the segment titles and the pupil's own words.
    const userMessage = buildOverviewUserMessage(segs, input.summary_text, input.confusing_text);
    const loggedInput = JSON.parse(userMessage) as Record<string, unknown>;

    let output: OverviewOutput | null = null;
    let answeredBy = OVERVIEW_MODEL;
    for (let i = 0; i < 2 && !output; i++) {
      const cap = capCheck({ pupilToday: (mine.count ?? 0) + i, globalToday: (all.count ?? 0) + i, globalCap });
      if (cap !== 'ok') return reply(200, { fallback: true, retry: false }, cap, started, pupilId);
      const attempt = await askModel(userMessage);
      output = attempt.output;
      answeredBy = attempt.model;
      const log = await admin.from('ai_calls').insert({
        job: 'overview',
        model: attempt.model,
        pupil_id: pupilId,
        input: { ...loggedInput, response_id: input.response_id, try: i + 1 },
        output: attempt.logged,
        ok: output !== null,
        latency_ms: attempt.ms,
      });
      if (log.error) console.error(JSON.stringify({ outcome: 'log_failed', pupil_id: pupilId }));
    }
    if (!output) return reply(200, { fallback: true, retry: true }, 'ai_failed', started, pupilId);

    const result = {
      keywords: output.keywords,
      interests: output.interests,
      confusions: output.confusions,
      segmentsMentioned: titlesToCodes(output.segments_mentioned, segs),
      safeguarding: output.safeguarding,
      model: answeredBy,
    };
    const upd = await admin.from('overview_responses').update({ ai_result: result }).eq('id', input.response_id);
    if (upd.error) throw new Error('could not save the AI result');

    const prof = await admin
      .from('profiles')
      .select('overview_keywords, overview_interests, overview_confusions')
      .eq('pupil_id', pupilId)
      .maybeSingle();
    if (prof.error) throw new Error('profile lookup failed');
    const merged = mergeProfile(
      {
        keywords: prof.data?.overview_keywords ?? [],
        interests: prof.data?.overview_interests ?? [],
        confusions: prof.data?.overview_confusions ?? [],
      },
      { keywords: result.keywords, interests: result.interests, confusions: result.confusions },
    );
    const saveProfile = await admin.from('profiles').upsert(
      {
        pupil_id: pupilId,
        overview_keywords: merged.keywords,
        overview_interests: merged.interests,
        overview_confusions: merged.confusions,
      },
      { onConflict: 'pupil_id' },
    );
    if (saveProfile.error) throw new Error('could not update the profile');

    // Rule 14: a flag for the admin; the pupil already saw only the thanks message. S27 adds the alert email.
    if (result.safeguarding) {
      const flag = await admin.from('flags').insert({
        pupil_id: pupilId,
        kind: 'safeguarding',
        note: `Overview response ${input.response_id} (topic ${input.topic_code})`,
      });
      if (flag.error) throw new Error('could not create the safeguarding flag');
    }

    return reply(200, { ok: true }, result.safeguarding ? 'saved_safeguarding' : 'saved', started, pupilId);
  } catch (e) {
    console.error(JSON.stringify({ outcome: 'server_error', reason: e instanceof Error ? e.message : 'unknown' }));
    return reply(500, { error: 'server' }, 'server_error', started);
  }
});
