import { interpretSigninReply, type SigninOutcome, type SigninSession } from '@/domain/auth';
import type { PupilGate } from '@/domain/nextScreen';

import { getEnv } from './env';
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

async function withTimeout<T>(run: (signal: AbortSignal) => PromiseLike<T>): Promise<T> {
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
  const pupil = await withTimeout((signal) => supabase.from('pupils').select('id, ai_notice_seen_at').abortSignal(signal).maybeSingle());
  if (pupil.error) throw new OfflineError(pupil.error.message);
  if (!pupil.data) return null;
  const id = pupil.data.id;
  const [consent, profile] = await Promise.all([
    withTimeout((signal) => supabase.from('consents').select('id').eq('pupil_id', id).is('withdrawn_at', null).limit(1).abortSignal(signal)),
    withTimeout((signal) => supabase.from('profiles').select('pupil_id').eq('pupil_id', id).limit(1).abortSignal(signal)),
  ]);
  if (consent.error || profile.error) throw new OfflineError('Could not read the pupil state');
  return {
    aiNoticeSeen: pupil.data.ai_notice_seen_at !== null,
    hasConsent: consent.data.length > 0,
    onboardingDone: profile.data.length > 0,
  };
}

/** Signs out on this phone only. Other phones stay signed in. */
export async function signOutHere(): Promise<void> {
  await supabase.auth.signOut({ scope: 'local' });
}
