/**
 * The prerequisite rule for Home (specs/framework.md stage 2, specs/prd.md
 * FR-9, runbook S15 item 5). Pure TypeScript, no React.
 *
 * The result only decides whether the app shows the "I'd suggest this first"
 * nudge. It never blocks a topic: the nudge always has "Take me to the class
 * topic anyway".
 */

export type PrerequisiteCheck = { ok: true } | { ok: false; missing: string[] };

/** Mastery states a topic can be in (the mastery_status enum). */
export type MasteryState = 'achieved' | 'confirmed' | 'revision';

/**
 * Which of a topic's prerequisites the pupil has not done yet.
 *
 * @param doneTopics codes of the topics the pupil has done (see topicsDone)
 * @param prerequisites the topic's prerequisite codes, in the order the content gives them
 * @param selfCode the topic's own code; a topic is never its own prerequisite
 */
export function checkPrerequisites(
  doneTopics: readonly string[],
  prerequisites: readonly string[],
  selfCode?: string,
): PrerequisiteCheck {
  const done = new Set(doneTopics);
  const missing: string[] = [];
  for (const code of prerequisites) {
    if (code === selfCode || done.has(code) || missing.includes(code)) continue;
    missing.push(code);
  }
  return missing.length === 0 ? { ok: true } : { ok: false, missing };
}

/**
 * A topic counts as done once mastery is achieved (exam passed) or confirmed
 * (re-check passed). Revision, or no mastery row, is not done (D-44).
 */
export function isTopicDone(status: MasteryState | null): boolean {
  return status === 'achieved' || status === 'confirmed';
}

export function topicsDone(rows: readonly { topicCode: string; status: MasteryState | null }[]): string[] {
  return rows.filter((r) => isTopicDone(r.status)).map((r) => r.topicCode);
}
