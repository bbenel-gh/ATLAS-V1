/**
 * S01 sanity check: proves Jest runs pure TypeScript in src/domain.
 * No React, React Native or Expo imports are allowed in this folder.
 */
export function clampTries(tries: number, max = 3): number {
  if (!Number.isFinite(tries) || tries < 0) return 0;
  return Math.min(Math.floor(tries), max);
}
