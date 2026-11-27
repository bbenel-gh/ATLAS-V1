import { readFileSync } from 'fs';
import { join } from 'path';

import {
  AI_TIMEOUT_MS,
  buildOverviewUserMessage,
  capCheck,
  interpretOverviewReply,
  isSkipped,
  MAX_SEND_ATTEMPTS,
  mergeProfile,
  OVERVIEW_MODEL,
  OVERVIEW_SYSTEM_PROMPT,
  OVERVIEW_TEXT_MAX,
  overviewInputSchema,
  parseOverviewOutput,
  PROFILE_CAPS,
  PUPIL_DAILY_AI_CAP,
  queueNext,
  startOfUtcDay,
  titlesToCodes,
} from './overview';

const PUPIL = '6f1c2b0a-4d3e-4a5b-9c8d-7e6f5a4b3c2d';
const RESPONSE = '0a1b2c3d-4e5f-4a6b-8c7d-9e0f1a2b3c4d';

const valid = {
  pupil_id: PUPIL,
  topic_code: 'MAT',
  response_id: RESPONSE,
  summary_text: 'It was about materials like wood and plastic.',
  confusing_text: 'The part about metals.',
};

const SEGMENTS = [
  { code: 'OV', title: 'Overview' },
  { code: '1A', title: 'What is a material?' },
  { code: '1B', title: 'Properties of materials' },
];

describe('fixed values', () => {
  it('uses the overview model from CLAUDE.md', () => {
    expect(OVERVIEW_MODEL).toBe('claude-haiku-5-5');
  });
  it('gives up after 20 seconds (rule 5)', () => {
    expect(AI_TIMEOUT_MS).toBe(20_000);
  });
  it('allows 120 AI calls per pupil per day (rule 13)', () => {
    expect(PUPIL_DAILY_AI_CAP).toBe(120);
  });
  it('limits each text to 600 characters (runbook S17)', () => {
    expect(OVERVIEW_TEXT_MAX).toBe(600);
  });
});

describe('the system prompt', () => {
  it('is word for word the ai-overview prompt in specs/ai-prompts.md', () => {
    const spec = readFileSync(join(__dirname, '..', '..', 'specs', 'ai-prompts.md'), 'utf8').replace(/\r\n/g, '\n');
    const section = spec.split('## ai-overview')[1] ?? '';
    const block = (section.split('```text\n')[1] ?? '').split('\n```')[0];
    expect(OVERVIEW_SYSTEM_PROMPT).toBe(block);
  });
});

describe('overviewInputSchema', () => {
  it('accepts a full input', () => {
    expect(overviewInputSchema.safeParse(valid).success).toBe(true);
  });
  it('accepts empty texts (skipped)', () => {
    const r = overviewInputSchema.safeParse({ ...valid, summary_text: '', confusing_text: '' });
    expect(r.success).toBe(true);
  });
  it('trims the texts', () => {
    const r = overviewInputSchema.parse({ ...valid, summary_text: '  wood  ', confusing_text: '\n' });
    expect(r.summary_text).toBe('wood');
    expect(r.confusing_text).toBe('');
  });
  it('accepts exactly 600 characters and refuses 601', () => {
    expect(overviewInputSchema.safeParse({ ...valid, summary_text: 'a'.repeat(600) }).success).toBe(true);
    expect(overviewInputSchema.safeParse({ ...valid, summary_text: 'a'.repeat(601) }).success).toBe(false);
    expect(overviewInputSchema.safeParse({ ...valid, confusing_text: 'a'.repeat(601) }).success).toBe(false);
  });
  it('refuses a pupil id that is not a uuid', () => {
    expect(overviewInputSchema.safeParse({ ...valid, pupil_id: 'P1' }).success).toBe(false);
  });
  it('refuses a missing response id', () => {
    const { response_id: _drop, ...rest } = valid;
    expect(overviewInputSchema.safeParse(rest).success).toBe(false);
  });
  it('refuses extra fields, so no name or class can be sent', () => {
    expect(overviewInputSchema.safeParse({ ...valid, name: 'Ama' }).success).toBe(false);
    expect(overviewInputSchema.safeParse({ ...valid, class_level: 'Basic 7' }).success).toBe(false);
  });
  it('accepts an optional ISO client date', () => {
    expect(overviewInputSchema.safeParse({ ...valid, client_created_at: '2026-11-28T09:00:00.000Z' }).success).toBe(true);
    expect(overviewInputSchema.safeParse({ ...valid, client_created_at: 'yesterday' }).success).toBe(false);
  });
});

describe('isSkipped', () => {
  it('is true only when both texts are empty', () => {
    expect(isSkipped({ summary_text: '', confusing_text: '' })).toBe(true);
    expect(isSkipped({ summary_text: 'wood', confusing_text: '' })).toBe(false);
    expect(isSkipped({ summary_text: '', confusing_text: 'metals' })).toBe(false);
  });
});

describe('buildOverviewUserMessage', () => {
  it('sends only the segment titles and the two texts', () => {
    const msg = JSON.parse(buildOverviewUserMessage(SEGMENTS, 'wood', 'metals')) as Record<string, unknown>;
    expect(Object.keys(msg).sort()).toEqual(['pupil_confusion', 'pupil_summary', 'segment_titles']);
    expect(msg.segment_titles).toEqual(['Overview', 'What is a material?', 'Properties of materials']);
    expect(msg.pupil_summary).toBe('wood');
    expect(msg.pupil_confusion).toBe('metals');
  });
});

describe('parseOverviewOutput', () => {
  const good = {
    keywords: ['wood', 'plastic'],
    interests: ['football'],
    confusions: ['metals'],
    segments_mentioned: ['What is a material?'],
    safeguarding: false,
  };

  it('reads clean JSON', () => {
    expect(parseOverviewOutput(JSON.stringify(good))).toEqual(good);
  });
  it('reads JSON inside a code fence', () => {
    expect(parseOverviewOutput('```json\n' + JSON.stringify(good) + '\n```')).toEqual(good);
  });
  it('returns null for text that is not JSON', () => {
    expect(parseOverviewOutput('Sure, here you go')).toBeNull();
    expect(parseOverviewOutput('')).toBeNull();
  });
  it('returns null when a field is missing or the wrong type', () => {
    const { safeguarding: _s, ...noFlag } = good;
    expect(parseOverviewOutput(JSON.stringify(noFlag))).toBeNull();
    expect(parseOverviewOutput(JSON.stringify({ ...good, safeguarding: 'no' }))).toBeNull();
    expect(parseOverviewOutput(JSON.stringify({ ...good, keywords: 'wood' }))).toBeNull();
    expect(parseOverviewOutput(JSON.stringify([good]))).toBeNull();
  });
  it('trims items, drops empty ones and keeps at most 8 keywords and 3 confusions', () => {
    const out = parseOverviewOutput(
      JSON.stringify({
        ...good,
        keywords: [' a ', '', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i'],
        confusions: ['x', 'y', 'z', 'w'],
      }),
    );
    expect(out?.keywords).toEqual(['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h']);
    expect(out?.confusions).toEqual(['x', 'y', 'z']);
  });
  it('cuts very long items to 80 characters', () => {
    const out = parseOverviewOutput(JSON.stringify({ ...good, interests: ['k'.repeat(200)] }));
    expect(out?.interests[0]).toHaveLength(80);
  });
});

describe('titlesToCodes', () => {
  it('maps titles to codes, ignoring case and spaces', () => {
    expect(titlesToCodes(['  what is a MATERIAL? ', 'Properties of materials'], SEGMENTS)).toEqual(['1A', '1B']);
  });
  it('accepts a code given instead of a title', () => {
    expect(titlesToCodes(['1b', 'OV'], SEGMENTS)).toEqual(['1B', 'OV']);
  });
  it('drops anything that is not a segment of this topic, and duplicates', () => {
    expect(titlesToCodes(['Electricity', '1Z', '1A', 'What is a material?'], SEGMENTS)).toEqual(['1A']);
  });
});

describe('mergeProfile', () => {
  const empty = { keywords: [], interests: [], confusions: [] };

  it('puts the newest words first', () => {
    const out = mergeProfile({ keywords: ['old'], interests: [], confusions: [] }, { keywords: ['new'], interests: [], confusions: [] });
    expect(out.keywords).toEqual(['new', 'old']);
  });
  it('removes duplicates without caring about case, keeping the newest spelling', () => {
    const out = mergeProfile({ ...empty, interests: ['Football', 'cooking'] }, { ...empty, interests: ['football'] });
    expect(out.interests).toEqual(['football', 'cooking']);
  });
  it('keeps the caps', () => {
    const many = (n: number, p: string) => Array.from({ length: n }, (_, i) => `${p}${i}`);
    const out = mergeProfile(
      { keywords: many(50, 'k'), interests: many(30, 'i'), confusions: many(30, 'c') },
      { keywords: ['new'], interests: ['new'], confusions: ['new'] },
    );
    expect(out.keywords).toHaveLength(PROFILE_CAPS.keywords);
    expect(out.interests).toHaveLength(PROFILE_CAPS.interests);
    expect(out.confusions).toHaveLength(PROFILE_CAPS.confusions);
    expect(out.keywords[0]).toBe('new');
  });
  it('changes nothing when there is nothing new', () => {
    const cur = { keywords: ['a'], interests: ['b'], confusions: ['c'] };
    expect(mergeProfile(cur, empty)).toEqual(cur);
  });
});

describe('capCheck (rule 13)', () => {
  it('allows a call under both caps', () => {
    expect(capCheck({ pupilToday: 0, globalToday: 0, globalCap: 2000 })).toBe('ok');
    expect(capCheck({ pupilToday: 119, globalToday: 1999, globalCap: 2000 })).toBe('ok');
  });
  it('refuses the 121st call for a pupil', () => {
    expect(capCheck({ pupilToday: 120, globalToday: 0, globalCap: 2000 })).toBe('pupil_cap');
  });
  it('refuses once the global cap is reached', () => {
    expect(capCheck({ pupilToday: 0, globalToday: 2000, globalCap: 2000 })).toBe('global_cap');
  });
});

describe('startOfUtcDay', () => {
  it('is midnight UTC of the same day (Ghana is on UTC)', () => {
    expect(startOfUtcDay(new Date('2026-11-28T23:59:59.999Z')).toISOString()).toBe('2026-11-28T00:00:00.000Z');
    expect(startOfUtcDay(new Date('2026-11-28T00:00:00.000Z')).toISOString()).toBe('2026-11-28T00:00:00.000Z');
  });
});

describe('interpretOverviewReply', () => {
  it('reads a saved reply', () => {
    expect(interpretOverviewReply(200, { ok: true })).toBe('ok');
  });
  it('reads fallbacks', () => {
    expect(interpretOverviewReply(200, { fallback: true, retry: true })).toBe('fallback_retry');
    expect(interpretOverviewReply(200, { fallback: true, retry: false })).toBe('fallback_final');
  });
  it('treats a refused input as final', () => {
    expect(interpretOverviewReply(400, { error: 'bad_input' })).toBe('rejected');
    expect(interpretOverviewReply(403, { error: 'forbidden' })).toBe('rejected');
  });
  it('treats a server error or an odd body as try again', () => {
    expect(interpretOverviewReply(500, { error: 'server' })).toBe('server');
    expect(interpretOverviewReply(200, null)).toBe('server');
    expect(interpretOverviewReply(502, 'Bad gateway')).toBe('server');
  });
});

describe('queueNext', () => {
  it('is done once the server has it', () => {
    expect(queueNext({ attempts: 0 }, 'ok')).toEqual({ action: 'done' });
    expect(queueNext({ attempts: 0 }, 'fallback_final')).toEqual({ action: 'done' });
    expect(queueNext({ attempts: 0 }, 'rejected')).toEqual({ action: 'done' });
  });
  it('keeps the item without counting a try when offline or on a server error (the row may not be saved yet)', () => {
    expect(queueNext({ attempts: 1 }, 'offline')).toEqual({ action: 'keep', attempts: 1 });
    expect(queueNext({ attempts: MAX_SEND_ATTEMPTS - 1 }, 'server')).toEqual({ action: 'keep', attempts: MAX_SEND_ATTEMPTS - 1 });
  });
  it('counts a try on a fallback (the row is saved) and stops after the last one', () => {
    expect(queueNext({ attempts: 0 }, 'fallback_retry')).toEqual({ action: 'keep', attempts: 1 });
    expect(queueNext({ attempts: MAX_SEND_ATTEMPTS - 1 }, 'fallback_retry')).toEqual({ action: 'done' });
  });
});
