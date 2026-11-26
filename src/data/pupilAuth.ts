import { interpretSigninReply, type SigninOutcome, type SigninSession } from '@/domain/auth';
import type { PupilGate } from '@/domain/nextScreen';

import { getEnv } from './env';
import { readLocalOnboarding } from './onboardingStore';
import { supabase } from './supabase';

/**
 * The app side of pupil sign-in (runbook S11). Talks to the pupil-signin Edge
 * Function (S10) and reads what nextScreen needs.
 *
 * Network calls give up after 20 seconds (CLAUDE.md rule 5). No code or PIN is
 * ever logged or kept: the code lives only in the sign-in screen's state.
 */

const TIMEOUT_MS = 20_000;

export type SigninResult = SigninOutcome | { kind: 'offline' };

/** { code } alone asks whether to choose a PIN; add pin (and setPin) to sign in. */
export async function callPupilSignin(input: { code: string; pin?: string; setPin?: boolean }): Promise<SigninResult> {
  const { supabaseUrl, supabaseAnonKey } = getEnv();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  let response: Response;
  try {
    response = await fetch(`${supabaseUrl}/functions/v1/pupil-signin`, {
      method: 'POST',
      headers: { apikey: supabaseAnonKey, 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
      signal: controller.signal,
    });
  } catch {
    return { kind: 'offline' };
  } finally {
    clearTimeout(timer);
  }
  let body: unknown = null;
  try {
    body = await response.json();
  } catch {
    // interpretSigninReply turns a missing body into "failed".
  }
  return interpretSigninReply(response.status, body);
}

/** Saves the session in the Supabase client (AsyncStorage on the phone), so the pupil stays signed in. */
export async function startSession(session: SigninSession): Promise<void> {
  const { error } = await supabase.auth.setSession({
    access_token: session.access_token,
    refresh_token: session.refresh_token,
  });
  if (error) throw new Error('Could not save the session');
}

export class OfflineError extends Error {}

/**
 * The auth user id saved on this phone, read locally (no network). Pupil
 * lookups filter on it, because a staff test account can read many pupil rows.
 */
export async function signedInUserId(): Promise<string | null> {
  const { data } = await supabase.auth.getSession();
  return data.session?.user.id ?? null;
}

export async function withTimeout<T>(run: (signal: AbortSignal) => PromiseLike<T>): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    return await run(controller.signal);
  } catch {
    throw new OfflineError('No connection');
  } finally {
    clearTimeout(timer);
  }
}

/**
 * What nextScreen needs, read with the pupil's own session (RLS: own rows only).
 * null: the signed-in user is not a pupil (a staff test account, say).
 * Throws OfflineError when the network fails.
 */
export async function fetchPupilGate(): Promise<PupilGate | null> {
  const userId = await signedInUserId();
  if (!userId) return null;
  const pupil = await withTimeout((signal) =>
    supabase.from('pupils').select('id, ai_notice_seen_at').eq('user_id', userId).abortSignal(signal).maybeSingle(),
  );
  if (pupil.error) throw new OfflineError(pupil.error.message);
  if (!pupil.data) return null;
  const id = pupil.data.id;
  const [consent, profile] = await Promise.all([
    withTimeout((signal) => supabase.from('consents').select('id').eq('pupil_id', id).is('withdrawn_at', null).limit(1).abortSignal(signal)),
    withTimeout((signal) => supabase.from('profiles').select('onboarded_at').eq('pupil_id', id).limit(1).abortSignal(signal)),
  ]);
  if (consent.error || profile.error) throw new OfflineError('Could not read the pupil state');
  // Finished on the server, or finished on this phone and still on its way (S14, D-41).
  const local = await readLocalOnboarding(userId);
  const finishedHere = local !== null && local.pupilId === id && local.answers.finishedAt !== undefined;
  return {
    aiNoticeSeen: pupil.data.ai_notice_seen_at !== null,
    hasConsent: consent.data.length > 0,
    onboardingDone: (profile.data[0]?.onboarded_at ?? null) !== null || finishedHere,
  };
}

/** FR-3: records that this pupil saw the AI notice. Once per pupil, kept in the database. */
export async function markNoticeSeen(): Promise<void> {
  const userId = await signedInUserId();
  if (!userId) throw new OfflineError('Not signed in');
  const own = await withTimeout((signal) => supabase.from('pupils').select('id').eq('user_id', userId).abortSignal(signal).maybeSingle());
  if (own.error || !own.data) throw new OfflineError('Could not find the pupil');
  const id = own.data.id;
  const res = await withTimeout((signal) =>
    supabase.from('pupils').update({ ai_notice_seen_at: new Date().toISOString() }).eq('id', id).abortSignal(signal),
  );
  if (res.error) throw new OfflineError(res.error.message);
}

/**
 * The signed-in pupil's own code, for the PIN lock (RLS: a pupil reads their
 * own row). null when nobody, or a staff member, is signed in.
 */
export async function fetchOwnCode(): Promise<string | null> {
  const userId = await signedInUserId();
  if (!userId) return null;
  const own = await withTimeout((signal) => supabase.from('pupils').select('code').eq('user_id', userId).abortSignal(signal).maybeSingle());
  if (own.error) throw new OfflineError(own.error.message);
  return own.data?.code ?? null;
}

/** Signs out on this phone only. Other phones stay signed in. */
export async function signOutHere(): Promise<void> {
  await supabase.auth.signOut({ scope: 'local' });
}
