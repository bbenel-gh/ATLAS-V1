/**
 * When the app asks for the PIN again on a shared phone (runbook S12).
 * Pure, no imports.
 *
 * - Back from the background after more than 5 minutes: ask again.
 * - A cold start (the phone was restarted, or the app was closed or killed):
 *   ask again whenever a pupil is signed in. On a 2 GB phone Android sometimes
 *   kills an app in the background; that also asks again, which is the safe side.
 */
export const LOCK_AFTER_MS = 5 * 60_000;

/** backgroundedAt and now are epoch milliseconds. A clock that went backwards locks. */
export function shouldLockOnReturn(backgroundedAt: number | null, now: number): boolean {
  if (backgroundedAt === null) return false;
  const away = now - backgroundedAt;
  return away < 0 || away > LOCK_AFTER_MS;
}

export function shouldLockOnStart(pupilSignedIn: boolean): boolean {
  return pupilSignedIn;
}
