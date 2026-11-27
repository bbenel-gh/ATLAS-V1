import { COPY } from './copy';

const strings = (value: unknown): string[] =>
  typeof value === 'string'
    ? [value]
    : typeof value === 'function'
      ? [String((value as (n: number) => string)(1)), String((value as (n: number) => string)(15))]
      : value && typeof value === 'object'
        ? Object.values(value).flatMap(strings)
        : [];

describe('pupil copy', () => {
  it('keeps the AI notice under 80 words (specs/prd.md FR-3)', () => {
    const words = COPY.notice.body.trim().split(/\s+/).length;
    expect(words).toBeLessThan(80);
  });

  it('says the AI does not see the name, and that a teacher can check its work', () => {
    expect(COPY.notice.body).toContain('It does not see your name.');
    expect(COPY.notice.body).toContain('A teacher can check its work.');
  });

  it('uses the runbook lines for the notice button, the waiting screen and "Not you?"', () => {
    expect(COPY.notice.button).toBe('I understand');
    expect(COPY.waiting.body).toBe('You are all set. Your teacher will let you start soon.');
    expect(COPY.waiting.button).toBe('Check again');
    expect(COPY.lock.notYou).toBe('Not you?');
  });

  it('says 1 minute and 15 minutes correctly in the lock message', () => {
    expect(COPY.signIn.locked(1)).toBe('Too many tries. Please wait 1 minute, or ask your teacher.');
    expect(COPY.signIn.locked(15)).toBe('Too many tries. Please wait 15 minutes, or ask your teacher.');
  });

  it('has no exclamation mark or em dash anywhere (CLAUDE.md rule 7)', () => {
    for (const s of strings(COPY)) {
      expect(s).not.toContain('!');
      expect(s).not.toContain('—');
    }
  });
});

describe('home copy (runbook S15)', () => {
  it('uses the runbook lines', () => {
    expect(COPY.home.greeting('Ama')).toBe('Hello, Ama.');
    expect(COPY.home.recommended).toBe('Recommended for you');
    expect(COPY.home.choose).toBe('Choose a topic');
    expect(COPY.home.parts(5)).toBe('5 parts');
    expect(COPY.home.nudgeTitle).toBe("I'd suggest this first, here's why.");
    expect(COPY.home.nudgeAnyway).toBe('Take me to the class topic anyway');
    expect(COPY.home.comingSoon).toBe('Coming soon');
  });

  it('greets calmly without a name', () => {
    expect(COPY.home.greeting('  ')).toBe('Hello.');
  });

  it('shows no percentage anywhere on Home', () => {
    for (const s of [COPY.home.progress(2, 5), COPY.home.parts(5), COPY.home.parts(1)]) {
      expect(s).not.toContain('%');
    }
  });
});

describe('board copy (specs/video-board.md)', () => {
  it('builds the breadcrumb like "Basic 7 Science · Materials" (P10)', () => {
    expect(COPY.board.breadcrumb('Basic 7', 'Integrated Science', 'Materials')).toBe('Basic 7 Science · Materials');
  });

  it('uses the spec words for the paused label and the sound pill (P4, P5)', () => {
    expect(COPY.board.tapToContinue).toBe('tap to continue');
    expect(COPY.board.tapForSound).toBe('Tap for sound');
    expect(COPY.board.watchAgain).toBe('Watch again');
  });

  it('uses the runbook download line and counts videos, never a percentage', () => {
    expect(COPY.topic.needsData('8')).toBe('This topic needs 8 MB of data. Download it now, on Wi-Fi if you can.');
    expect(COPY.topic.progress(2, 11)).toBe('2 of 11 videos');
  });

  it('never leaves the topic screen loading: calm lines for a failed load and a missing video', () => {
    expect(COPY.topic.loadFailed).toBe('This topic did not open. Try again.');
    expect(COPY.topic.needsDataUnknown).toBe('This topic needs some data. Download it now, on Wi-Fi if you can.');
    expect(COPY.topic.videoMissing).toBe('This video is not on your phone yet. Download the topic again.');
  });
});
