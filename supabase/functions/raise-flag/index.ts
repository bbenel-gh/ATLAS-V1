/**
 * raise-flag: a flag for the admin, asked by the pupil's app (runbook S20 item 1, D-54).
 * Pupils cannot insert flags directly (RLS). This function checks the pupil
 * and the kind against what the server already knows, so a pupil can never
 * make a flag the facts do not support.
 *
 * POST { pupil_id, kind, segment_code, attempt_id? } with the pupil's own session.
 *   kind "stalled":    the segment must be moved on for this pupil. Makes sure
 *                      one open stalled flag exists (the trigger normally made it).
 *   kind "borderline": attempt_id must be this pupil's saved attempt whose kept
 *                      ai-check result was "unsure" on a typed side (FR-22). One
 *                      flag per attempt; the note holds the AI output.
 *   200 { ok: true, created }   400 bad_input   401, 403   409 not_supported   500
 * Safeguarding flags are made by ai-check alone (rule 14).
 */
import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';

import { checkPupil, CORS, jsonReply, keyFromEnv } from '../_shared/pupilSession.ts';
import type { CheckResult } from '../../../src/domain/aiSchemas.ts';

const url = Deno.env.get('SUPABASE_URL') ?? '';
const serviceKey = keyFromEnv('SUPABASE_SERVICE_ROLE_KEY', 'SUPABASE_SECRET_KEYS');
const admin = createClient(url, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
});

const inputSchema = z.strictObject({
  pupil_id: z.uuid(),
  kind: z.enum(['stalled', 'borderline']),
  segment_code: z.string().regex(/^[0-9]{1,2}[A-Z]{1,2}$/),
  attempt_id: z.uuid().optional(),
});

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
  const parsed = inputSchema.safeParse(body);
  if (!parsed.success) return jsonReply(400, { error: 'bad_input' }, 'bad_input', started);
  const input = parsed.data;

  try {
    if (!url || !serviceKey) throw new Error('function is not configured');
    const who = await checkPupil(admin, req, input.pupil_id);
    if (!who.ok) return jsonReply(who.status, { error: 'forbidden' }, who.outcome, started);
    const pupilId = who.pupilId;

    if (input.kind === 'stalled') {
      // Segment codes are unique per topic; a pupil has one row per segment in segment_status.
      const segs = await admin.from('segments').select('id').eq('code', input.segment_code);
      if (segs.error) throw new Error('segment lookup failed');
      const ids = segs.data.map((s) => s.id as string);
      const status = ids.length
        ? await admin.from('segment_status').select('segment_id, status').eq('pupil_id', pupilId).in('segment_id', ids).eq('status', 'moved_on')
        : { data: [], error: null };
      if (status.error) throw new Error('progress lookup failed');
      const movedOn = status.data[0];
      if (!movedOn) return jsonReply(409, { error: 'not_supported' }, 'not_moved_on', started, pupilId);

      const openFlag = await admin
        .from('flags')
        .select('id')
        .eq('pupil_id', pupilId)
        .eq('segment_id', movedOn.segment_id)
        .eq('kind', 'stalled')
        .is('cleared_at', null)
        .limit(1);
      if (openFlag.error) throw new Error('flag lookup failed');
      if (openFlag.data.length > 0) return jsonReply(200, { ok: true, created: false }, 'stalled_exists', started, pupilId);
      const made = await admin.from('flags').insert({ pupil_id: pupilId, kind: 'stalled', segment_id: movedOn.segment_id });
      if (made.error) throw new Error('could not create the stalled flag');
      return jsonReply(200, { ok: true, created: true }, 'stalled_created', started, pupilId);
    }

    // Borderline.
    if (!input.attempt_id) return jsonReply(400, { error: 'bad_input' }, 'no_attempt', started, pupilId);
    const attempt = await admin
      .from('attempts')
      .select('id, pupil_id, segment_id, round, try_number')
      .eq('id', input.attempt_id)
      .maybeSingle();
    if (attempt.error) throw new Error('attempt lookup failed');
    if (!attempt.data || attempt.data.pupil_id !== pupilId) {
      return jsonReply(409, { error: 'not_supported' }, 'no_such_attempt', started, pupilId);
    }
    const seg = await admin.from('segments').select('id, code').eq('id', attempt.data.segment_id).maybeSingle();
    if (seg.error) throw new Error('segment lookup failed');
    if (!seg.data || seg.data.code !== input.segment_code) return jsonReply(400, { error: 'bad_input' }, 'wrong_segment', started, pupilId);

    const kept = await admin
      .from('check_results')
      .select('answer_mode, reason_mode, result')
      .eq('attempt_id', input.attempt_id)
      .eq('pupil_id', pupilId)
      .order('created_at', { ascending: false })
      .limit(1);
    if (kept.error) throw new Error('check lookup failed');
    const latest = kept.data[0];
    const result = latest?.result as CheckResult | undefined;
    const unsure =
      latest !== undefined &&
      result !== undefined &&
      ((latest.answer_mode === 'typing' && result.answerCorrect === 'unsure') ||
        (latest.reason_mode === 'typing' && result.reasoningSound === 'unsure'));
    if (!unsure) return jsonReply(409, { error: 'not_supported' }, 'not_unsure', started, pupilId);

    const existing = await admin.from('flags').select('id').eq('attempt_id', input.attempt_id).eq('kind', 'borderline').limit(1);
    if (existing.error) throw new Error('flag lookup failed');
    if (existing.data.length > 0) return jsonReply(200, { ok: true, created: false }, 'borderline_exists', started, pupilId);

    const note = JSON.stringify({
      segment: seg.data.code,
      round: attempt.data.round,
      try: attempt.data.try_number,
      ai: { answer_correct: result.answerCorrect, reasoning_sound: result.reasoningSound, codes: result.misconceptionCodes, read_back: result.readBack },
    }).slice(0, 2000);
    const made = await admin
      .from('flags')
      .insert({ pupil_id: pupilId, kind: 'borderline', segment_id: attempt.data.segment_id, attempt_id: input.attempt_id, note });
    if (made.error) throw new Error('could not create the borderline flag');
    return jsonReply(200, { ok: true, created: true }, 'borderline_created', started, pupilId);
  } catch (e) {
    console.error(JSON.stringify({ outcome: 'server_error', reason: e instanceof Error ? e.message : 'unknown' }));
    return jsonReply(500, { error: 'server' }, 'server_error', started);
  }
});
