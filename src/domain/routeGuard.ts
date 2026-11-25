/**
 * Which pupil screens may open (runbook S12; specs/prd.md FR-3, FR-4).
 * Pure, no React.
 *
 * A pupil may be on exactly one area: the one nextScreen picks. From any other
 * area they are sent there. So no lesson route opens without consent, deep
 * links included, because every lesson route sits behind this guard.
 */
import { nextScreen, ROUTES, type NextScreen, type PupilGate } from './nextScreen.ts';

export type GuardArea = 'notice' | 'waiting' | 'onboarding' | 'lessons';

const AREA_FOR: Record<NextScreen, GuardArea> = {
  notice: 'notice',
  waiting: 'waiting',
  onboarding: 'onboarding',
  home: 'lessons',
};

/** null: stay. Otherwise the route to go to instead. */
export function guardRoute(gate: PupilGate, area: GuardArea): (typeof ROUTES)[NextScreen] | null {
  const next = nextScreen(gate);
  return AREA_FOR[next] === area ? null : ROUTES[next];
}
