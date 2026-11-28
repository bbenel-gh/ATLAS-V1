/**
 * Pure logic for the content import (runbook S09, D-34). No I/O here: the
 * script scripts/importContent.ts reads the file and talks to the database.
 *
 * 1. buildRows turns a validated content file into database rows, each with a
 *    stable key built only from ids in the file: topic id, segment code,
 *    version label, try number, paper label and item number. Wording can change
 *    and the key stays the same, so an edit updates a row and never duplicates it.
 * 2. diffRows compares those rows with what the database holds: inserted,
 *    updated (with the changed columns), unchanged, and extra (in the database
 *    but not in the file). Extra rows are reported and never deleted, because
 *    pupil attempts point at them.
 * 3. planImport adds the content version ("YYYY-MM-DD-<8 hex>") to the topic.
 *    It only moves on when something changed, so a second run changes nothing.
 * 4. buildImportSql writes only the inserted and updated rows, as upserts on the
 *    stable keys, parents first, in one transaction.
 *
 * Plain TypeScript, runs under Node type stripping and Jest.
 */
import type { Content, ContentVideoVersion } from '../../src/data/contentSchema.ts';
import { ATLAS_DEV_REF } from './devTarget.ts';

// Tables and columns ----------------------------------------------------------------

/** Parents before children: the order rows are written in. */
export const TABLES = [
  'topics',
  'segments',
  'video_versions',
  'check_items',
  'worked_examples',
  'exam_papers',
  'exam_items',
  'exam_item_keys',
  'recheck_items',
] as const;
export type Table = (typeof TABLES)[number];

/** Natural key fields of each table, as the database read names them. */
const REF_FIELDS: Record<Table, readonly string[]> = {
  topics: ['topic'],
  segments: ['topic', 'segment'],
  video_versions: ['topic', 'segment', 'label'],
  check_items: ['topic', 'segment', 'try_number'],
  worked_examples: ['topic', 'segment'],
  exam_papers: ['topic', 'paper'],
  exam_items: ['topic', 'paper', 'sort_order'],
  exam_item_keys: ['topic', 'paper', 'sort_order'],
  recheck_items: ['topic', 'sort_order'],
};

/** The columns the import owns. Ids, foreign keys and created_at are not compared. */
export const COLUMNS: Record<Table, readonly string[]> = {
  topics: ['title', 'class_level', 'subject', 'prerequisites', 'content_version'],
  segments: ['title', 'sort_order', 'objective', 'reference_meaning', 'misconceptions'],
  video_versions: [
    'url_360',
    'url_480',
    'url_720',
    'url_1080',
    'poster_url',
    'captions_url',
    'board_colour',
    'duration_seconds',
    'example_world',
    'misconception_tags',
    'interest_tags',
  ],
  check_items: ['question', 'accepted_answers', 'tap_options', 'reason_options', 'reference_reasoning', 'misconception_codes'],
  worked_examples: ['body', 'image_url'],
  exam_papers: ['duration_minutes'],
  exam_items: ['kind', 'question', 'options', 'marks'],
  exam_item_keys: ['correct_option', 'scheme_points', 'suggested_answer'],
  // segment_code is written as segment_id, found from the code.
  recheck_items: ['segment_code', 'question', 'accepted_answers', 'tap_options'],
};

const TEXT_ARRAY = new Set(['prerequisites', 'misconception_tags', 'interest_tags', 'accepted_answers', 'misconception_codes']);
const JSONB = new Set(['misconceptions', 'tap_options', 'reason_options', 'options', 'scheme_points']);

const LABELS: Record<Table, string> = {
  topics: 'topics',
  segments: 'segments',
  video_versions: 'video versions',
  check_items: 'check questions',
  worked_examples: 'worked example cards',
  exam_papers: 'exam papers',
  exam_items: 'exam items',
  exam_item_keys: 'exam answer keys',
  recheck_items: 're-check items',
};

export type Ref = Record<string, string | number>;
export type Row = { table: Table; key: string; ref: Ref; values: Record<string, unknown> };

const keyOf = (table: Table, ref: Ref): string => {
  const parts = REF_FIELDS[table].map((f) => (f === 'try_number' ? `try${ref[f]}` : String(ref[f])));
  return `${table}:${parts.join('/')}`;
};

const row = (table: Table, ref: Ref, values: Record<string, unknown>): Row => ({ table, key: keyOf(table, ref), ref, values });

// 1. Content file to rows ----------------------------------------------------------

/** The overview is stored as a segment with code OV and sort order 0 (S06 migration). */
export const OVERVIEW_CODE = 'OV';

const versionValues = (v: ContentVideoVersion) => ({
  url_360: v.url360,
  url_480: v.url480,
  url_720: v.url720 ?? null,
  url_1080: v.url1080 ?? null,
  poster_url: v.posterUrl,
  captions_url: v.captionsUrl,
  board_colour: v.boardColour,
  duration_seconds: v.durationSeconds,
  example_world: v.exampleWorld,
  misconception_tags: v.misconceptionTags,
  interest_tags: v.interestTags,
});

/** Objective items are worth 1 mark each (draft placeholder, D-34). */
export const OBJECTIVE_MARKS = 1;

export function buildRows(content: Content): Row[] {
  const topic = content.topic.id;
  const rows: Row[] = [];

  rows.push(
    row('topics', { topic }, {
      title: content.topic.title,
      class_level: content.topic.level,
      subject: content.topic.subject,
      prerequisites: content.topic.prerequisites,
      content_version: null, // set by planImport
    }),
  );

  rows.push(
    row('segments', { topic, segment: OVERVIEW_CODE }, { title: 'Overview', sort_order: 0, objective: '', reference_meaning: '', misconceptions: [] }),
  );
  content.segments.forEach((s, i) => {
    rows.push(
      row('segments', { topic, segment: s.code }, {
        title: s.title,
        sort_order: i + 1,
        objective: s.objective,
        reference_meaning: s.referenceMeaning,
        misconceptions: s.misconceptions.map((m) => ({ code: m.code, text: m.text })),
      }),
    );
  });

  rows.push(row('video_versions', { topic, segment: OVERVIEW_CODE, label: content.topic.overview.label }, versionValues(content.topic.overview)));
  for (const s of content.segments) {
    for (const v of s.versions) rows.push(row('video_versions', { topic, segment: s.code, label: v.label }, versionValues(v)));
  }

  for (const s of content.segments) {
    s.checkQuestions.forEach((q, qi) => {
      rows.push(
        row('check_items', { topic, segment: s.code, try_number: qi + 1 }, {
          question: q.question,
          accepted_answers: q.acceptedAnswers,
          tap_options: q.tapOptions,
          reason_options: q.reasonOptions.map((o) => ({ text: o.text, code: o.misconceptionCode ?? null })),
          reference_reasoning: q.referenceReasoning,
          misconception_codes: q.reasonOptions.flatMap((o) => (o.misconceptionCode ? [o.misconceptionCode] : [])),
        }),
      );
    });
  }

  for (const s of content.segments) {
    rows.push(row('worked_examples', { topic, segment: s.code }, { body: s.workedExample.text, image_url: s.workedExample.photoUrl }));
  }

  const papers = [
    ['A', content.exam.paperA],
    ['B', content.exam.paperB],
  ] as const;
  for (const [paper, p] of papers) rows.push(row('exam_papers', { topic, paper }, { duration_minutes: p.durationMinutes }));
  for (const [paper, p] of papers) {
    p.objective.forEach((item, i) => {
      rows.push(row('exam_items', { topic, paper, sort_order: i + 1 }, { kind: 'objective', question: item.question, options: item.options, marks: OBJECTIVE_MARKS }));
    });
    p.theory.forEach((item, i) => {
      rows.push(row('exam_items', { topic, paper, sort_order: p.objective.length + i + 1 }, { kind: 'theory', question: item.question, options: null, marks: item.marks }));
    });
  }
  for (const [paper, p] of papers) {
    p.objective.forEach((item, i) => {
      rows.push(
        row('exam_item_keys', { topic, paper, sort_order: i + 1 }, {
          correct_option: item.correctIndex,
          scheme_points: null,
          suggested_answer: item.options[item.correctIndex] ?? '',
        }),
      );
    });
    p.theory.forEach((item, i) => {
      rows.push(
        row('exam_item_keys', { topic, paper, sort_order: p.objective.length + i + 1 }, {
          correct_option: null,
          scheme_points: item.schemePoints.map((sp, k) => ({ id: `s${k + 1}`, text: sp.point, marks: sp.marks })),
          suggested_answer: '',
        }),
      );
    });
  }

  content.recheck.forEach((r, i) => {
    rows.push(
      row('recheck_items', { topic, sort_order: i + 1 }, {
        segment_code: r.segmentCode,
        question: r.question,
        accepted_answers: r.acceptedAnswers,
        tap_options: r.tapOptions,
      }),
    );
  });

  return rows;
}

// 2. Database state to rows, and the diff --------------------------------------------

/** What the read query returns: one list of plain objects per table. */
export type DbState = Partial<Record<Table, Record<string, unknown>[]>>;

export function parseState(state: DbState): Row[] {
  return TABLES.flatMap((table) =>
    (state[table] ?? []).map((obj) => {
      const ref: Ref = {};
      for (const f of REF_FIELDS[table]) {
        const v = obj[f];
        if (typeof v !== 'string' && typeof v !== 'number') throw new Error(`Database row in ${table} has no ${f}`);
        ref[f] = v;
      }
      const values: Record<string, unknown> = {};
      for (const c of COLUMNS[table]) values[c] = obj[c];
      return row(table, ref, values);
    }),
  );
}

/** JSON with object keys sorted at every depth, so jsonb key order never counts as a change. */
export function stableStringify(value: unknown): string {
  if (value === undefined) return 'undefined';
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;
  const obj = value as Record<string, unknown>;
  return `{${Object.keys(obj)
    .sort()
    .map((k) => `${JSON.stringify(k)}:${stableStringify(obj[k])}`)
    .join(',')}}`;
}

export type ChangedRow = Row & { changed: string[] };
export type TableDiff = { inserted: Row[]; updated: ChangedRow[]; unchanged: number; extra: string[] };
export type Diff = Record<Table, TableDiff>;

export function diffRows(desired: Row[], existing: Row[]): Diff {
  const diff = Object.fromEntries(TABLES.map((t) => [t, { inserted: [], updated: [], unchanged: 0, extra: [] } as TableDiff])) as Diff;
  const have = new Map(existing.map((r) => [r.key, r]));
  const want = new Set(desired.map((r) => r.key));

  for (const r of desired) {
    const old = have.get(r.key);
    if (!old) {
      diff[r.table].inserted.push(r);
      continue;
    }
    const changed = COLUMNS[r.table].filter((c) => stableStringify(r.values[c]) !== stableStringify(old.values[c]));
    if (changed.length > 0) diff[r.table].updated.push({ ...r, changed });
    else diff[r.table].unchanged += 1;
  }
  for (const r of existing) if (!want.has(r.key)) diff[r.table].extra.push(r.key);
  return diff;
}

const countChanges = (diff: Diff) => TABLES.reduce((n, t) => n + diff[t].inserted.length + diff[t].updated.length, 0);

// 3. Content version and the plan -----------------------------------------------------

export function chooseContentVersion(input: { existing: string | null; hash: string; today: string; rowsChanged: boolean }): string {
  if (!/^[0-9a-f]{8}$/.test(input.hash)) throw new Error(`Content hash must be 8 small hex digits, not "${input.hash}"`);
  if (!/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(input.today)) throw new Error(`Date must be YYYY-MM-DD, not "${input.today}"`);
  const sameFile = input.existing !== null && input.existing.endsWith(`-${input.hash}`);
  if (sameFile && !input.rowsChanged) return input.existing as string;
  return `${input.today}-${input.hash}`;
}

export type ImportPlan = { topic: string; rows: Row[]; diff: Diff; version: string; changes: number };

/**
 * hash: 8 hex digits of the file's content. today: YYYY-MM-DD.
 * The version is chosen from a diff that leaves the version out, then the
 * final diff includes it, so the topic row is updated only when the version moves.
 */
export function planImport(input: { content: Content; state: DbState; hash: string; today: string }): ImportPlan {
  const topic = input.content.topic.id;
  const existing = parseState(input.state);
  const desired = buildRows(input.content);

  const existingTopic = existing.find((r) => r.key === keyOf('topics', { topic }));
  const existingVersion = typeof existingTopic?.values.content_version === 'string' ? existingTopic.values.content_version : null;

  const withoutVersion = (rows: Row[]) =>
    rows.map((r) => (r.table === 'topics' ? { ...r, values: { ...r.values, content_version: null } } : r));
  const rowsChanged = countChanges(diffRows(withoutVersion(desired), withoutVersion(existing))) > 0;

  const version = chooseContentVersion({ existing: existingVersion, hash: input.hash, today: input.today, rowsChanged });
  const rows = desired.map((r) => (r.table === 'topics' ? { ...r, values: { ...r.values, content_version: version } } : r));
  const diff = diffRows(rows, existing);
  return { topic, rows, diff, version, changes: countChanges(diff) };
}

// 4. SQL -------------------------------------------------------------------------------

/** A SQL string literal under standard_conforming_strings (set in the transaction). */
export function sqlLiteral(value: string): string {
  if (value.includes('\u0000')) throw new Error('Content text must not contain a NUL character');
  return `'${value.replace(/'/g, "''")}'`;
}

function sqlValue(column: string, value: unknown): string {
  if (value === null || value === undefined) return 'null';
  if (column === 'kind') return `${sqlLiteral(String(value))}::public.exam_item_kind`;
  if (TEXT_ARRAY.has(column)) {
    const items = value as string[];
    return items.length === 0 ? `'{}'::text[]` : `array[${items.map(sqlLiteral).join(', ')}]::text[]`;
  }
  if (JSONB.has(column)) return `${sqlLiteral(JSON.stringify(value))}::jsonb`;
  if (typeof value === 'number') {
    if (!Number.isInteger(value)) throw new Error(`${column} must be a whole number`);
    return String(value);
  }
  return sqlLiteral(String(value));
}

type Target = { cols: string[]; exprs: string[]; from: string; conflict: string; writeCols: string[] };

/** How each table's row is written: which parent rows it joins and its upsert key. */
function target(r: Row): Target {
  const t = sqlLiteral(String(r.ref.topic));
  const seg = r.ref.segment === undefined ? '' : sqlLiteral(String(r.ref.segment));
  const paper = r.ref.paper === undefined ? '' : sqlLiteral(String(r.ref.paper));
  const fromSegment = `from public.segments s join public.topics t on t.id = s.topic_id where t.code = ${t} and s.code = ${seg}`;
  const fromPaper = `from public.exam_papers p join public.topics t on t.id = p.topic_id where t.code = ${t} and p.label = ${paper}`;
  const own = COLUMNS[r.table];
  switch (r.table) {
    case 'topics':
      return { cols: ['code'], exprs: [t], from: '', conflict: 'code', writeCols: own as string[] };
    case 'segments':
      return { cols: ['topic_id', 'code'], exprs: ['t.id', seg], from: `from public.topics t where t.code = ${t}`, conflict: 'topic_id, code', writeCols: [...own] };
    case 'video_versions':
      return { cols: ['segment_id', 'label'], exprs: ['s.id', sqlLiteral(String(r.ref.label))], from: fromSegment, conflict: 'segment_id, label', writeCols: [...own] };
    case 'check_items':
      return { cols: ['segment_id', 'try_number'], exprs: ['s.id', String(r.ref.try_number)], from: fromSegment, conflict: 'segment_id, try_number', writeCols: [...own] };
    case 'worked_examples':
      return { cols: ['segment_id'], exprs: ['s.id'], from: fromSegment, conflict: 'segment_id', writeCols: [...own] };
    case 'exam_papers':
      return { cols: ['topic_id', 'label'], exprs: ['t.id', paper], from: `from public.topics t where t.code = ${t}`, conflict: 'topic_id, label', writeCols: [...own] };
    case 'exam_items':
      return { cols: ['paper_id', 'sort_order'], exprs: ['p.id', String(r.ref.sort_order)], from: fromPaper, conflict: 'paper_id, sort_order', writeCols: [...own] };
    case 'exam_item_keys':
      return {
        cols: ['item_id'],
        exprs: ['i.id'],
        from: `from public.exam_items i join public.exam_papers p on p.id = i.paper_id join public.topics t on t.id = p.topic_id where t.code = ${t} and p.label = ${paper} and i.sort_order = ${String(r.ref.sort_order)}`,
        conflict: 'item_id',
        writeCols: [...own],
      };
    case 'recheck_items':
      return {
        cols: ['topic_id', 'sort_order', 'segment_id'],
        exprs: ['t.id', String(r.ref.sort_order), `(select s.id from public.segments s where s.topic_id = t.id and s.code = ${sqlLiteral(String(r.values.segment_code))})`],
        from: `from public.topics t where t.code = ${t}`,
        conflict: 'topic_id, sort_order',
        writeCols: own.filter((c) => c !== 'segment_code'),
      };
  }
}

function upsert(r: Row): string {
  const tg = target(r);
  const cols = [...tg.cols, ...tg.writeCols];
  const exprs = [...tg.exprs, ...tg.writeCols.map((c) => sqlValue(c, r.values[c]))];
  const updates = cols.filter((c) => !tg.conflict.split(', ').includes(c)).map((c) => `${c} = excluded.${c}`);
  const source = tg.from === '' ? `values (${exprs.join(', ')})` : `select ${exprs.join(', ')} ${tg.from}`;
  return `insert into public.${r.table} (${cols.join(', ')}) ${source} on conflict (${tg.conflict}) do update set ${updates.join(', ')};`;
}

/** Empty string when there is nothing to change. One statement per line. */
export function buildImportSql(plan: ImportPlan): string {
  if (plan.changes === 0) return '';
  const lines = ['begin;', 'set local standard_conforming_strings = on;'];
  for (const t of TABLES) {
    for (const r of [...plan.diff[t].inserted, ...plan.diff[t].updated]) lines.push(upsert(r));
  }
  lines.push('commit;');
  return `${lines.join('\n')}\n`;
}

/** One read-only query that returns the topic's content as { state: DbState }. */
export function buildReadSql(topic: string): string {
  const t = sqlLiteral(topic);
  const agg = (fields: string, from: string) => `(select coalesce(jsonb_agg(jsonb_build_object(${fields})), '[]'::jsonb) ${from})`;
  const cols = (table: Table, alias: string) =>
    COLUMNS[table]
      .filter((c) => c !== 'segment_code')
      .map((c) => `'${c}', ${alias}.${c}`)
      .join(', ');
  const segJoin = `join public.segments s on s.id = x.segment_id join public.topics t on t.id = s.topic_id where t.code = ${t}`;
  const paperJoin = `join public.exam_papers p on p.id = x.paper_id join public.topics t on t.id = p.topic_id where t.code = ${t}`;
  return `select jsonb_build_object(
  'topics', ${agg(`'topic', x.code, ${cols('topics', 'x')}`, `from public.topics x where x.code = ${t}`)},
  'segments', ${agg(`'topic', t.code, 'segment', x.code, ${cols('segments', 'x')}`, `from public.segments x join public.topics t on t.id = x.topic_id where t.code = ${t}`)},
  'video_versions', ${agg(`'topic', t.code, 'segment', s.code, 'label', x.label, ${cols('video_versions', 'x')}`, `from public.video_versions x ${segJoin}`)},
  'check_items', ${agg(`'topic', t.code, 'segment', s.code, 'try_number', x.try_number, ${cols('check_items', 'x')}`, `from public.check_items x ${segJoin}`)},
  'worked_examples', ${agg(`'topic', t.code, 'segment', s.code, ${cols('worked_examples', 'x')}`, `from public.worked_examples x ${segJoin}`)},
  'exam_papers', ${agg(`'topic', t.code, 'paper', x.label, ${cols('exam_papers', 'x')}`, `from public.exam_papers x join public.topics t on t.id = x.topic_id where t.code = ${t}`)},
  'exam_items', ${agg(`'topic', t.code, 'paper', p.label, 'sort_order', x.sort_order, ${cols('exam_items', 'x')}`, `from public.exam_items x ${paperJoin}`)},
  'exam_item_keys', ${agg(
    `'topic', t.code, 'paper', p.label, 'sort_order', i.sort_order, ${cols('exam_item_keys', 'x')}`,
    `from public.exam_item_keys x join public.exam_items i on i.id = x.item_id join public.exam_papers p on p.id = i.paper_id join public.topics t on t.id = p.topic_id where t.code = ${t}`,
  )},
  'recheck_items', ${agg(
    `'topic', t.code, 'sort_order', x.sort_order, 'segment_code', s.code, ${cols('recheck_items', 'x')}`,
    `from public.recheck_items x join public.topics t on t.id = x.topic_id left join public.segments s on s.id = x.segment_id where t.code = ${t}`,
  )}
) as state;`;
}

// Targets --------------------------------------------------------------------------------

export const PROD_CONFIRMATION = 'IMPORT TO PROD';

export function parseImportArgs(args: string[]): { prod: boolean; dryRun: boolean } {
  const out = { prod: false, dryRun: false };
  for (const a of args) {
    if (a === '--prod') out.prod = true;
    else if (a === '--dry-run') out.dryRun = true;
    else throw new Error(`Unknown option "${a}". Use no option for atlas-dev, --dry-run to only show the plan, or --prod (S41 only).`);
  }
  return out;
}

/** Prod needs the prod project ref from .env.import and the exact typed confirmation. */
export function prodTarget(prodRef: string | undefined, typed: string): string {
  const ref = (prodRef ?? '').trim();
  if (ref === '') throw new Error('Refusing to import to prod: ATLAS_PROD_REF is not set in .env.import.');
  if (!/^[a-z]{20}$/.test(ref)) throw new Error('Refusing to import to prod: ATLAS_PROD_REF must be a 20-letter Supabase project ref.');
  if (ref === ATLAS_DEV_REF) throw new Error('Refusing to import to prod: ATLAS_PROD_REF is the atlas-dev project.');
  if (typed !== PROD_CONFIRMATION) throw new Error(`Refusing to import to prod: you must type exactly "${PROD_CONFIRMATION}".`);
  return ref;
}

// Summary ----------------------------------------------------------------------------------

export function formatSummary(plan: ImportPlan): string[] {
  const width = Math.max(...TABLES.map((t) => LABELS[t].length));
  const lines = TABLES.map((t) => {
    const d = plan.diff[t];
    return `  ${LABELS[t].padEnd(width)}  ${d.inserted.length} inserted  ${d.updated.length} updated  ${d.unchanged} unchanged`;
  });
  const updates = TABLES.flatMap((t) => plan.diff[t].updated.map((r) => `  updated ${r.key}: ${r.changed.join(', ')}`));
  const extras = TABLES.flatMap((t) => plan.diff[t].extra);
  const out = [`Topic ${plan.topic}, content version ${plan.version}`, ...lines];
  if (updates.length > 0) out.push('', 'Changed fields:', ...updates);
  if (extras.length > 0) {
    out.push('', `In the database but not in the file (${extras.length}), left as they are. Nothing is ever deleted by the import:`);
    out.push(...extras.map((k) => `  ${k}`));
  }
  out.push('', plan.changes === 0 ? 'No changes. The database already matches the file.' : `${plan.changes} rows to write.`);
  return out;
}
