/**
 * ai-check: judges a pupil's answer and reason for one segment try
 * (runbook S19; specs/prd.md FR-17; specs/ai-prompts.md ai-check; D-52).
 *
 * POST { pupil_id, segment_code, try_number, question_id, answer_text,
 *        answer_mode, reason_text, reason_mode } with the pupil's own session.
 *   { ok: true, result }            verdicts, codes, read-back, safeguarding (checkResultSchema)
 *   { fallback: true, reason }      no verdict: "ai" (failed twice) or "cap" (rule 13); the app offers taps
 *   403 forbidden                   not this pupil, or no consent: nothing sent to the AI
 *   400 bad_input, 401, 500
 *
 * Rules kept here: key in Supabase secrets (1), only the question, references,
 * misconception list and the pupil's two texts go to the AI, never a name or
 * class (2), zod on every output with one retry (3), 20 s limit (5), every AI
 * call logged in ai_calls (9), caps before every call (13), a safeguarding
 * verdict makes a flag (14). Everything about the question is loaded from the
 * database, never taken from the phone. Two taps are judged here with no AI call.
 *
 * This function does not save the attempt: S20 does (BL-14).
 */
import Anthropic from '@anthropic-ai/sdk';
import { createClient } from '@supabase/supabase-js';

import { askModel } from '../_shared/askModel.ts';
import { parseCheckOutput, type CheckReply, type CheckResult } from '../../../src/domain/aiSchemas.ts';
import { pickProvider } from '../../../src/domain/aiProvider.ts';
import {
  buildCheckUserMessage,
  CHECK_MODEL,
  CHECK_SYSTEM_PROMPT,
  checkInputSchema,
  combineCheck,
  filterCodes,
  judgeTapAnswer,
  judgeTapReason,
  tapReadBack,
  type CheckItem,
  type CheckSegment,
  type TapReason,
} from '../../../src/domain/check.ts';
import { AI_TIMEOUT_MS, capCheck, startOfUtcDay } from '../../../src/domain/overview.ts';
import type { Verdict } from '../../../src/domain/aiSchemas.ts';

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
const provider = pickProvider({ anthropicKey: apiKey, openrouterKey, openrouterModels: Deno.env.get('OPENROUTER_MODELS') });

const admin = createClient(url, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
});
const anthropic = provider.kind === 'anthropic' ? new Anthropic({ apiKey, maxRetries: 0, timeout: AI_TIMEOUT_MS }) : null;

/** The model's answer for Claude structured outputs; parseCheckOutput still checks it. */
const OUTPUT_JSON_SCHEMA = {
  type: 'object',
  properties: {
    answer_correct: { type: 'string', enum: ['yes', 'no', 'unsure'] },
    reasoning_sound: { type: 'string', enum: ['yes', 'no', 'unsure'] },
    misconception_codes: { type: 'array', items: { type: 'string' } },
    read_back: { type: 'string' },
    safeguarding: { type: 'boolean' },
  },
  required: ['answer_correct', 'reasoning_sound', 'misconception_codes', 'read_back', 'safeguarding'],
  additionalProperties: false,
};

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

/** Logs only the outcome, the pupil id and the time: never the pupil's words. */
function reply(status: number, body: CheckReply, outcome: string, started: number, pupilId?: string): Response {
  console.log(JSON.stringify({ outcome, pupil_id: pupilId ?? null, ms: Date.now() - started }));
  return new Response(JSON.stringify(body), { status, headers: { ...CORS, 'Content-Type': 'application/json' } });
}

const asStrings = (v: unknown): string[] => (Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : []);

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
  const parsed = checkInputSchema.safeParse(body);
  if (!parsed.success) return reply(400, { error: 'bad_input' }, 'bad_input', started);
  const input = parsed.data;

  try {
    if (!url || !serviceKey) throw new Error('function is not configured');

    // The caller must be this pupil (verify_jwt is off; the token is checked here, D-36).
    const token = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '');
    const user = token ? await admin.auth.getUser(token) : null;
    if (!user || user.error || !user.data.user) return reply(401, { error: 'forbidden' }, 'no_session', started);
    const pupil = await admin.from('pupils').select('id, status').eq('user_id', user.data.user.id).maybeSingle();
    if (pupil.error) throw new Error('pupil lookup failed');
    if (!pupil.data || pupil.data.id !== input.pupil_id || pupil.data.status !== 'active') {
      return reply(403, { error: 'forbidden' }, 'not_this_pupil', started);
    }
    const pupilId = pupil.data.id;

    const consent = await admin.from('consents').select('id').eq('pupil_id', pupilId).is('withdrawn_at', null).limit(1);
    if (consent.error) throw new Error('consent lookup failed');
    if (consent.data.length === 0) return reply(403, { error: 'forbidden' }, 'no_consent', started, pupilId);

    // Everything about the question comes from the database, never from the phone.
    const row = await admin
      .from('check_items')
      .select('id, segment_id, try_number, question, accepted_answers, tap_options, reason_options, reference_reasoning')
      .eq('id', input.question_id)
      .maybeSingle();
    if (row.error) throw new Error('check item lookup failed');
    if (!row.data || row.data.try_number !== input.try_number) {
      return reply(400, { error: 'bad_input' }, 'unknown_question', started, pupilId);
    }
    const seg = await admin
      .from('segments')
      .select('id, code, reference_meaning, misconceptions')
      .eq('id', row.data.segment_id)
      .maybeSingle();
    if (seg.error) throw new Error('segment lookup failed');
    if (!seg.data || seg.data.code !== input.segment_code) {
      return reply(400, { error: 'bad_input' }, 'wrong_segment', started, pupilId);
    }

    const item: CheckItem = {
      question: row.data.question,
      acceptedAnswers: row.data.accepted_answers,
      tapOptions: asStrings(row.data.tap_options),
      reasonOptions: (Array.isArray(row.data.reason_options) ? row.data.reason_options : []).flatMap((o) => {
        const r = o as { text?: unknown; code?: unknown };
        return typeof r.text === 'string' ? [{ text: r.text, code: typeof r.code === 'string' ? r.code : null }] : [];
      }),
      referenceReasoning: row.data.reference_reasoning,
    };
    const segment: CheckSegment = {
      code: seg.data.code,
      referenceMeaning: seg.data.reference_meaning,
      misconceptions: (Array.isArray(seg.data.misconceptions) ? seg.data.misconceptions : []).flatMap((m) => {
        const x = m as { code?: unknown; text?: unknown };
        return typeof x.code === 'string' && typeof x.text === 'string' ? [{ code: x.code, text: x.text }] : [];
      }),
    };
    const segmentCodes = segment.misconceptions.map((m) => m.code);

    // Taps are judged without AI. A "tap" that is not one of the options is refused.
    let tapAnswer: Verdict | undefined;
    let tapReason: TapReason | undefined;
    if (input.answer_mode === 'tap') {
      const v = judgeTapAnswer(input.answer_text, item.tapOptions, item.acceptedAnswers);
      if (v === 'invalid') return reply(400, { error: 'bad_input' }, 'bad_tap_answer', started, pupilId);
      tapAnswer = v;
    }
    if (input.reason_mode === 'tap') {
      const v = judgeTapReason(input.reason_text, item.reasonOptions);
      if (v === 'invalid') return reply(400, { error: 'bad_input' }, 'bad_tap_reason', started, pupilId);
      tapReason = v;
    }
    if (tapAnswer && tapReason) {
      const result = combineCheck({ ai: null, tapAnswer, tapReason, readBack: tapReadBack(input.answer_text, input.reason_text) });
      return reply(200, { ok: true, result }, 'tap_only', started, pupilId);
    }

    // Rule 13: count today's calls before asking.
    const since = startOfUtcDay(new Date()).toISOString();
    const [mine, all, settings] = await Promise.all([
      admin.from('ai_calls').select('id', { count: 'exact', head: true }).eq('pupil_id', pupilId).gte('created_at', since),
      admin.from('ai_calls').select('id', { count: 'exact', head: true }).gte('created_at', since),
      admin.from('app_settings').select('global_daily_ai_cap').maybeSingle(),
    ]);
    if (mine.error || all.error || settings.error) throw new Error('cap lookup failed');
    const globalCap = settings.data?.global_daily_ai_cap ?? 0;

    // Rule 2: the question, the references, the misconception list and the pupil's two texts only.
    const userMessage = buildCheckUserMessage(item, segment, input.answer_text, input.reason_text);
    const loggedInput = JSON.parse(userMessage) as Record<string, unknown>;

    let ai: CheckResult | null = null;
    for (let i = 0; i < 2 && !ai; i++) {
      const cap = capCheck({ pupilToday: (mine.count ?? 0) + i, globalToday: (all.count ?? 0) + i, globalCap });
      if (cap !== 'ok') return reply(200, { fallback: true, reason: 'cap' }, cap, started, pupilId);
      const attempt = await askModel({
        provider,
        anthropic,
        openrouterKey,
        model: CHECK_MODEL,
        system: CHECK_SYSTEM_PROMPT,
        userMessage,
        effort: 'low',
        maxTokens: 4000,
        jsonSchema: OUTPUT_JSON_SCHEMA,
        parse: parseCheckOutput,
      });
      let dropped: string[] = [];
      if (attempt.output) {
        const codes = filterCodes(attempt.output.misconceptionCodes, segmentCodes);
        dropped = codes.dropped;
        ai = { ...attempt.output, misconceptionCodes: codes.kept };
      }
      const log = await admin.from('ai_calls').insert({
        job: 'check',
        model: attempt.model,
        pupil_id: pupilId,
        input: {
          ...loggedInput,
          segment_code: input.segment_code,
          try_number: input.try_number,
          question_id: input.question_id,
          answer_mode: input.answer_mode,
          reason_mode: input.reason_mode,
          ai_try: i + 1,
        },
        output: { ...attempt.logged, dropped_codes: dropped },
        ok: attempt.output !== null,
        latency_ms: attempt.ms,
      });
      if (log.error) console.error(JSON.stringify({ outcome: 'log_failed', pupil_id: pupilId }));
      if (dropped.length > 0) console.log(JSON.stringify({ outcome: 'codes_dropped', pupil_id: pupilId, codes: dropped }));
    }
    if (!ai) return reply(200, { fallback: true, reason: 'ai' }, 'ai_failed', started, pupilId);

    const result = combineCheck({ ai, tapAnswer, tapReason });

    // Rule 14: a flag for the admin. The app shows only the neutral message (S21, S22). S27 adds the alert email.
    if (result.safeguarding) {
      const flag = await admin.from('flags').insert({
        pupil_id: pupilId,
        kind: 'safeguarding',
        segment_id: seg.data.id,
        note: `Check answer, segment ${input.segment_code}, try ${input.try_number}, question ${input.question_id}`,
      });
      if (flag.error) throw new Error('could not create the safeguarding flag');
    }

    return reply(200, { ok: true, result }, result.safeguarding ? 'checked_safeguarding' : 'checked', started, pupilId);
  } catch (e) {
    console.error(JSON.stringify({ outcome: 'server_error', reason: e instanceof Error ? e.message : 'unknown' }));
    return reply(500, { error: 'server' }, 'server_error', started);
  }
});
