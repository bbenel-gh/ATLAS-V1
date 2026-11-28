import type { PupilGate } from './nextScreen';
import { guardRoute, type GuardArea } from './routeGuard';

const gate = (aiNoticeSeen: boolean, hasConsent: boolean, onboardingDone: boolean): PupilGate => ({
  aiNoticeSeen,
  hasConsent,
  onboardingDone,
});

const AREAS: GuardArea[] = ['notice', 'waiting', 'onboarding', 'lessons'];

describe('guardRoute', () => {
  it('lets a fully ready pupil into lessons', () => {
    expect(guardRoute(gate(true, true, true), 'lessons')).toBeNull();
  });

  it.each([
    ['notice not seen', gate(false, true, true), '/notice'],
    ['no consent', gate(true, false, true), '/waiting'],
    ['consent and notice, onboarding not done', gate(true, true, false), '/onboarding'],
  ])('keeps a pupil with %s out of every lesson route', (_, g, to) => {
    expect(guardRoute(g, 'lessons')).toBe(to);
  });

  it('never lets a pupil without consent reach lessons or onboarding, whatever else is true', () => {
    for (const onboardingDone of [false, true]) {
      const g = gate(true, false, onboardingDone);
      expect(guardRoute(g, 'lessons')).toBe('/waiting');
      expect(guardRoute(g, 'onboarding')).toBe('/waiting');
      expect(guardRoute(g, 'waiting')).toBeNull();
    }
  });

  it('keeps the pupil on the one screen nextScreen picks, and moves them from any other', () => {
    for (const a of [false, true])
      for (const c of [false, true])
        for (const o of [false, true]) {
          const g = gate(a, c, o);
          const allowed = AREAS.filter((area) => guardRoute(g, area) === null);
          expect(allowed).toHaveLength(1);
        }
  });

  it('sends a pupil who already saw the notice away from it', () => {
    expect(guardRoute(gate(true, true, true), 'notice')).toBe('/home');
    expect(guardRoute(gate(true, false, false), 'notice')).toBe('/waiting');
  });

  it('sends a pupil with consent away from the waiting screen', () => {
    expect(guardRoute(gate(true, true, false), 'waiting')).toBe('/onboarding');
    expect(guardRoute(gate(true, true, true), 'waiting')).toBe('/home');
  });

  it('sends a pupil who finished onboarding home', () => {
    expect(guardRoute(gate(true, true, true), 'onboarding')).toBe('/home');
  });
});
