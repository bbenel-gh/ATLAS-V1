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
  /** Home (runbook S15, specs/framework.md stage 2, FR-8, FR-9). */
  home: {
    greeting: (name: string) => {
      const n = String(name).trim();
      return n ? `Hello, ${n}.` : 'Hello.';
    },
    recommended: 'Recommended for you',
    recommendedEmpty: 'Nothing here right now. Choose a topic below.',
    choose: 'Choose a topic',
    comingSoon: 'Coming soon',
    parts: (n: number) => `${n} ${n === 1 ? 'part' : 'parts'}`,
    progress: (done: number, total: number) => `${done} of ${total} parts done`,
    setByTeacher: 'From your class',
    reteach: "Let's look at this part again.",
    reteachLabel: (code: string) => `Part ${code}`,
    recheck: (title: string) => `Three quick questions on ${title}.`,
    recheckLabel: 'Check in',
    nudgeTitle: "I'd suggest this first, here's why.",
    nudgeReason: (titles: string) => `This topic builds on ${titles}. Starting there can make this one easier.`,
    nudgeGo: (title: string) => `Go to ${title}`,
    nudgeAnyway: 'Take me to the class topic anyway',
    refreshing: 'Updating',
  },
  /** The board video (specs/video-board.md P4, P5, P9, P10). */
  board: {
    tapToContinue: 'tap to continue',
    tapToPause: 'Lesson video. Tap to pause.',
    tapForSound: 'Tap for sound',
    watchAgain: 'Watch again',
    breadcrumb: (level: string, subject: string, topic: string) =>
      [level, String(subject ?? '').replace(/^Integrated /, '')].filter(Boolean).join(' ') + ` · ${topic ?? ''}`,
  },
  /** Topic download (runbook S16 item 2). */
  topic: {
    needsData: (mb: string) => `This topic needs ${mb} MB of data. Download it now, on Wi-Fi if you can.`,
    checkingSize: 'Checking how much data this topic needs.',
    download: 'Download',
    continueDownload: 'Continue the download',
    cancel: 'Cancel',
    progress: (n: number, total: number) => `${n} of ${total} videos`,
    paused: 'The download is paused. Your finished videos are kept.',
    failed: 'The download stopped. Your finished videos are kept. Try again when you have a connection.',
    notFound: 'This topic is not ready yet.',
    overview: 'Overview',
    ready: 'This topic is on your phone. It works without data now.',
  },
  offline: 'No connection. Check the data and try again.',
} as const;
