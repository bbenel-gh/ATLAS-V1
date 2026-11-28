/**
 * The signed-in pupil behind a request, for save-attempt and raise-flag (S20).
 * verify_jwt is off for these functions; the token is checked here (D-36).
 */
import type { SupabaseClient } from '@supabase/supabase-js';

export type PupilCheck = { ok: true; pupilId: string } | { ok: false; status: 401 | 403; outcome: string };

export async function checkPupil(admin: SupabaseClient, req: Request, claimedPupilId: string | null): Promise<PupilCheck> {
  const token = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '');
  const user = token ? await admin.auth.getUser(token) : null;
  if (!user || user.error || !user.data.user) return { ok: false, status: 401, outcome: 'no_session' };
  const pupil = await admin.from('pupils').select('id, status').eq('user_id', user.data.user.id).maybeSingle();
  if (pupil.error) throw new Error('pupil lookup failed');
  if (!pupil.data || pupil.data.status !== 'active' || (claimedPupilId !== null && pupil.data.id !== claimedPupilId)) {
    return { ok: false, status: 403, outcome: 'not_this_pupil' };
  }
  const consent = await admin.from('consents').select('id').eq('pupil_id', pupil.data.id).is('withdrawn_at', null).limit(1);
  if (consent.error) throw new Error('consent lookup failed');
  if (consent.data.length === 0) return { ok: false, status: 403, outcome: 'no_consent' };
  return { ok: true, pupilId: pupil.data.id as string };
}

export const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

/** Logs only the outcome, the pupil id and the time: never the pupil's words. */
export function jsonReply(status: number, body: unknown, outcome: string, started: number, pupilId?: string): Response {
  console.log(JSON.stringify({ outcome, pupil_id: pupilId ?? null, ms: Date.now() - started }));
  return new Response(JSON.stringify(body), { status, headers: { ...CORS, 'Content-Type': 'application/json' } });
}

export function keyFromEnv(single: string, map: string): string {
  const direct = Deno.env.get(single);
  if (direct) return direct;
  try {
    const keys = JSON.parse(Deno.env.get(map) ?? '{}') as Record<string, string>;
    return keys.default ?? Object.values(keys)[0] ?? '';
  } catch {
    return '';
  }
}
