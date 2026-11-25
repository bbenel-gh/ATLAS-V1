import { webcrypto } from 'node:crypto';

import { CODE_ALPHABET, CODE_LENGTH, isValidCode } from './auth';
import { generatePupilCode, generateUniqueCodes, type RandomBytes } from './pupilCode';

/** The real secure source, as the script uses it. */
const realRandom: RandomBytes = (n) => webcrypto.getRandomValues(new Uint8Array(n));

/** A fixed source for repeatable tests: hands out the given bytes in order, then repeats them. */
const fixedRandom = (bytes: number[]): RandomBytes => {
  let i = 0;
  return (n) => Uint8Array.from({ length: n }, () => bytes[i++ % bytes.length] ?? 0);
};

describe('pupil code alphabet', () => {
  it('is the 32 characters with no 0, O, 1 or I', () => {
    expect(CODE_ALPHABET).toBe('ABCDEFGHJKLMNPQRSTUVWXYZ23456789');
    expect(CODE_ALPHABET).toHaveLength(32);
    for (const c of ['0', 'O', '1', 'I']) expect(CODE_ALPHABET).not.toContain(c);
  });
});

describe('generatePupilCode', () => {
  it('is 6 characters long', () => {
    expect(generatePupilCode(realRandom)).toHaveLength(CODE_LENGTH);
  });

  it('uses only the alphabet, and passes the sign-in format check', () => {
    for (let i = 0; i < 2_000; i++) {
      const code = generatePupilCode(realRandom);
      expect(code).toMatch(/^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{6}$/);
      expect(isValidCode(code)).toBe(true);
    }
  });

  it('maps each random byte to one letter with no bias (byte mod 32)', () => {
    expect(generatePupilCode(fixedRandom([0, 1, 2, 3, 4, 5]))).toBe('ABCDEF');
    // 31 is the last letter; 32 and 255 wrap round evenly because 256 is a multiple of 32.
    expect(generatePupilCode(fixedRandom([31, 32, 63, 255, 224, 8]))).toBe('9A99AJ');
  });

  it('is repeatable with a fixed source, so tests can pin it', () => {
    const bytes = [7, 19, 200, 45, 3, 99];
    expect(generatePupilCode(fixedRandom(bytes))).toBe(generatePupilCode(fixedRandom(bytes)));
  });

  it('refuses a source that returns the wrong number of bytes', () => {
    expect(() => generatePupilCode(() => new Uint8Array(3))).toThrow(/6 random bytes/);
  });
});

describe('generateUniqueCodes', () => {
  it('gives 10,000 codes with no collisions, from the real random source', () => {
    const codes = generateUniqueCodes(10_000, new Set(), realRandom);
    expect(codes).toHaveLength(10_000);
    expect(new Set(codes).size).toBe(10_000);
    for (const code of codes) expect(isValidCode(code)).toBe(true);
  });

  it('never returns a code that is already taken', () => {
    // The source first offers AAAAAA (taken), then BBBBBB.
    const source = fixedRandom([0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1]);
    expect(generateUniqueCodes(1, new Set(['AAAAAA']), source)).toEqual(['BBBBBB']);
  });

  it('draws again when two new codes clash', () => {
    const source = fixedRandom([2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 3, 3, 3, 3, 3, 3]);
    expect(generateUniqueCodes(2, new Set(), source)).toEqual(['CCCCCC', 'DDDDDD']);
  });

  it('gives up with a clear error instead of looping for ever on a broken source', () => {
    expect(() => generateUniqueCodes(2, new Set(), fixedRandom([5]))).toThrow(/could not find/i);
  });

  it('returns nothing for 0 and refuses a negative or fractional count', () => {
    expect(generateUniqueCodes(0, new Set(), realRandom)).toEqual([]);
    expect(() => generateUniqueCodes(-1, new Set(), realRandom)).toThrow();
    expect(() => generateUniqueCodes(1.5, new Set(), realRandom)).toThrow();
  });
});
