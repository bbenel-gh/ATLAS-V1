import { nextScreen, ROUTES, type PupilGate } from './nextScreen';

const ready: PupilGate = { aiNoticeSeen: true, hasConsent: true, onboardingDone: true };

describe('nextScreen', () => {
  it('goes home when everything is done', () => {
    expect(nextScreen(ready)).toBe('home');
  });

  it('shows the AI notice first, before anything else', () => {
    expect(nextScreen({ aiNoticeSeen: false, hasConsent: false, onboardingDone: false })).toBe('notice');
    expect(nextScreen({ ...ready, aiNoticeSeen: false })).toBe('notice');
  });

  it('waits for consent once the notice is seen', () => {
    expect(nextScreen({ aiNoticeSeen: true, hasConsent: false, onboardingDone: false })).toBe('waiting');
    expect(nextScreen({ ...ready, hasConsent: false })).toBe('waiting');
  });

  it('never skips the consent wait, even if onboarding is somehow done', () => {
    expect(nextScreen({ aiNoticeSeen: true, hasConsent: false, onboardingDone: true })).toBe('waiting');
  });

  it('goes to onboarding with notice and consent done', () => {
    expect(nextScreen({ ...ready, onboardingDone: false })).toBe('onboarding');
  });

  it('covers all 8 combinations with exactly one screen each', () => {
    const seen: string[] = [];
    for (const aiNoticeSeen of [false, true])
      for (const hasConsent of [false, true])
        for (const onboardingDone of [false, true]) seen.push(nextScreen({ aiNoticeSeen, hasConsent, onboardingDone }));
    expect(seen).toEqual(['notice', 'notice', 'notice', 'notice', 'waiting', 'waiting', 'onboarding', 'home']);
  });

  it('has a route for every screen', () => {
    expect(ROUTES).toEqual({ notice: '/notice', waiting: '/waiting', onboarding: '/onboarding', home: '/home' });
  });
});
