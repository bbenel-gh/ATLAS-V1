import { AppState } from 'react-native';

import {
  emptyAnswers,
  filterNameInput,
  fromProfileRow,
  newerAnswers,
  toProfileRow,
  type OnboardingAnswers,
} from '@/domain/onboarding';

import type { Json } from './database.types';
import { readLocalOnboarding, removeLocalOnboarding, writeLocalOnboarding } from './onboardingStore';
import { OfflineError, signedInUserId, withTimeout } from './pupilAuth';
import { supabase } from './supabase';

/**
 * Onboarding answers: phone copy first, then the server (runbook S14, D-41).
 *
 * Every answer updates one cumulative snapshot. The snapshot is written to
 * the phone, then sent: display_name and class_level on pupils, the rest on
 * profiles. Sending the same snapshot twice changes nothing, so a retry is
 * always safe. This is the simple queue the runbook asks for; S39 hardens it.
 */

export type OnboardingStart = {
  userId: string;
  pupilId: string;
  /** The name on record, made safe for the name field (the admin may have typed more). */
  prefillName: string;
  answers: OnboardingAnswers;
};

/** Where the pupil is: the newer of the phone copy and the server copy. */
export async function loadOnboarding(): Promise<OnboardingStart> {
  const userId = await signedInUserId();
  if (!userId) throw new OfflineError('Not signed in');
  const local = await readLocalOnboarding(userId);
  try {
    const pupil = await withTimeout((signal) =>
      supabase.from('pupils').select('id, display_name, class_level').eq('user_id', userId).abortSignal(signal).maybeSingle(),
    );
    if (pupil.error || !pupil.data) throw new OfflineError('Could not find the pupil');
    const p = pupil.data;
    const profile = await withTimeout((signal) =>
      supabase
        .from('profiles')
        .select('interests, playful_choices, onboarding, onboarded_at')
        .eq('pupil_id', p.id)
        .abortSignal(signal)
        .maybeSingle(),
    );
    if (profile.error) throw new OfflineError(profile.error.message);
    const server = profile.data ? fromProfileRow(profile.data, { displayName: p.display_name, classLevel: p.class_level }) : null;
    const mine = local && local.pupilId === p.id ? local.answers : null;
    return {
      userId,
      pupilId: p.id,
      prefillName: filterNameInput(p.display_name).trim(),
      answers: newerAnswers(mine, server) ?? emptyAnswers(Date.now()),
    };
  } catch (e) {
    // Offline: carry on from the phone copy if there is one.
    if (local) {
      return { userId, pupilId: local.pupilId, prefillName: local.answers.name?.value ?? '', answers: local.answers };
    }
    throw e;
  }
}

/** Keep the answers on the phone, then try to send them. Resolves once they are safe on the phone. */
export async function saveOnboarding(start: Pick<OnboardingStart, 'userId' | 'pupilId'>, answers: OnboardingAnswers): Promise<void> {
  await writeLocalOnboarding(start.userId, { pupilId: start.pupilId, answers, pending: true });
  void syncOnboarding();
}

let inFlight: Promise<boolean> | null = null;

/** Sends the phone copy if one is waiting. true when nothing is left to send. */
export function syncOnboarding(): Promise<boolean> {
  inFlight ??= sendPending().finally(() => {
    inFlight = null;
  });
  return inFlight;
}

async function sendPending(): Promise<boolean> {
  const userId = await signedInUserId();
  if (!userId) return true;
  const local = await readLocalOnboarding(userId);
  if (!local?.pending) return true;
  const { pupilId, answers } = local;
  try {
    const pupilChange: { display_name?: string; class_level?: string } = {};
    if (answers.name) pupilChange.display_name = answers.name.value;
    if (answers.classLevel) pupilChange.class_level = answers.classLevel.value;
    if (Object.keys(pupilChange).length > 0) {
      const res = await withTimeout((signal) => supabase.from('pupils').update(pupilChange).eq('id', pupilId).abortSignal(signal));
      if (res.error) return false;
    }
    const row = toProfileRow(answers);
    const res = await withTimeout((signal) =>
      supabase
        .from('profiles')
        .upsert(
          {
            pupil_id: pupilId,
            interests: row.interests,
            playful_choices: row.playful_choices as Json,
            onboarding: row.onboarding as Json,
            onboarded_at: row.onboarded_at,
          },
          { onConflict: 'pupil_id' },
        )
        .abortSignal(signal),
    );
    if (res.error) return false;
  } catch {
    return false;
  }
  // Mark sent only if no newer answer arrived while this one was on its way.
  const now = await readLocalOnboarding(userId);
  if (now && now.answers.updatedAt === answers.updatedAt) {
    if (answers.finishedAt) await removeLocalOnboarding(userId);
    else await writeLocalOnboarding(userId, { ...now, pending: false });
  }
  return true;
}

const RETRY_MS = 15_000;
let started = false;

/** Once per app run: retry every 15 seconds and whenever the app comes back. */
export function startOnboardingSync(): void {
  if (started) return;
  started = true;
  setInterval(() => void syncOnboarding(), RETRY_MS);
  AppState.addEventListener('change', (state) => {
    if (state === 'active') void syncOnboarding();
  });
  void syncOnboarding();
}
