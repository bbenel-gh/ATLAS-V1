/**
 * Pupil codes (specs/prd.md FR-1; runbook S13).
 *
 * Pure TypeScript. The random source is passed in, so the scripts and the admin
 * dashboard use a secure source and tests can fix it.
 *
 * The alphabet has 32 characters and 256 is a multiple of 32, so taking each
 * random byte mod 32 gives every character the same chance: no bias.
 */
import { CODE_ALPHABET, CODE_LENGTH } from './auth.ts';

/** Returns n secure random bytes, for example crypto.getRandomValues(new Uint8Array(n)). */
export type RandomBytes = (n: number) => Uint8Array;

export function generatePupilCode(random: RandomBytes): string {
  const bytes = random(CODE_LENGTH);
  if (bytes.length !== CODE_LENGTH) {
    throw new Error(`The random source must return ${CODE_LENGTH} random bytes, got ${bytes.length}`);
  }
  let code = '';
  for (const b of bytes) code += CODE_ALPHABET[b % CODE_ALPHABET.length];
  return code;
}

/**
 * count new codes, all different from each other and from every code in taken.
 *
 * Random draws alone are not enough: 32^6 is about a billion codes, so 10,000
 * draws clash about 1 time in 20 (the birthday problem). A clash is simply
 * drawn again. The database's unique constraint stays the last guard.
 */
export function generateUniqueCodes(count: number, taken: ReadonlySet<string>, random: RandomBytes): string[] {
  if (!Number.isInteger(count) || count < 0) throw new Error('count must be a whole number, 0 or more');
  const out = new Set<string>();
  const maxDraws = count * 10 + 100;
  let draws = 0;
  while (out.size < count) {
    if (draws++ >= maxDraws) {
      throw new Error(`Could not find ${count} unused codes after ${maxDraws} draws. Is the random source broken?`);
    }
    const code = generatePupilCode(random);
    if (!taken.has(code)) out.add(code);
  }
  return [...out];
}
