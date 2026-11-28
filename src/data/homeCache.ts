import AsyncStorage from '@react-native-async-storage/async-storage';

import type { HomeInput } from '@/domain/home';

/**
 * The phone copy of what Home shows (runbook S15 item 8, D-44). Home draws
 * this first and refreshes in the background, so it still shows offline.
 * Keyed by the auth user id, so a shared phone never shows one pupil's Home
 * to another. Holds the display name, which is fine: it stays on the phone
 * (CLAUDE.md rule 2 is about the AI).
 */
export type HomeSnapshot = { pupilId: string; input: HomeInput; savedAt: number };

const key = (userId: string) => `atlas.home.${userId}`;

export async function readHomeCache(userId: string): Promise<HomeSnapshot | null> {
  try {
    const text = await AsyncStorage.getItem(key(userId));
    if (!text) return null;
    const parsed = JSON.parse(text) as HomeSnapshot;
    return typeof parsed.pupilId === 'string' && Array.isArray(parsed.input?.topics) ? parsed : null;
  } catch {
    return null;
  }
}

export async function writeHomeCache(userId: string, snapshot: HomeSnapshot): Promise<void> {
  try {
    await AsyncStorage.setItem(key(userId), JSON.stringify(snapshot));
  } catch {
    // Only the offline copy is lost. Home still shows what it just loaded.
  }
}
