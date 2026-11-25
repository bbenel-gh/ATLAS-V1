import draft from '../../content/materials.json';
import { contentSchema, type Content } from '../../src/data/contentSchema';
import { ATLAS_DEV_REF } from './devTarget';
import {
  buildImportSql,
  buildRows,
  chooseContentVersion,
  diffRows,
  formatSummary,
  parseImportArgs,
  parseState,
  planImport,
  prodTarget,
  type Row,
  sqlLiteral,
  stableStringify,
  TABLES,
} from './contentImport';

const content = (): Content => contentSchema.parse(structuredClone(draft));
const HASH = 'ab12cd34';
const TODAY = '2026-11-25';

/** What the database read returns when it already holds exactly these rows. */
const asState = (rows: Row[]) => {
  const state: Record<string, Record<string, unknown>[]> = {};
  for (const t of TABLES) state[t] = [];
  for (const r of rows) state[r.table]?.push({ ...r.ref, ...r.values });
  return state;
};

const byTable = (rows: Row[], table: string) => rows.filter((r) => r.table === table);

describe('buildRows: stable keys', () => {
  const rows = buildRows(content());

  it('makes one row per content item, with the overview as segment OV', () => {
    expect(byTable(rows, 'topics')).toHaveLength(1);
    expect(byTable(rows, 'segments').map((r) => r.ref.segment)).toEqual(['OV', '1A', '1B', '1C', '1D', '1E']);
    expect(byTable(rows, 'video_versions')).toHaveLength(11); // PRD 7.2: overview + 2 per segment
    expect(byTable(rows, 'check_items')).toHaveLength(15);
    expect(byTable(rows, 'worked_examples')).toHaveLength(5);
    expect(byTable(rows, 'exam_papers')).toHaveLength(2);
    expect(byTable(rows, 'exam_items')).toHaveLength(26);
    expect(byTable(rows, 'exam_item_keys')).toHaveLength(26);
    expect(byTable(rows, 'recheck_items')).toHaveLength(3);
  });

  it('builds keys from topic id, segment code, version label, try number, paper and item number', () => {
    const keys = rows.map((r) => r.key);
    expect(keys).toEqual(
      expect.arrayContaining([
        'topics:B7-MATERIALS',
        'segments:B7-MATERIALS/OV',
        'segments:B7-MATERIALS/1C',
        'video_versions:B7-MATERIALS/OV/a',
        'video_versions:B7-MATERIALS/1B/b',
        'check_items:B7-MATERIALS/1A/try3',
        'worked_examples:B7-MATERIALS/1E',
        'exam_papers:B7-MATERIALS/A',
        'exam_items:B7-MATERIALS/B/13',
        'exam_item_keys:B7-MATERIALS/A/1',
        'recheck_items:B7-MATERIALS/3',
      ]),
    );
  });

  it('gives every row a different key', () => {
    expect(new Set(rows.map((r) => r.key)).size).toBe(rows.length);
  });

  it('keeps the same keys when only wording changes', () => {
    const changed = content();
    changed.segments[0]!.title = 'DRAFT: another title';
    changed.exam.paperA.objective[0]!.question = 'DRAFT: another question';
    expect(buildRows(changed).map((r) => r.key)).toEqual(rows.map((r) => r.key));
  });

  it('numbers segments from 1 after the overview, and exam items objective first then theory', () => {
    expect(byTable(rows, 'segments').map((r) => r.values.sort_order)).toEqual([0, 1, 2, 3, 4, 5]);
    const items = byTable(rows, 'exam_items').filter((r) => r.ref.paper === 'A');
    expect(items.map((r) => r.ref.sort_order)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13]);
    expect(items.map((r) => r.values.kind)).toEqual([...Array(10).fill('objective'), ...Array(3).fill('theory')]);
  });

  it('keeps answers out of exam_items and puts them in exam_item_keys', () => {
    const c = content();
    const item = byTable(rows, 'exam_items').find((r) => r.key === 'exam_items:B7-MATERIALS/A/1')!;
    expect(Object.keys(item.values).sort()).toEqual(['kind', 'marks', 'options', 'question']);
    const key = byTable(rows, 'exam_item_keys').find((r) => r.key === 'exam_item_keys:B7-MATERIALS/A/1')!;
    expect(key.values.correct_option).toBe(c.exam.paperA.objective[0]!.correctIndex);
    const theoryKey = byTable(rows, 'exam_item_keys').find((r) => r.key === 'exam_item_keys:B7-MATERIALS/A/11')!;
    expect(theoryKey.values.correct_option).toBeNull();
    expect(theoryKey.values.scheme_points).toEqual(
      c.exam.paperA.theory[0]!.schemePoints.map((p, i) => ({ id: `s${i + 1}`, text: p.point, marks: p.marks })),
    );
  });

  it('stores reason options as {text, code} with a null code on the sound reason', () => {
    const c = content();
    const check = byTable(rows, 'check_items').find((r) => r.key === 'check_items:B7-MATERIALS/1A/try1')!;
    const reasons = c.segments[0]!.checkQuestions[0]!.reasonOptions;
    expect(check.values.reason_options).toEqual(reasons.map((o) => ({ text: o.text, code: o.misconceptionCode ?? null })));
    expect(check.values.misconception_codes).toEqual(reasons.flatMap((o) => (o.misconceptionCode ? [o.misconceptionCode] : [])));
  });

  it('carries prerequisites and the misconception list the AI check needs', () => {
    const c = content();
    c.topic.prerequisites = ['B7-MATTER'];
    const built = buildRows(c);
    expect(byTable(built, 'topics')[0]!.values.prerequisites).toEqual(['B7-MATTER']);
    expect(byTable(built, 'segments').find((r) => r.ref.segment === '1B')!.values.misconceptions).toEqual(c.segments[1]!.misconceptions);
  });

  it('follows the file when it has more or fewer segments (D-33)', () => {
    const c = content();
    c.segments = c.segments.slice(0, 2);
    c.recheck = c.recheck.map((r) => ({ ...r, segmentCode: '1A' }));
    expect(byTable(buildRows(c), 'segments').map((r) => r.ref.segment)).toEqual(['OV', '1A', '1B']);
  });
});

describe('diffRows', () => {
  const rows = buildRows(content());

  it('inserts everything into an empty database', () => {
    const diff = diffRows(rows, []);
    expect(diff.segments.inserted).toHaveLength(6);
    expect(diff.segments.updated).toHaveLength(0);
    expect(TABLES.every((t) => diff[t].unchanged === 0)).toBe(true);
  });

  it('changes nothing when the database already matches', () => {
    const diff = diffRows(rows, parseState(asState(rows)));
    for (const t of TABLES) {
      expect(diff[t].inserted).toEqual([]);
      expect(diff[t].updated).toEqual([]);
    }
    expect(diff.check_items.unchanged).toBe(15);
  });

  it('ignores the order of keys inside JSON values, as Postgres jsonb does', () => {
    const existing = parseState(asState(rows)).map((r) =>
      r.table === 'check_items'
        ? { ...r, values: { ...r.values, reason_options: (r.values.reason_options as { text: string; code: string | null }[]).map((o) => ({ code: o.code, text: o.text })) } }
        : r,
    );
    expect(diffRows(rows, existing).check_items.updated).toEqual([]);
  });

  it('reports one updated row when one field changes', () => {
    const c = content();
    c.segments[2]!.versions[1]!.durationSeconds = 99;
    const diff = diffRows(buildRows(c), rows);
    expect(diff.video_versions.updated.map((r) => r.key)).toEqual(['video_versions:B7-MATERIALS/1C/b']);
    expect(diff.video_versions.updated[0]!.changed).toEqual(['duration_seconds']);
    expect(diff.video_versions.unchanged).toBe(10);
  });

  it('reports a row only in the database as extra, and never plans to delete it', () => {
    const c = content();
    c.segments = c.segments.slice(0, 4);
    c.recheck = c.recheck.map((r) => ({ ...r, segmentCode: '1A' }));
    const diff = diffRows(buildRows(c), rows);
    expect(diff.segments.extra).toEqual(['segments:B7-MATERIALS/1E']);
    expect(diff.video_versions.extra).toEqual(['video_versions:B7-MATERIALS/1E/a', 'video_versions:B7-MATERIALS/1E/b']);
  });

  it('treats a missing column in the database as a change', () => {
    const existing = rows.map((r) => (r.table === 'topics' ? { ...r, values: { ...r.values, prerequisites: undefined } } : r));
    expect(diffRows(rows, existing).topics.updated).toHaveLength(1);
  });
});

describe('content version', () => {
  it('is the date then the short hash', () => {
    expect(chooseContentVersion({ existing: null, hash: HASH, today: TODAY, rowsChanged: true })).toBe('2026-11-25-ab12cd34');
  });

  it('keeps the stored version when nothing changed, even on a later day', () => {
    expect(chooseContentVersion({ existing: '2026-11-20-ab12cd34', hash: HASH, today: TODAY, rowsChanged: false })).toBe('2026-11-20-ab12cd34');
  });

  it('moves on when the file hash changed', () => {
    expect(chooseContentVersion({ existing: '2026-11-20-00000000', hash: HASH, today: TODAY, rowsChanged: false })).toBe('2026-11-25-ab12cd34');
  });

  it('moves on when rows changed although the file did not (the database was edited by hand)', () => {
    expect(chooseContentVersion({ existing: '2026-11-20-ab12cd34', hash: HASH, today: TODAY, rowsChanged: true })).toBe('2026-11-25-ab12cd34');
  });

  it('refuses a hash or date in the wrong shape', () => {
    expect(() => chooseContentVersion({ existing: null, hash: 'XYZ', today: TODAY, rowsChanged: true })).toThrow();
    expect(() => chooseContentVersion({ existing: null, hash: HASH, today: '25/11/2026', rowsChanged: true })).toThrow();
  });
});

describe('planImport: running twice changes nothing the second time', () => {
  it('first run inserts everything and sets the version', () => {
    const plan = planImport({ content: content(), state: asState([]), hash: HASH, today: TODAY });
    expect(plan.version).toBe('2026-11-25-ab12cd34');
    expect(plan.changes).toBe(95); // 1 + 6 + 11 + 15 + 5 + 2 + 26 + 26 + 3
    expect(plan.diff.topics.inserted[0]!.values.content_version).toBe('2026-11-25-ab12cd34');
  });

  it('second run against the result of the first plans no change at all', () => {
    const first = planImport({ content: content(), state: asState([]), hash: HASH, today: TODAY });
    const second = planImport({ content: content(), state: asState(first.rows), hash: HASH, today: '2026-11-26' });
    expect(second.changes).toBe(0);
    expect(second.version).toBe('2026-11-25-ab12cd34');
    expect(buildImportSql(second)).toBe('');
  });

  it('a wording change updates that row and the topic version only', () => {
    const first = planImport({ content: content(), state: asState([]), hash: HASH, today: TODAY });
    const c = content();
    c.segments[0]!.workedExample.text = 'DRAFT: a new card';
    const next = planImport({ content: c, state: asState(first.rows), hash: 'ffff0000', today: '2026-11-27' });
    expect(next.diff.worked_examples.updated.map((r) => r.key)).toEqual(['worked_examples:B7-MATERIALS/1A']);
    expect(next.diff.topics.updated[0]!.changed).toEqual(['content_version']);
    expect(next.changes).toBe(2);
    expect(next.version).toBe('2026-11-27-ffff0000');
  });
});

describe('buildImportSql', () => {
  const plan = planImport({ content: content(), state: asState([]), hash: HASH, today: TODAY });
  const sql = buildImportSql(plan);

  it('is one transaction', () => {
    expect(sql.startsWith('begin;')).toBe(true);
    expect(sql.trimEnd().endsWith('commit;')).toBe(true);
  });

  it('writes parents before children', () => {
    const at = (s: string) => sql.indexOf(s);
    const order = TABLES.map((t) => at(`insert into public.${t} `));
    expect(order.every((n) => n >= 0)).toBe(true);
    expect([...order].sort((a, b) => a - b)).toEqual(order);
  });

  it('upserts on the stable keys', () => {
    expect(sql).toContain('on conflict (code) do update');
    expect(sql).toContain('on conflict (topic_id, code) do update');
    expect(sql).toContain('on conflict (segment_id, label) do update');
    expect(sql).toContain('on conflict (segment_id, try_number) do update');
    expect(sql).toContain('on conflict (paper_id, sort_order) do update');
    expect(sql).toContain('on conflict (item_id) do update');
    expect(sql).toContain('on conflict (topic_id, sort_order) do update');
  });

  it('never deletes', () => {
    expect(sql.toLowerCase()).not.toMatch(/\bdelete\b|\btruncate\b|\bdrop\b/);
  });

  it('casts enum, array and JSON values', () => {
    expect(sql).toContain("'objective'::public.exam_item_kind");
    expect(sql).toMatch(/array\['1A-M1'\]::text\[\]/);
    expect(sql).toContain('::jsonb');
  });

  it('writes only the changed rows', () => {
    const c = content();
    c.segments[1]!.title = 'DRAFT: changed';
    const next = planImport({ content: c, state: asState(plan.rows), hash: '11112222', today: TODAY });
    const statements = buildImportSql(next).split('\n').filter((l) => l.startsWith('insert into'));
    expect(statements).toHaveLength(2); // the segment and the topic version
  });
});

describe('sqlLiteral and stableStringify', () => {
  it('doubles single quotes and keeps backslashes as they are', () => {
    expect(sqlLiteral("pupil's \\ note")).toBe("'pupil''s \\ note'");
  });

  it('refuses a NUL character', () => {
    expect(() => sqlLiteral('a\u0000b')).toThrow();
  });

  it('sorts object keys at every depth', () => {
    expect(stableStringify({ b: 1, a: [{ d: 1, c: 2 }] })).toBe('{"a":[{"c":2,"d":1}],"b":1}');
  });
});

describe('targets', () => {
  it('runs on atlas-dev with no flags', () => {
    expect(parseImportArgs([])).toEqual({ prod: false, dryRun: false });
    expect(parseImportArgs(['--dry-run'])).toEqual({ prod: false, dryRun: true });
  });

  it('refuses unknown flags, so a typo never falls back to a real run', () => {
    expect(() => parseImportArgs(['--prd'])).toThrow(/Unknown option/);
  });

  it('needs the exact typed confirmation for prod', () => {
    const ref = 'abcdefghijklmnopqrst';
    expect(prodTarget(ref, 'IMPORT TO PROD')).toBe(ref);
    expect(() => prodTarget(ref, 'import to prod')).toThrow();
    expect(() => prodTarget(ref, 'IMPORT TO PROD ')).toThrow();
    expect(() => prodTarget(ref, '')).toThrow();
  });

  it('refuses a missing or malformed prod ref, and the atlas-dev ref', () => {
    expect(() => prodTarget(undefined, 'IMPORT TO PROD')).toThrow(/ATLAS_PROD_REF/);
    expect(() => prodTarget('not-a-ref', 'IMPORT TO PROD')).toThrow();
    expect(() => prodTarget(ATLAS_DEV_REF, 'IMPORT TO PROD')).toThrow(/atlas-dev/);
  });
});

describe('formatSummary', () => {
  it('lists every kind of content with inserted, updated and unchanged', () => {
    const plan = planImport({ content: content(), state: asState([]), hash: HASH, today: TODAY });
    const text = formatSummary(plan).join('\n');
    for (const label of ['topics', 'segments', 'video versions', 'check questions', 'worked example cards', 'exam items', 're-check items']) {
      expect(text).toContain(label);
    }
    expect(text).toMatch(/segments\s+6 inserted\s+0 updated\s+0 unchanged/);
  });

  it('says plainly when there is nothing to change', () => {
    const first = planImport({ content: content(), state: asState([]), hash: HASH, today: TODAY });
    const second = planImport({ content: content(), state: asState(first.rows), hash: HASH, today: TODAY });
    expect(formatSummary(second).join('\n')).toContain('No changes');
  });
});
