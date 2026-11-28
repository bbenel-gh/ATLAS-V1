import { CHOICE_IDS, CHOICE_OPTIONS, INTERESTS } from '@/domain/onboarding';

import { COPY } from './copy';

const O = COPY.onboarding;

describe('onboarding copy (runbook S14)', () => {
  it('uses the runbook questions and lines', () => {
    expect(O.nameQuestion).toBe('What should I call you?');
    expect(O.classQuestion).toBe('Which class are you in?');
    expect(O.interestsQuestion).toBe('What do you enjoy? Pick up to 4.');
    expect(O.tooMany).toBe('You can pick up to 4.');
    expect(O.thanks('Ama')).toBe("Thank you, Ama. Let's start.");
    expect(O.go).toBe('Go to my lessons');
  });

  it('has a label for every interest', () => {
    for (const tag of INTERESTS) expect(O.interestLabels[tag]).toBeTruthy();
  });

  it('has a question and both option labels for every playful choice', () => {
    for (const id of CHOICE_IDS) {
      const c = O.choices[id];
      expect(c.question.startsWith('Would you rather')).toBe(true);
      const options = c.options as Record<string, string>;
      for (const option of CHOICE_OPTIONS[id]) expect(options[option]).toBeTruthy();
      expect(Object.keys(options)).toHaveLength(2);
    }
  });

  it('never marks anything right or wrong, and shows no score', () => {
    const all = JSON.stringify(O) + O.thanks('x') + O.progress(0);
    expect(all).not.toMatch(/\b(right|wrong|correct|score|points|well done)\b/i);
  });
});
