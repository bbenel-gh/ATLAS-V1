/**
 * Where a signed-in pupil goes next (runbook S11; specs/prd.md FR-3, FR-4).
 *
 * Order: the AI notice first (FR-3), then the consent wait (FR-4: no lessons
 * without consent), then onboarding, then home. Pure, no imports.
 *
 * onboardingDone means the pupil has a profiles row. Onboarding (S14) creates
 * it only when the pupil finishes (D-37).
 */
export type PupilGate = {
  aiNoticeSeen: boolean;
  /** A consent row with no withdrawal date. */
  hasConsent: boolean;
  onboardingDone: boolean;
};

export type NextScreen = 'notice' | 'waiting' | 'onboarding' | 'home';

export const ROUTES = {
  notice: '/notice',
  waiting: '/waiting',
  onboarding: '/onboarding',
  home: '/home',
} as const satisfies Record<NextScreen, string>;

export function nextScreen(gate: PupilGate): NextScreen {
  if (!gate.aiNoticeSeen) return 'notice';
  if (!gate.hasConsent) return 'waiting';
  if (!gate.onboardingDone) return 'onboarding';
  return 'home';
}
