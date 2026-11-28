/**
 * S18 routing rule tests (specs/prd.md 8.2, FR-14, FR-20, FR-26a;
 * specs/framework.md stage 4 "Routing"; CLAUDE.md rule 4).
 * Written before src/domain/routing.ts.
 */
import {
  chooseFirstVersion,
  chooseNextVersion,
  chooseRelearnVersion,
  collectCodes,
  type RoutableVersion,
} from './routing';

const v = (label: string, misconceptionTags: string[] = [], interestTags: string[] = []): RoutableVersion => ({
  label,
  misconceptionTags,
  interestTags,
});

describe('collectCodes', () => {
  it('joins the codes from the answer and the reason', () => {
    expect(collectCodes(['1B-M1'], ['1B-M2'])).toEqual(['1B-M1', '1B-M2']);
  });

  it('drops duplicates within and across the answer and the reason, keeping first order', () => {
    expect(collectCodes(['1B-M2', '1B-M1', '1B-M2'], ['1B-M1', '1B-M3'])).toEqual(['1B-M2', '1B-M1', '1B-M3']);
  });

  it('gives an empty list when neither has a code', () => {
    expect(collectCodes([], [])).toEqual([]);
  });

  it('ignores empty strings', () => {
    expect(collectCodes(['', '1B-M1'], [''])).toEqual(['1B-M1']);
  });
});

describe('chooseFirstVersion', () => {
  it('picks the version whose interest tags overlap the pupil interests most', () => {
    const versions = [v('a', [], ['football']), v('b', [], ['farming', 'market']), v('c', [], ['market'])];
    expect(chooseFirstVersion(versions, ['farming', 'market'])).toBe('b');
  });

  it('goes to version a on a tie', () => {
    const versions = [v('a', [], ['football']), v('b', [], ['farming'])];
    expect(chooseFirstVersion(versions, ['football', 'farming'])).toBe('a');
  });

  it('goes to version a when the pupil has no interests', () => {
    expect(chooseFirstVersion([v('a', [], ['music']), v('b', [], ['football'])], [])).toBe('a');
  });

  it('goes to the earliest label when tied versions do not include a', () => {
    const versions = [v('a'), v('c', [], ['music']), v('b', [], ['music'])];
    expect(chooseFirstVersion(versions, ['music'])).toBe('b');
  });

  it('does not depend on the order of the version list', () => {
    const versions = [v('b', [], ['farming']), v('a', [], ['farming'])];
    expect(chooseFirstVersion(versions, ['farming'])).toBe('a');
  });

  it('counts a repeated pupil interest once', () => {
    const versions = [v('a', [], ['music', 'football']), v('b', [], ['farming'])];
    expect(chooseFirstVersion(versions, ['farming', 'farming', 'farming'])).toBe('b');
  });

  it('throws when the segment has no versions', () => {
    expect(() => chooseFirstVersion([], ['music'])).toThrow(RangeError);
  });
});

describe('chooseNextVersion', () => {
  const versions = [
    v('a', ['1B-M1'], ['football']),
    v('b', ['1B-M1', '1B-M2'], ['farming']),
    v('c', ['1B-M2'], ['market']),
    v('d', ['1B-M3'], ['market', 'farming']),
  ];

  it('picks the unseen version whose misconception tags match the most codes', () => {
    expect(chooseNextVersion(versions, ['a'], ['1B-M1', '1B-M2'], [])).toEqual({ kind: 'version', label: 'b' });
  });

  it('never picks a seen version, even the best match', () => {
    expect(chooseNextVersion(versions, ['a', 'b'], ['1B-M1', '1B-M2'], [])).toEqual({ kind: 'version', label: 'c' });
  });

  it('breaks a code tie by the most interest overlap', () => {
    // c matches 1B-M2 and d matches 1B-M3: one code each, so interests decide.
    expect(chooseNextVersion(versions, ['a', 'b'], ['1B-M2', '1B-M3'], ['farming'])).toEqual({
      kind: 'version',
      label: 'd',
    });
  });

  it('breaks a code and interest tie by alphabetical label', () => {
    const tied = [v('a'), v('d', ['1B-M1'], ['music']), v('c', ['1B-M1'], ['music'])];
    expect(chooseNextVersion(tied, ['a'], ['1B-M1'], ['music'])).toEqual({ kind: 'version', label: 'c' });
  });

  it('falls back to interests when the pupil gave no codes', () => {
    expect(chooseNextVersion(versions, ['a'], [], ['market'])).toEqual({ kind: 'version', label: 'c' });
  });

  it('counts a repeated code once', () => {
    const vs = [v('a'), v('b', ['1B-M1']), v('c', ['1B-M2'], ['music'])];
    expect(chooseNextVersion(vs, ['a'], ['1B-M1', '1B-M1', '1B-M2'], ['music'])).toEqual({
      kind: 'version',
      label: 'c',
    });
  });

  it('returns the worked example when every version has been seen', () => {
    expect(chooseNextVersion(versions, ['a', 'b', 'c', 'd'], ['1B-M1'], ['farming'])).toEqual({
      kind: 'workedExample',
    });
  });

  it('returns the worked example for a segment with no versions', () => {
    expect(chooseNextVersion([], [], ['1B-M1'], [])).toEqual({ kind: 'workedExample' });
  });

  it('ignores seen labels that are not in the version list', () => {
    expect(chooseNextVersion([v('a'), v('b')], ['a', 'z'], [], [])).toEqual({ kind: 'version', label: 'b' });
  });
});

describe('chooseRelearnVersion', () => {
  const versions = [
    v('a', ['1C-M1'], ['football']),
    v('b', ['1C-M2'], ['farming']),
    v('c', ['1C-M2'], ['market']),
  ];

  it('picks an unseen version first, by the same rule as a retry', () => {
    expect(chooseRelearnVersion(versions, ['a'], ['1C-M2'], ['market'], { a: 100 })).toBe('c');
  });

  it('picks an unseen version over a better-matching seen one', () => {
    expect(chooseRelearnVersion(versions, ['b', 'c'], ['1C-M2'], ['market'], { b: 100, c: 200 })).toBe('a');
  });

  it('with every version seen, picks the best match by codes', () => {
    expect(chooseRelearnVersion(versions, ['a', 'b', 'c'], ['1C-M1'], ['market'], { a: 300, b: 100, c: 200 })).toBe(
      'a',
    );
  });

  it('with every version seen and codes tied, picks the most interest overlap', () => {
    expect(
      chooseRelearnVersion(versions, ['a', 'b', 'c'], ['1C-M2'], ['market'], { a: 100, b: 100, c: 300 }),
    ).toBe('c');
  });

  it('with every version seen and codes and interests tied, picks the one seen longest ago', () => {
    expect(chooseRelearnVersion(versions, ['a', 'b', 'c'], ['1C-M2'], [], { a: 100, b: 300, c: 200 })).toBe('c');
  });

  it('treats a seen version with no time as seen longest ago', () => {
    expect(chooseRelearnVersion(versions, ['a', 'b', 'c'], ['1C-M2'], [], { a: 100, b: 300 })).toBe('c');
  });

  it('breaks a full tie, including the time, by alphabetical label', () => {
    expect(chooseRelearnVersion(versions, ['a', 'b', 'c'], ['1C-M2'], [], { b: 100, c: 100 })).toBe('b');
  });

  it('throws when the segment has no versions', () => {
    expect(() => chooseRelearnVersion([], [], [], [], {})).toThrow(RangeError);
  });
});
