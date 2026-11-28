import { COPY } from './copy';

/** The overview copy is the runbook's, word for word (S17 items 2 and 3, FR-11, FR-12). */
describe('overview copy', () => {
  it('asks the two runbook questions', () => {
    expect(COPY.overview.tellFriend).toBe('Tell a friend what this video was about, in one or two sentences.');
    expect(COPY.overview.confusing).toBe('Which part felt confusing?');
  });
  it('thanks the pupil with the FR-12 message and nothing that looks like a mark', () => {
    expect(COPY.overview.thanks).toBe('Thanks. That helps me choose how to teach this.');
    for (const text of Object.values(COPY.overview)) {
      expect(text).not.toMatch(/\d|score|mark|correct|wrong|right|well done|great/i);
    }
  });
  it('offers Send and a quiet Skip', () => {
    expect(COPY.overview.send).toBe('Send');
    expect(COPY.overview.skip).toBe('Skip');
  });
});
