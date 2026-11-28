/**
 * Which video version a pupil sees (specs/prd.md 8.2, FR-14, FR-20, FR-26a;
 * specs/framework.md stage 4 "Routing"). CLAUDE.md rule 4: this is a rule,
 * never an AI call. Pure TypeScript, no React.
 *
 * Interest tags on versions and on the profile are the same INTEREST_TAGS
 * enum (src/data/contentSchema.ts), so they are compared exactly.
 */

/** The parts of a content version the rule needs. A content version passes straight in. */
export type RoutableVersion = {
  label: string;
  misconceptionTags: readonly string[];
  interestTags: readonly string[];
};

export type NextVersion = { kind: 'version'; label: string } | { kind: 'workedExample' };

/** Codes from the answer and from the reason, in first-seen order, without duplicates or empty strings. */
export function collectCodes(answerCodes: readonly string[], reasonCodes: readonly string[]): string[] {
  const out: string[] = [];
  for (const code of [...answerCodes, ...reasonCodes]) {
    if (code !== '' && !out.includes(code)) out.push(code);
  }
  return out;
}

type Scored = { version: RoutableVersion; codes: number; interests: number };

function scoreAll(
  versions: readonly RoutableVersion[],
  codes: readonly string[],
  interests: readonly string[],
): Scored[] {
  const codeSet = new Set(codes);
  const interestSet = new Set(interests);
  const count = (tags: readonly string[], set: Set<string>) => new Set(tags.filter((t) => set.has(t))).size;
  return versions.map((version) => ({
    version,
    codes: count(version.misconceptionTags, codeSet),
    interests: count(version.interestTags, interestSet),
  }));
}

/** Most codes, then most interests. 0 when tied on both. */
function byMatch(x: Scored, y: Scored): number {
  return y.codes - x.codes || y.interests - x.interests;
}

/** Labels in a segment are unique (contentSchema: a, b, c in order), so this never ties. */
function byLabel(x: Scored, y: Scored): number {
  return x.version.label < y.version.label ? -1 : 1;
}

/** The label that comes first under the order. Callers pass a list that is never empty. */
function pickBest(scored: Scored[], order: (x: Scored, y: Scored) => number): string {
  return scored.reduce((best, s) => (order(s, best) < 0 ? s : best)).version.label;
}

/**
 * The first version of a segment: the most interest overlap. Tie: version a
 * (the earliest label among the tied versions).
 */
export function chooseFirstVersion(versions: readonly RoutableVersion[], pupilInterests: readonly string[]): string {
  if (versions.length === 0) throw new RangeError('A segment needs at least one video version.');
  return pickBest(scoreAll(versions, [], pupilInterests), (x, y) => byMatch(x, y) || byLabel(x, y));
}

/**
 * The version before try 2 or try 3: among unseen versions, the one whose
 * misconception tags match the most codes. Tie: most interest overlap. Still
 * tied: alphabetical label. No unseen version: the worked-example card.
 */
export function chooseNextVersion(
  versions: readonly RoutableVersion[],
  seenLabels: readonly string[],
  misconceptionCodes: readonly string[],
  pupilInterests: readonly string[],
): NextVersion {
  const seen = new Set(seenLabels);
  const unseen = versions.filter((v) => !seen.has(v.label));
  if (unseen.length === 0) return { kind: 'workedExample' };
  const label = pickBest(
    scoreAll(unseen, misconceptionCodes, pupilInterests),
    (x, y) => byMatch(x, y) || byLabel(x, y),
  );
  return { kind: 'version', label };
}

/**
 * The first version of a Relearn round (D-48, prd 8.2 item 5). An unseen
 * version (in any round) by the same rule as a retry; with every version
 * seen, the best match again, ties to the one seen longest ago, then label.
 *
 * @param lastSeenAt when each version was last shown, in epoch ms. A seen
 *   version with no time counts as seen longest ago.
 */
export function chooseRelearnVersion(
  versions: readonly RoutableVersion[],
  seenInAnyRound: readonly string[],
  latestCodes: readonly string[],
  pupilInterests: readonly string[],
  lastSeenAt: Readonly<Record<string, number>>,
): string {
  if (versions.length === 0) throw new RangeError('A segment needs at least one video version.');
  const next = chooseNextVersion(versions, seenInAnyRound, latestCodes, pupilInterests);
  if (next.kind === 'version') return next.label;
  const at = (s: Scored) => lastSeenAt[s.version.label] ?? Number.NEGATIVE_INFINITY;
  // Two missing times give NaN, which is falsy, so the label decides.
  const byOldest = (x: Scored, y: Scored) => at(x) - at(y);
  return pickBest(
    scoreAll(versions, latestCodes, pupilInterests),
    (x, y) => byMatch(x, y) || byOldest(x, y) || byLabel(x, y),
  );
}
