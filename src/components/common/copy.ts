/**
 * Every line a pupil reads on the account screens, in one file (runbook S12),
 * so wording can be replaced without code changes.
 *
 * The AI notice is the approved text in specs/B2-ai-notice.md (D-43); the
 * data protection consultant still confirms it (specs/prd.md section 10).
 * Keep it under 80 words (FR-3); pupilCopy.test.ts checks.
 *
 * Calm, second person, short sentences. No exclamation marks, no em dashes
 * (CLAUDE.md rule 7).
 */
export const COPY = {
  notice: {
    title: 'Before you start',
    body:
      'ATLAS is a learning app. A computer program called AI reads some of your answers. ' +
      'It looks at what you write to see how you are thinking. It does not see your name. ' +
      'If you send a photo of your writing, the photo is deleted once your words are saved. ' +
      'The AI can make mistakes. A teacher can check its work. If something feels wrong, tell your teacher.',
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
  /**
   * Onboarding (runbook S14). The three "would you rather" questions and
   * their option labels are approved in specs/B3-playful.md (D-42).
   */
  onboarding: {
    progress: (step: number) => `Step ${step + 1} of 4`,
    next: 'Next',
    nameQuestion: 'What should I call you?',
    nameLabel: 'Your name',
    classQuestion: 'Which class are you in?',
    interestsQuestion: 'What do you enjoy? Pick up to 4.',
    tooMany: 'You can pick up to 4.',
    interestLabels: {
      football: 'Football',
      music: 'Music',
      farming: 'Farming',
      stories: 'Stories',
      cooking: 'Cooking',
      market: 'Market',
      animals: 'Animals',
      'phones and computers': 'Phones and computers',
    },
    choices: {
      radio: {
        question: 'Would you rather fix a broken radio, or find out why it broke?',
        options: { fix: 'Fix the radio', why: 'Find out why it broke' },
      },
      farm: {
        question: 'Would you rather plant a new farm, or sell at the market?',
        options: { plant: 'Plant a new farm', sell: 'Sell at the market' },
      },
      song: {
        question: 'Would you rather learn a new song, or write a new story?',
        options: { song: 'Learn a new song', story: 'Write a new story' },
      },
    },
    thanks: (name: string) => `Thank you, ${name}. Let's start.`,
    go: 'Go to my lessons',
  },
  offline: 'No connection. Check the data and try again.',
} as const;
