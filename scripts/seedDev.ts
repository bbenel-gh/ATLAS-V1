/**
 * Seeds fake test people and rows into atlas-dev, for the RLS suite (runbook S07).
 *
 * Usage: npm run seed:dev
 *
 * Why a script and not supabase/seed.sql:
 *   - seed.sql only runs on a local `supabase db reset`, which needs Docker (D-26).
 *   - The test users need passwords that are generated, never committed, and
 *     kept in the git-ignored .env.test. A static SQL file cannot do that.
 *   - The script runs its SQL through the Supabase CLI login, the same way the
 *     migrations are pushed. So the service role key never has to be saved on
 *     this shared computer.
 *
 * Safe to run again: it deletes every earlier test row (all ids start with 7e57)
 * and recreates them in one transaction. Passwords already in .env.test are kept.
 *
 * Refuses to run unless .env and the CLI link both point at atlas-dev (rule 15).
 */
import { spawnSync } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { assertAtlasDev, parseEnvFile, setEnvValues, sqlText } from './lib/devTarget.ts';
import {
  CLASSES,
  CONTENT,
  PUPIL_LIST,
  PUPILS,
  PUPILS_WITH_EXAM,
  rowIds,
  SCHOOL,
  STAFF,
  USERS,
} from './lib/testFixtures.ts';

const root = join(import.meta.dirname, '..');
const envTestPath = join(root, '.env.test');

const appEnv = parseEnvFile(readFileSync(join(root, '.env'), 'utf8'));
const linkedRefPath = join(root, 'supabase', '.temp', 'project-ref');
const ref = assertAtlasDev({
  supabaseUrl: appEnv.EXPO_PUBLIC_SUPABASE_URL,
  linkedRef: existsSync(linkedRefPath) ? readFileSync(linkedRefPath, 'utf8') : undefined,
});

// 1. Passwords: keep what .env.test has, generate what is missing.
const envTestText = existsSync(envTestPath) ? readFileSync(envTestPath, 'utf8') : '';
const envTest = parseEnvFile(envTestText);
const passwords: Record<string, string> = {};
const generated: Record<string, string> = {};
for (const u of Object.values(USERS)) {
  const existing = envTest[u.passwordEnv];
  if (existing) {
    passwords[u.passwordEnv] = existing;
  } else {
    const fresh = randomBytes(18).toString('base64url');
    passwords[u.passwordEnv] = fresh;
    generated[u.passwordEnv] = fresh;
  }
}
if (Object.keys(generated).length > 0) {
  const header = envTestText === '' ? '# Test credentials for atlas-dev. Git ignored. Written by npm run seed:dev.\n' : envTestText;
  writeFileSync(envTestPath, setEnvValues(header, generated));
}

// 2. The SQL, in one transaction.
const t = sqlText;
const list = (ids: string[]) => ids.map((v) => `${t(v)}::uuid`).join(', ');
const users = Object.values(USERS);
const pupilIds = PUPIL_LIST.map((p) => p.id);

const sql: string[] = [
  'begin;',

  '-- Remove earlier test rows. Deleting the auth users cascades to staff, pupils',
  '-- and every pupil-owned row (profiles, consents, attempts, exams, flags, ai_calls).',
  `delete from public.pupils where id in (${list(pupilIds)});`,
  `delete from public.staff where id in (${list(Object.values(STAFF).map((s) => s.id))});`,
  `delete from auth.users where id in (${list(users.map((u) => u.authId))}) or email in (${users.map((u) => t(u.email)).join(', ')});`,
  `delete from public.topics where id = ${t(CONTENT.topicId)} or code = ${t(CONTENT.topicCode)};`,
  `delete from public.classes where id in (${list([CLASSES.A.id, CLASSES.B.id])});`,
  `delete from public.schools where id = ${t(SCHOOL.id)};`,

  '-- Auth users, email and password, already confirmed.',
  ...users.flatMap((u) => [
    `insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
       raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
       confirmation_token, recovery_token, email_change_token_new, email_change)
     values ('00000000-0000-0000-0000-000000000000', ${t(u.authId)}, 'authenticated', 'authenticated', ${t(u.email)},
       extensions.crypt(${t(passwords[u.passwordEnv] ?? '')}, extensions.gen_salt('bf')), now(),
       '{"provider":"email","providers":["email"]}', '{"atlas_test":true}', now(), now(), '', '', '', '');`,
    `insert into auth.identities (provider_id, user_id, identity_data, provider, created_at, updated_at, last_sign_in_at)
     values (${t(u.authId)}, ${t(u.authId)},
       jsonb_build_object('sub', ${t(u.authId)}, 'email', ${t(u.email)}, 'email_verified', true),
       'email', now(), now(), now());`,
  ]),

  '-- People.',
  ...Object.values(STAFF).map(
    (s) => `insert into public.staff (id, user_id, display_name, role)
     values (${t(s.id)}, ${t(s.user.authId)}, ${t(s.name)}, ${t(s.role)});`,
  ),
  `insert into public.schools (id, name, district, region, added_by)
   values (${t(SCHOOL.id)}, ${t(SCHOOL.name)}, 'Test District', 'Test Region', ${t(STAFF.admin.id)});`,
  `insert into public.classes (id, name, school_id, teacher_id, join_code) values
   (${t(CLASSES.A.id)}, ${t(CLASSES.A.name)}, ${t(SCHOOL.id)}, ${t(STAFF.teacher7A.id)}, ${t(CLASSES.A.joinCode)}),
   (${t(CLASSES.B.id)}, ${t(CLASSES.B.name)}, ${t(SCHOOL.id)}, ${t(STAFF.teacher7B.id)}, ${t(CLASSES.B.joinCode)});`,
  ...PUPIL_LIST.flatMap((p) => [
    // No PIN: like a real pupil, each test pupil chooses one at first sign-in
    // (S10). A fake hash here made bcrypt fail with a server error (S11).
    `insert into public.pupils (id, user_id, class_id, display_name, school_given, school_id, code, signed_up_by)
     values (${t(p.id)}, ${t(p.user.authId)}, ${t(p.classId)}, ${t(p.name)}, ${t(SCHOOL.name)}, ${t(SCHOOL.id)},
       ${t(p.code)}, 'admin');`,
    `insert into public.profiles (pupil_id, interests, playful_choices)
     values (${t(p.id)}, array['football', 'cooking'], '{"seed": true}');`,
  ]),
  ...PUPIL_LIST.filter((p) => p.consent !== null).map((p, i) => {
    const n = pupilIds.indexOf(p.id) + 1;
    return p.consent === 'paper'
      ? `insert into public.consents (id, pupil_id, method, recorded_by, form_ref)
         values (${t(rowIds(n).consent)}, ${t(p.id)}, 'paper', ${t(STAFF.admin.id)}, ${t(`TEST-FORM-${i + 1}`)});`
      : `insert into public.consents (id, pupil_id, method) values (${t(rowIds(n).consent)}, ${t(p.id)}, 'in_app');`;
  }),

  '-- Content: one topic, one segment, one video, one check item, paper A with its key.',
  `insert into public.topics (id, code, title, class_level, subject)
   values (${t(CONTENT.topicId)}, ${t(CONTENT.topicCode)}, 'Test Materials', 'Basic 7', 'Integrated Science');`,
  `insert into public.segments (id, topic_id, code, title, sort_order, objective, reference_meaning)
   values (${t(CONTENT.segmentId)}, ${t(CONTENT.topicId)}, 'T1', 'Test segment', 1, 'Test objective', 'Test meaning');`,
  `insert into public.video_versions (id, segment_id, label, url_360, url_480, duration_seconds, example_world)
   values (${t(CONTENT.videoVersionId)}, ${t(CONTENT.segmentId)}, 'a',
     'https://example.invalid/test-360.mp4', 'https://example.invalid/test-480.mp4', 60, 'kitchen');`,
  `insert into public.check_items (id, segment_id, try_number, question, accepted_answers, tap_options, reason_options)
   values (${t(CONTENT.checkItemId)}, ${t(CONTENT.segmentId)}, 1, 'Test question', array['test answer'],
     '["one", "two", "three"]', '[{"text": "sound", "code": null}, {"text": "m1", "code": "T1-M1"}, {"text": "m2", "code": "T1-M2"}]');`,
  `insert into public.exam_papers (id, topic_id, label, duration_minutes)
   values (${t(CONTENT.paperId)}, ${t(CONTENT.topicId)}, 'A', 30);`,
  `insert into public.exam_items (id, paper_id, kind, sort_order, question, options, marks) values
   (${t(CONTENT.objectiveItemId)}, ${t(CONTENT.paperId)}, 'objective', 1, 'Test objective item', '["Wood", "Glass", "Iron", "Paper"]', 1),
   (${t(CONTENT.theoryItemId)}, ${t(CONTENT.paperId)}, 'theory', 2, 'Test theory item', null, 4);`,
  `insert into public.exam_item_keys (item_id, correct_option, scheme_points, suggested_answer) values
   (${t(CONTENT.objectiveItemId)}, 2, null, 'Iron'),
   (${t(CONTENT.theoryItemId)}, null, '[{"id": "s1", "text": "Test scheme point", "marks": 4}]', 'Test suggested answer');`,

  '-- Lesson rows for every pupil. The attempts trigger creates segment_status (D-29).',
  ...PUPIL_LIST.flatMap((p) => {
    const n = pupilIds.indexOf(p.id) + 1;
    const r = rowIds(n);
    return [
      `insert into public.attempts (id, pupil_id, segment_id, try_number, video_version_id, check_item_id, answer,
         input_mode, reason, sure, answer_verdict, reasoning_verdict, misconception_codes)
       values (${t(r.attempt)}, ${t(p.id)}, ${t(CONTENT.segmentId)}, 1, ${t(CONTENT.videoVersionId)},
         ${t(CONTENT.checkItemId)}, ${t(`answer from ${p.user.label}`)}, 'typed', 'test reason', true, 'no', 'no', array['T1-M1']);`,
      `insert into public.overview_responses (id, pupil_id, topic_id, summary_text, confusing_text)
       values (${t(r.overview)}, ${t(p.id)}, ${t(CONTENT.topicId)}, 'test summary', 'test confusion');`,
    ];
  }),

  '-- Exam, flag, AI call and mastery rows for P1, P2 and P4.',
  ...PUPILS_WITH_EXAM.flatMap((key) => {
    const p = PUPILS[key];
    const n = pupilIds.indexOf(p.id) + 1;
    const r = rowIds(n);
    return [
      `insert into public.exam_attempts (id, pupil_id, paper_id) values (${t(r.examAttempt)}, ${t(p.id)}, ${t(CONTENT.paperId)});`,
      `insert into public.exam_answers (id, attempt_id, item_id, pupil_id, answer_option, marks_awarded)
       values (${t(r.examAnswer)}, ${t(r.examAttempt)}, ${t(CONTENT.objectiveItemId)}, ${t(p.id)}, 1, 0);`,
      `insert into public.flags (id, pupil_id, kind, segment_id, exam_answer_id, note)
       values (${t(r.flag)}, ${t(p.id)}, 'borderline', ${t(CONTENT.segmentId)}, ${t(r.examAnswer)}, 'seed flag');`,
      `insert into public.ai_calls (job, model, pupil_id, input, output, ok, latency_ms)
       values ('check', 'claude-sonnet-5-5', ${t(p.id)}, '{"seed": true}', '{"seed": true}', true, 1200);`,
      `insert into public.mastery (id, pupil_id, topic_id, exam_attempt_id, status, exam_score)
       values (${t(r.mastery)}, ${t(p.id)}, ${t(CONTENT.topicId)}, ${t(r.examAttempt)}, 'revision', 40);`,
    ];
  }),

  'commit;',
];

// 3. Run it through the CLI. The file holds the test passwords, so it lives in
// a private temp folder and is deleted straight after.
const dir = mkdtempSync(join(tmpdir(), 'atlas-seed-'));
const file = join(dir, 'seed.sql');
let status: number | null = 1;
try {
  writeFileSync(file, sql.join('\n'), { mode: 0o600 });
  // --yes: the CLI asks before any write to a hosted database, and labels every
  // main database "production" (D-25). assertAtlasDev above is the real guard.
  // One command string: ref is a fixed constant and file is our own temp path.
  const command = `npx supabase db query --remote=${ref} --yes -f "${file}" --output-format json`;
  const run = spawnSync(command, { cwd: root, shell: true, encoding: 'utf8' });
  status = run.status;
  if (run.status !== 0) {
    // Do not echo the SQL. The CLI error text says which statement failed.
    console.error((run.stderr || run.stdout || '').replace(/crypt\('[^']*'/g, "crypt('***'"));
  }
} finally {
  rmSync(dir, { recursive: true, force: true });
}
if (status !== 0) {
  console.error('Seed FAILED. Nothing was changed: the transaction rolled back.');
  process.exit(1);
}

console.log(`Seeded atlas-dev (${ref}):`);
console.log(`  1 school "${SCHOOL.name}", classes "${CLASSES.A.name}" and "${CLASSES.B.name}"`);
console.log('  1 admin, 2 teachers (one per class)');
console.log('  P1, P2, P3 in 7A and P4 in 7B. Consent for P1, P2, P4. P3 has none, on purpose.');
console.log('  1 test topic with 1 segment, 1 video, 1 check item, paper A and its key');
console.log('  Each pupil: profile, attempt, segment status, overview answer. P1, P2, P4: exam attempt, answer, flag, AI call, mastery');
if (Object.keys(generated).length > 0) {
  console.log(`  New passwords written to .env.test for: ${Object.keys(generated).join(', ')}`);
}
