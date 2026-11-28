import AsyncStorage from '@react-native-async-storage/async-storage';

import type { OnboardingAnswers } from '@/domain/onboarding';

/**
 * The phone copy of a pupil's onboarding answers (runbook S14, D-41). Written
 * before anything goes to the network, so an answer is never lost if the app
 * closes or the connection drops. Keyed by the auth user id, which the phone
 * knows even offline. Removed once onboarding is finished and synced, so a
 * shared phone does not keep another pupil's answers.
 */
export type LocalOnboarding = {
  pupilId: string;
  answers: OnboardingAnswers;
  /** true until the server has this exact copy. */
  pending: boolean;
};

const key = (userId: string) => `atlas.onboarding.${userId}`;

export async function readLocalOnboarding(userId: string): Promise<LocalOnboarding | null> {
  try {
    const text = await AsyncStorage.getItem(key(userId));
    if (!text) return null;
    const parsed = JSON.parse(text) as LocalOnboarding;
    return typeof parsed.pupilId === 'string' && typeof parsed.answers === 'object' ? parsed : null;
  } catch {
    return null;
  }
}

export async function writeLocalOnboarding(userId: string, value: LocalOnboarding): Promise<void> {
  await AsyncStorage.setItem(key(userId), JSON.stringify(value));
}

export async function removeLocalOnboarding(userId: string): Promise<void> {
  await AsyncStorage.removeItem(key(userId));
}
