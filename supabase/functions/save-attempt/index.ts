/**
 * save-attempt: saves one segment try with every FR-23 field (runbook S20, D-54).
 *
 * POST saveAttemptInputSchema (src/domain/attempt.ts) with the pupil's own session.
 *   200 { ok: true, duplicate?, judged, answerVerdict, reasoningVerdict, codes }
 *   400 bad_input   (bad shape, unknown question or version, a fake tap, wrong segment)
 *   401, 403        (no session, not this pupil, no consent: BL-15)
 *   409 wrong_round (not the open round or not the next try)
 *   500 server
 *
 * The only writer of attempts (D-29). The verdicts are decided here by
 * resolveAttempt from the stored ai-check result for this attempt id
 * (check_results) and the taps, judged against the stored options; the phone
 * never sends a verdict. The attempt id is made on the phone, so a resend
 * returns the saved row's answer and never makes a second row. The trigger on
 * attempts moves segment_status on (tries, rounds, moved on, complete).
 */
import { createClient } from '@supabase/supabase-js';

import { checkPupil, CORS, jsonReply, keyFromEnv } from '../_shared/pupilSession.ts';
import type { CheckResult } from '../../../src/domain/aiSchemas.ts';
import { checkMatchesAttempt, resolveAttempt, saveAttemptInputSchema, toInputMode } from '../../../src/domain/attempt.ts';
import type { CheckItem } from '../../../src/domain/check.ts';

const url = Deno.env.get('SUPABASE_URL') ?? '';
const serviceKey = keyFromEnv('SUPABASE_SERVICE_ROLE_KEY', 'SUPABASE_SECRET_KEYS');
const admin = createClient(url, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
});

const asStrings = (v: unknown): string[] => (Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : []);

Deno.serve(async (req) => {
  const started = Date.now();
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS });
  if (req.method !== 'POST') return jsonReply(405, { error: 'bad_input' }, 'bad_method', started);

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return jsonReply(400, { error: 'bad_input' }, 'bad_json', started);
  }
  const parsed = saveAttemptInputSchema.safeParse(body);
  if (!parsed.success) return jsonReply(400, { error: 'bad_input' }, 'bad_input', started);
  const input = parsed.data;

  try {
    if (!url || !serviceKey) throw new Error('function is not configured');
    const who = await checkPupil(admin, req, input.pupil_id);
    if (!who.ok) return jsonReply(who.status, { error: 'forbidden' }, who.outcome, started);
    const pupilId = who.pupilId;

    // A resend: answer from the saved row, change nothing.
    const existing = await admin
      .from('attempts')
      .select('id, pupil_id, answer_verdict, reasoning_verdict, misconception_codes')
      .eq('id', input.attempt_id)
      .maybeSingle();
    if (existing.error) throw new Error('attempt lookup failed');
    if (existing.data) {
      if (existing.data.pupil_id !== pupilId) return jsonReply(409, { error: 'wrong_round' }, 'id_taken', started, pupilId);
      return jsonReply(
        200,
        {
          ok: true,
          duplicate: true,
          judged: existing.data.answer_verdict !== null && existing.data.reasoning_verdict !== null,
          answerVerdict: existing.data.answer_verdict,
          reasoningVerdict: existing.data.reasoning_verdict,
          codes: existing.data.misconception_codes,
        },
        'duplicate',
        started,
        pupilId,
      );
    }

    // The question, from the database.
    const row = await admin
      .from('check_items')
      .select('id, segment_id, try_number, question, accepted_answers, tap_options, reason_options, reference_reasoning')
      .eq('id', input.question_id)
      .maybeSingle();
    if (row.error) throw new Error('check item lookup failed');
    if (!row.data || row.data.try_number !== input.try_number) {
      return jsonReply(400, { error: 'bad_input' }, 'unknown_question', started, pupilId);
    }
    const seg = await admin.from('segments').select('id, code').eq('id', row.data.segment_id).maybeSingle();
    if (seg.error) throw new Error('segment lookup failed');
    if (!seg.data || seg.data.code !== input.segment_code) {
      return jsonReply(400, { error: 'bad_input' }, 'wrong_segment', started, pupilId);
    }
    const segmentId = seg.data.id as string;

    let versionId: string | null = null;
    if (input.version_label !== null) {
      const v = await admin.from('video_versions').select('id').eq('segment_id', segmentId).eq('label', input.version_label).maybeSingle();
      if (v.error) throw new Error('version lookup failed');
      if (!v.data) return jsonReply(400, { error: 'bad_input' }, 'unknown_version', started, pupilId);
      versionId = v.data.id as string;
    }

    // Round and try must be the open round and the next try (the trigger checks the round too).
    const status = await admin
      .from('segment_status')
      .select('round, tries_used, round_done')
      .eq('pupil_id', pupilId)
      .eq('segment_id', segmentId)
      .maybeSingle();
    if (status.error) throw new Error('progress lookup failed');
    const open = status.data ?? { round: 1, tries_used: 0, round_done: false };
    if (open.round_done || input.round !== open.round || input.try_number !== open.tries_used + 1) {
      return jsonReply(409, { error: 'wrong_round' }, 'wrong_round', started, pupilId);
    }

    // The latest check ai-check kept for this attempt, if it matches what is being saved.
    const kept = await admin
      .from('check_results')
      .select('answer_text, answer_mode, reason_text, reason_mode, result, flag_id')
      .eq('attempt_id', input.attempt_id)
      .eq('pupil_id', pupilId)
      .eq('check_item_id', row.data.id)
      .order('created_at', { ascending: false })
      .limit(1);
    if (kept.error) throw new Error('check lookup failed');
    const latest = kept.data[0];
    const texts = {
      answerText: input.answer_text,
      answerMode: input.answer_mode,
      reasonText: input.reason_text,
      reasonMode: input.reason_mode,
    };
    const matches =
      latest !== undefined &&
      checkMatchesAttempt(
        { answerText: latest.answer_text, answerMode: latest.answer_mode, reasonText: latest.reason_text, reasonMode: latest.reason_mode },
        texts,
      );
    const check = matches ? (latest.result as CheckResult) : null;

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
    const verdict = resolveAttempt({ ...texts, item, check, tapAnswer: input.tap_answer, tapReason: input.tap_reason });
    if (!verdict.ok) return jsonReply(400, { error: 'bad_input' }, 'bad_tap', started, pupilId);

    const insert = await admin.from('attempts').insert({
      id: input.attempt_id,
      pupil_id: pupilId,
      segment_id: segmentId,
      round: input.round,
      try_number: input.try_number,
      video_version_id: versionId,
      check_item_id: row.data.id,
      answer: input.answer_text,
      input_mode: toInputMode(input.answer_mode),
      reason: input.reason_text,
      reason_input_mode: toInputMode(input.reason_mode),
      sure: input.sure,
      time_taken_ms: input.time_taken_ms,
      changed_answer: input.changed_answer,
      answer_verdict: verdict.answerVerdict,
      reasoning_verdict: verdict.reasoningVerdict,
      misconception_codes: verdict.codes,
      read_back: verdict.safeguarding ? null : (check?.readBack ?? null),
      read_back_confirmed: input.read_back_confirmed,
      ai_fallback: verdict.aiFallback,
      tap_answer: input.tap_answer,
      tap_reason: input.tap_reason,
      client_created_at: input.client_created_at,
    });
    if (insert.error) {
      // Two sends at once: the other one saved it.
      if (insert.error.code === '23505') return jsonReply(200, { ok: true, duplicate: true }, 'duplicate_race', started, pupilId);
      if (insert.error.code === '22023') return jsonReply(409, { error: 'wrong_round' }, 'wrong_round_trigger', started, pupilId);
      throw new Error(`attempt insert failed: ${insert.error.code}`);
    }

    // Rule 14: the safeguarding flag ai-check made now names its attempt.
    if (matches && latest.flag_id) {
      const link = await admin.from('flags').update({ attempt_id: input.attempt_id }).eq('id', latest.flag_id);
      if (link.error) console.error(JSON.stringify({ outcome: 'flag_link_failed', pupil_id: pupilId }));
    }

    return jsonReply(
      200,
      {
        ok: true,
        judged: verdict.judged,
        answerVerdict: verdict.answerVerdict,
        reasoningVerdict: verdict.reasoningVerdict,
        codes: verdict.codes,
      },
      verdict.judged ? 'saved' : 'saved_unjudged',
      started,
      pupilId,
    );
  } catch (e) {
    console.error(JSON.stringify({ outcome: 'server_error', reason: e instanceof Error ? e.message : 'unknown' }));
    return jsonReply(500, { error: 'server' }, 'server_error', started);
  }
});
