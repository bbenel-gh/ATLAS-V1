import AsyncStorage from '@react-native-async-storage/async-storage';

import type { PupilGate } from '@/domain/nextScreen';

/**
 * The last gate the server gave for this pupil, kept on the phone (S15, D-44).
 * Used only when the network fails, so a pupil who was let in before still
 * reaches Home in airplane mode after closing the app (CLAUDE.md rule 5).
 * Three yes or no values, no personal data. Keyed by the auth user id.
 */
const key = (userId: string) => `atlas.gate.${userId}`;

export async function readLocalGate(userId: string): Promise<PupilGate | null> {
  try {
    const text = await AsyncStorage.getItem(key(userId));
    if (!text) return null;
    const g = JSON.parse(text) as Partial<PupilGate>;
    return typeof g.aiNoticeSeen === 'boolean' && typeof g.hasConsent === 'boolean' && typeof g.onboardingDone === 'boolean'
      ? { aiNoticeSeen: g.aiNoticeSeen, hasConsent: g.hasConsent, onboardingDone: g.onboardingDone }
      : null;
  } catch {
    return null;
  }
}

export async function writeLocalGate(userId: string, gate: PupilGate | null): Promise<void> {
  try {
    if (gate) await AsyncStorage.setItem(key(userId), JSON.stringify(gate));
    else await AsyncStorage.removeItem(key(userId));
  } catch {
    // The phone copy is a convenience. Losing it only means the offline start shows "Try again".
  }
}
