/**
 * Every line a pupil reads on the account screens, in one file (runbook S12),
 * so wording can be replaced without code changes.
 *
 * The AI notice is the runbook S12 DRAFT. The final wording comes from the
 * data protection consultant (specs/prd.md section 10, BL-12). Keep it under
 * 80 words (FR-3); pupilCopy.test.ts checks.
 *
 * Calm, second person, short sentences. No exclamation marks, no em dashes
 * (CLAUDE.md rule 7).
 */
export const COPY = {
  notice: {
    title: 'Before you start',
    body:
      'ATLAS is a learning app. Some of your answers are checked by a computer program called AI. ' +
      'It looks at what you write to see how you are thinking. It does not see your name. ' +
      'A teacher can check its work. You can ask your teacher any time if something feels wrong.',
    button: 'I understand',
  },
  waiting: {
    body: 'You are all set. Your teacher will let you start soon.',
    button: 'Check again',
  },
  lock: {
    notYou: 'Not you?',
  },
  signIn: {
    welcome: 'Welcome to ATLAS',
    typeCode: 'Type the code your teacher gave you.',
    next: 'Next',
    choosePin: 'Choose a 4-digit PIN. Keep it secret.',
    again: 'Type it again.',
    noMatchTwice: 'Those did not match. Try again.',
    typePin: 'Type your PIN.',
    wrong: 'That code and PIN did not match. Try again.',
    rateLimited: 'Too many tries. Please wait a minute and try again.',
    failed: 'Something went wrong on our side. Try again.',
    changeCode: 'Change code',
    locked: (minutes: number) =>
      `Too many tries. Please wait ${minutes} ${minutes === 1 ? 'minute' : 'minutes'}, or ask your teacher.`,
  },
  offline: 'No connection. Check the data and try again.',
} as const;
