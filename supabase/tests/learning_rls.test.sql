-- S06: Row Level Security for content, learning, exam, mastery, flags and ai_calls.
-- Run against atlas-dev only (CLAUDE.md rule 15), the D-26 way.
-- Everything runs in one transaction that never commits, so no test row stays.

begin;
create extension if not exists pgtap with schema extensions;
select plan(76);

-- Fixtures, created as the migration owner (bypasses RLS) -------------------
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-00000000a001', 'admin@test.atlas.invalid'),
  ('00000000-0000-0000-0000-00000000a002', 'teacher@test.atlas.invalid'),
  ('00000000-0000-0000-0000-00000000b001', 'pupil-a@test.atlas.invalid'),
  ('00000000-0000-0000-0000-00000000b002', 'pupil-b@test.atlas.invalid'),
  ('00000000-0000-0000-0000-00000000b003', 'pupil-c@test.atlas.invalid');

insert into public.staff (id, user_id, display_name, role) values
  ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-00000000a001', 'Test Admin', 'admin'),
  ('10000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-00000000a002', 'Test Teacher', 'teacher');

insert into public.classes (id, name, teacher_id, join_code) values
  ('30000000-0000-0000-0000-000000000001', 'Basic 7A', '10000000-0000-0000-0000-000000000002', 'TSTA7A'),
  ('30000000-0000-0000-0000-000000000002', 'Basic 7B', null, 'TSTB7B');

insert into public.pupils (id, user_id, class_id, display_name, code, signed_up_by, status) values
  ('40000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-00000000b001', '30000000-0000-0000-0000-000000000001', 'Pupil A', 'TSTAAA', 'admin', 'active'),
  ('40000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-00000000b002', '30000000-0000-0000-0000-000000000002', 'Pupil B', 'TSTBBB', 'self', 'active'),
  ('40000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-00000000b003', '30000000-0000-0000-0000-000000000001', 'Pupil C', 'TSTCCC', 'self', 'suspended');

-- Content
insert into public.topics (id, code, title, class_level, subject) values
  ('50000000-0000-0000-0000-000000000001', 'TST-MAT', 'Test Materials', 'Basic 7', 'Integrated Science');

insert into public.segments (id, topic_id, code, title, sort_order, objective, reference_meaning) values
  ('51000000-0000-0000-0000-000000000001', '50000000-0000-0000-0000-000000000001', '1A', 'Test segment 1A', 1, 'Objective', 'Meaning'),
  ('51000000-0000-0000-0000-000000000002', '50000000-0000-0000-0000-000000000001', '1B', 'Test segment 1B', 2, 'Objective', 'Meaning');

insert into public.video_versions (id, segment_id, label, url_360, url_480, poster_url, captions_url, board_colour, duration_seconds, example_world, misconception_tags, interest_tags) values
  ('52000000-0000-0000-0000-000000000001', '51000000-0000-0000-0000-000000000001', 'a',
   'https://test.invalid/a-360.mp4', 'https://test.invalid/a-480.mp4', 'https://test.invalid/a.jpg', 'https://test.invalid/a.vtt',
   '#F6F0E6', 150, 'home and farm', '{1A-M1}', '{farming}');

insert into public.check_items (id, segment_id, try_number, question, accepted_answers, tap_options, reason_options, reference_reasoning, misconception_codes) values
  ('53000000-0000-0000-0000-000000000001', '51000000-0000-0000-0000-000000000001', 1, 'Test question',
   '{answer}', '["x","y","z"]', '[{"text":"r1","code":null},{"text":"r2","code":"1A-M1"},{"text":"r3","code":"1A-M2"}]',
   'Reference reasoning', '{1A-M1,1A-M2}');

insert into public.worked_examples (id, segment_id, body) values
  ('54000000-0000-0000-0000-000000000001', '51000000-0000-0000-0000-000000000001', 'Worked example');

insert into public.exam_papers (id, topic_id, label, duration_minutes) values
  ('55000000-0000-0000-0000-000000000001', '50000000-0000-0000-0000-000000000001', 'A', 20),
  ('55000000-0000-0000-0000-000000000002', '50000000-0000-0000-0000-000000000001', 'B', 20);

insert into public.exam_items (id, paper_id, kind, sort_order, question, options, marks) values
  ('56000000-0000-0000-0000-000000000001', '55000000-0000-0000-0000-000000000001', 'objective', 1, 'Objective question', '["p","q","r","s"]', 1),
  ('56000000-0000-0000-0000-000000000002', '55000000-0000-0000-0000-000000000001', 'theory', 2, 'Theory question', null, 4);

insert into public.exam_item_keys (item_id, correct_option, scheme_points, suggested_answer) values
  ('56000000-0000-0000-0000-000000000001', 2, null, 'r'),
  ('56000000-0000-0000-0000-000000000002', null, '[{"id":"p1","text":"point","marks":4}]', 'Suggested answer');

insert into public.recheck_items (id, topic_id, segment_id, sort_order, question, accepted_answers, tap_options) values
  ('57000000-0000-0000-0000-000000000001', '50000000-0000-0000-0000-000000000001', '51000000-0000-0000-0000-000000000001', 1, 'Recheck', '{answer}', '["x","y","z"]');

-- Pupil B's data, so pupil A has something they must not see
insert into public.attempts (pupil_id, segment_id, try_number, video_version_id, check_item_id, answer, input_mode, reason, sure) values
  ('40000000-0000-0000-0000-000000000002', '51000000-0000-0000-0000-000000000001', 1,
   '52000000-0000-0000-0000-000000000001', '53000000-0000-0000-0000-000000000001', 'B answer', 'typed', 'B reason', true);

insert into public.exam_attempts (id, pupil_id, paper_id, submitted_at, status) values
  ('61000000-0000-0000-0000-000000000002', '40000000-0000-0000-0000-000000000002', '55000000-0000-0000-0000-000000000001', now(), 'submitted');

insert into public.mastery (pupil_id, topic_id, exam_attempt_id, status, exam_score, achieved_at, recheck_due_at) values
  ('40000000-0000-0000-0000-000000000002', '50000000-0000-0000-0000-000000000001', '61000000-0000-0000-0000-000000000002',
   'achieved', 85, now(), now() + interval '3 days');

insert into public.flags (pupil_id, kind, segment_id) values
  ('40000000-0000-0000-0000-000000000001', 'safeguarding', '51000000-0000-0000-0000-000000000001'),
  ('40000000-0000-0000-0000-000000000002', 'stalled', '51000000-0000-0000-0000-000000000001');

insert into public.ai_calls (job, model, pupil_id, input, output, ok, latency_ms) values
  ('check', 'claude-sonnet-5-5', '40000000-0000-0000-0000-000000000001', '{"q":"test"}', '{"a":"test"}', true, 900),
  ('check', 'claude-sonnet-5-5', '40000000-0000-0000-0000-000000000002', '{"q":"test"}', '{"a":"test"}', true, 900);

-- Structure ------------------------------------------------------------------
select is(
  (select count(*)::int from pg_class c join pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'public' and c.relkind = 'r' and c.relname in (
     'topics','segments','video_versions','check_items','worked_examples','exam_papers','exam_items',
     'exam_item_keys','recheck_items','overview_responses','segment_status','attempts','exam_attempts',
     'exam_answers','mastery','flags','ai_calls')),
  17, 'all seventeen S06 tables exist'
);
select ok(
  (select bool_and(c.relrowsecurity) from pg_class c join pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'public' and c.relkind = 'r'),
  'RLS is enabled on every table in public'
);
select is_empty(
  $$select policyname from pg_policies where schemaname = 'public' and roles <> '{authenticated}'$$,
  'every policy in public is for the authenticated role only'
);
select is(
  (select count(*)::int
   from pg_constraint fk
   join pg_class t on t.oid = fk.conrelid
   join pg_namespace n on n.oid = t.relnamespace
   where fk.contype = 'f' and n.nspname = 'public'
     and not exists (
       select 1 from pg_index i
       where i.indrelid = fk.conrelid and i.indkey[0] = fk.conkey[1]
     )),
  0, 'every foreign key in public has an index starting with its column'
);
select ok(
  exists (select 1 from pg_indexes where schemaname = 'public' and tablename = 'attempts'
          and indexdef like '%(pupil_id, segment_id%'),
  'attempts has an index on (pupil_id, segment_id)'
);

-- Anon: no access at all ------------------------------------------------------
set local role anon;
select throws_ok('select 1 from public.topics', '42501', null, 'anon cannot read topics');
select throws_ok('select 1 from public.attempts', '42501', null, 'anon cannot read attempts');
select throws_ok(
  $$select * from public.get_exam_items('61000000-0000-0000-0000-000000000002')$$,
  '42501', null, 'anon cannot call get_exam_items'
);
reset role;

-- Pupil A: content ------------------------------------------------------------
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000b001","role":"authenticated"}', true);

select is((select count(*)::int from public.segments where topic_id = '50000000-0000-0000-0000-000000000001'), 2, 'pupil reads segments');
select is((select count(*)::int from public.video_versions where segment_id = '51000000-0000-0000-0000-000000000001'), 1, 'pupil reads video versions');
select is((select count(*)::int from public.check_items where segment_id = '51000000-0000-0000-0000-000000000001'), 1, 'pupil reads check items');
select is((select count(*)::int from public.exam_papers where topic_id = '50000000-0000-0000-0000-000000000001'), 2, 'pupil reads exam papers');
select is_empty('select 1 from public.exam_items', 'pupil cannot read exam items directly');
select is_empty('select 1 from public.exam_item_keys', 'pupil cannot read the exam answer key');
select throws_ok(
  $$insert into public.topics (code, title, class_level, subject) values ('TST-X', 'X', 'Basic 7', 'Science')$$,
  '42501', null, 'pupil cannot add a topic'
);
select is_empty(
  $$update public.segments set title = 'Changed' returning id$$,
  'pupil cannot change a segment'
);

-- Pupil A: learning -----------------------------------------------------------
select lives_ok(
  $$insert into public.attempts (pupil_id, segment_id, try_number, video_version_id, check_item_id, answer, input_mode, reason, sure)
    values ('40000000-0000-0000-0000-000000000001', '51000000-0000-0000-0000-000000000001', 1,
            '52000000-0000-0000-0000-000000000001', '53000000-0000-0000-0000-000000000001',
            'A answer', 'typed', 'A reason', false)$$,
  'pupil records their own attempt, without verdicts'
);
select throws_ok(
  $$insert into public.attempts (pupil_id, segment_id, try_number, answer, input_mode, answer_verdict, reasoning_verdict)
    values ('40000000-0000-0000-0000-000000000001', '51000000-0000-0000-0000-000000000001', 1, 'x', 'typed', 'yes', 'yes')$$,
  '42501', null, 'pupil cannot set an AI verdict'
);
select throws_ok(
  $$insert into public.attempts (pupil_id, segment_id, try_number, answer, input_mode, misconception_codes)
    values ('40000000-0000-0000-0000-000000000001', '51000000-0000-0000-0000-000000000001', 1, 'x', 'typed', '{}')$$,
  '42501', null, 'pupil cannot set misconception codes'
);
select results_eq(
  $$select status::text, tries_used, versions_seen from public.segment_status
    where pupil_id = '40000000-0000-0000-0000-000000000001' and segment_id = '51000000-0000-0000-0000-000000000001'$$,
  $$values ('in_progress', 0, '{52000000-0000-0000-0000-000000000001}'::uuid[])$$,
  'saving an attempt marks the segment in progress and records the version seen'
);
select throws_ok(
  $$insert into public.attempts (pupil_id, segment_id, try_number, answer, input_mode)
    values ('40000000-0000-0000-0000-000000000002', '51000000-0000-0000-0000-000000000001', 2, 'fake', 'typed')$$,
  '42501', null, 'pupil cannot record an attempt for another pupil'
);
select results_eq('select answer from public.attempts', $$values ('A answer')$$, 'pupil reads only their own attempts');
select throws_ok(
  $$update public.attempts set answer_verdict = 'yes'$$,
  '42501', null, 'pupil cannot change an attempt after it is saved'
);
select lives_ok(
  $$insert into public.overview_responses (pupil_id, topic_id, summary_text, confusing_text)
    values ('40000000-0000-0000-0000-000000000001', '50000000-0000-0000-0000-000000000001', 'It was about materials', 'Nothing')$$,
  'pupil saves their overview answers'
);
select throws_ok(
  $$insert into public.overview_responses (pupil_id, topic_id, ai_result)
    values ('40000000-0000-0000-0000-000000000001', '50000000-0000-0000-0000-000000000001', '{}')$$,
  '42501', null, 'pupil cannot write the AI result of the overview job'
);
select throws_ok(
  $$insert into public.segment_status (pupil_id, segment_id, status)
    values ('40000000-0000-0000-0000-000000000001', '51000000-0000-0000-0000-000000000002', 'complete')$$,
  '42501', null, 'pupil cannot write their own segment status'
);
select is_empty(
  $$update public.segment_status set status = 'complete'
    where pupil_id = '40000000-0000-0000-0000-000000000001' returning pupil_id$$,
  'pupil cannot change their own segment status'
);
select throws_ok(
  $$insert into public.segment_status (pupil_id, segment_id, status)
    values ('40000000-0000-0000-0000-000000000002', '51000000-0000-0000-0000-000000000002', 'complete')$$,
  '42501', null, 'pupil cannot record segment status for another pupil'
);

-- Pupil A: flags, AI log, mastery ---------------------------------------------
select is_empty('select 1 from public.flags', 'pupil reads no flags, not even their own');
select throws_ok(
  $$insert into public.flags (pupil_id, kind) values ('40000000-0000-0000-0000-000000000001', 'borderline')$$,
  '42501', null, 'pupil cannot create a flag'
);
select is_empty('select 1 from public.ai_calls', 'pupil reads no AI call log, not even their own');
select throws_ok(
  $$insert into public.ai_calls (job, model, ok) values ('check', 'x', true)$$,
  '42501', null, 'pupil cannot write to the AI call log'
);
select is_empty('select 1 from public.mastery', 'pupil does not see another pupil''s mastery');
select throws_ok(
  $$insert into public.mastery (pupil_id, topic_id, status) values ('40000000-0000-0000-0000-000000000001', '50000000-0000-0000-0000-000000000001', 'achieved')$$,
  '42501', null, 'pupil cannot give themselves mastery'
);

-- Pupil A: exam ---------------------------------------------------------------
select throws_ok(
  $$insert into public.exam_attempts (pupil_id, paper_id, started_at)
    values ('40000000-0000-0000-0000-000000000001', '55000000-0000-0000-0000-000000000001', now() + interval '1 hour')$$,
  '42501', null, 'pupil cannot choose their own exam start time'
);
select lives_ok(
  $$insert into public.exam_attempts (pupil_id, paper_id)
    values ('40000000-0000-0000-0000-000000000001', '55000000-0000-0000-0000-000000000001')$$,
  'pupil starts an exam'
);
select is(
  (select duration_seconds from public.exam_attempts where pupil_id = '40000000-0000-0000-0000-000000000001'),
  1200, 'exam duration is copied from the paper by the server'
);
select is(
  (select count(*)::int from public.get_exam_items(
     (select id from public.exam_attempts where pupil_id = '40000000-0000-0000-0000-000000000001'))),
  2, 'pupil gets the questions of their own attempt'
);
select is(
  (select count(*)::int from public.get_exam_items('61000000-0000-0000-0000-000000000002')),
  0, 'pupil gets no questions through another pupil''s attempt'
);
select is_empty(
  $$select * from public.get_exam_review(
      (select id from public.exam_attempts where pupil_id = '40000000-0000-0000-0000-000000000001'))$$,
  'pupil gets no answer key before submitting'
);
select lives_ok(
  $$insert into public.exam_answers (attempt_id, item_id, pupil_id, answer_option)
    values ((select id from public.exam_attempts where pupil_id = '40000000-0000-0000-0000-000000000001'),
            '56000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000001', 1)$$,
  'pupil saves an exam answer'
);
select lives_ok(
  $$update public.exam_answers set answer_option = 2 where pupil_id = '40000000-0000-0000-0000-000000000001'$$,
  'pupil changes an answer before submitting'
);
select throws_ok(
  $$insert into public.exam_answers (attempt_id, item_id, pupil_id, answer, marks_awarded)
    values ((select id from public.exam_attempts where pupil_id = '40000000-0000-0000-0000-000000000001'),
            '56000000-0000-0000-0000-000000000002', '40000000-0000-0000-0000-000000000001', 'text', 4)$$,
  '42501', null, 'pupil cannot give themselves marks when saving an answer'
);
select throws_ok(
  $$update public.exam_answers set marks_awarded = 1 where pupil_id = '40000000-0000-0000-0000-000000000001'$$,
  '42501', null, 'pupil cannot change marks on their own answer'
);
select throws_ok(
  $$update public.exam_answers set borderline = false, approved_at = now() where pupil_id = '40000000-0000-0000-0000-000000000001'$$,
  '42501', null, 'pupil cannot change borderline or approval fields'
);
select throws_ok(
  $$update public.exam_attempts set score = 20 where pupil_id = '40000000-0000-0000-0000-000000000001'$$,
  '42501', null, 'pupil cannot set their own exam score'
);
select lives_ok(
  $$update public.exam_attempts set submitted_at = now(), auto_submitted = false
    where pupil_id = '40000000-0000-0000-0000-000000000001'$$,
  'pupil submits their exam'
);
select throws_ok(
  $$update public.exam_attempts set submitted_at = now() where pupil_id = '40000000-0000-0000-0000-000000000001'$$,
  '42501', null, 'pupil cannot submit the same exam twice'
);
select throws_ok(
  $$insert into public.exam_answers (attempt_id, item_id, pupil_id, answer)
    values ((select id from public.exam_attempts where pupil_id = '40000000-0000-0000-0000-000000000001'),
            '56000000-0000-0000-0000-000000000002', '40000000-0000-0000-0000-000000000001', 'late answer')$$,
  '42501', null, 'pupil cannot add an answer after submitting'
);
select throws_ok(
  $$update public.exam_answers set answer_option = 3 where pupil_id = '40000000-0000-0000-0000-000000000001'$$,
  '42501', null, 'pupil cannot change an answer after submitting'
);
select is(
  (select count(*)::int from public.get_exam_review(
     (select id from public.exam_attempts where pupil_id = '40000000-0000-0000-0000-000000000001'))),
  2, 'pupil gets the answer key for their own attempt after submitting'
);
select is(
  (select count(*)::int from public.get_exam_review('61000000-0000-0000-0000-000000000002')),
  0, 'pupil gets no answer key through another pupil''s submitted attempt'
);
select is_empty('select 1 from public.exam_item_keys', 'the key table itself stays closed after submitting');

-- Server-owned progress: verdicts come from the server, status follows them ----
-- "The server" here is the migration owner, which, like the service role used
-- by the edge functions, is not limited by RLS or column privileges.
reset role;
select lives_ok(
  $$update public.attempts set answer_verdict = 'no', reasoning_verdict = 'no', misconception_codes = '{1A-M1}'
    where pupil_id = '40000000-0000-0000-0000-000000000001' and try_number = 1$$,
  'server records a failing verdict on try 1'
);
select results_eq(
  $$select status::text, tries_used from public.segment_status
    where pupil_id = '40000000-0000-0000-0000-000000000001' and segment_id = '51000000-0000-0000-0000-000000000001'$$,
  $$values ('in_progress', 1)$$,
  'a failing verdict uses one try'
);
select lives_ok(
  $$insert into public.attempts (pupil_id, segment_id, try_number, answer, input_mode, answer_verdict, reasoning_verdict) values
      ('40000000-0000-0000-0000-000000000001', '51000000-0000-0000-0000-000000000001', 2, 'A answer', 'typed', 'yes', 'no'),
      ('40000000-0000-0000-0000-000000000001', '51000000-0000-0000-0000-000000000001', 3, 'A answer', 'tap', 'unsure', 'unsure')$$,
  'server records failing verdicts on tries 2 and 3'
);
select results_eq(
  $$select status::text, tries_used from public.segment_status
    where pupil_id = '40000000-0000-0000-0000-000000000001' and segment_id = '51000000-0000-0000-0000-000000000001'$$,
  $$values ('moved_on', 3)$$,
  'three failed tries move the pupil on'
);
select is(
  (select count(*)::int from public.flags where pupil_id = '40000000-0000-0000-0000-000000000001'
     and kind = 'stalled' and cleared_at is null),
  1, 'moving on raises one open stalled flag'
);
select lives_ok(
  $$insert into public.attempts (pupil_id, segment_id, try_number, answer, input_mode, answer_verdict, reasoning_verdict)
    values ('40000000-0000-0000-0000-000000000001', '51000000-0000-0000-0000-000000000001', 1, 'A answer', 'typed', 'no', 'yes')$$,
  'server records another failing verdict when the segment returns'
);
select results_eq(
  $$select status::text, tries_used from public.segment_status
    where pupil_id = '40000000-0000-0000-0000-000000000001' and segment_id = '51000000-0000-0000-0000-000000000001'$$,
  $$values ('moved_on', 3)$$,
  'failing again on a returned segment keeps it moved on, tries stay at 3'
);

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000b001","role":"authenticated"}', true);
select is_empty(
  $$update public.segment_status set status = 'complete'
    where pupil_id = '40000000-0000-0000-0000-000000000001' returning pupil_id$$,
  'pupil cannot mark a moved-on segment complete'
);
select is_empty(
  $$update public.flags set cleared_at = now() returning id$$,
  'pupil cannot clear their own stalled flag'
);
reset role;
select is(
  (select count(*)::int from public.flags where pupil_id = '40000000-0000-0000-0000-000000000001'
     and kind = 'stalled' and cleared_at is null),
  1, 'the stalled flag is still open after the pupil tried to clear it'
);
select lives_ok(
  $$insert into public.attempts (pupil_id, segment_id, try_number, answer, input_mode, answer_verdict, reasoning_verdict)
    values ('40000000-0000-0000-0000-000000000001', '51000000-0000-0000-0000-000000000001', 2, 'A answer', 'typed', 'yes', 'yes')$$,
  'server records a correct answer with sound reasoning'
);
select results_eq(
  $$select status::text from public.segment_status
    where pupil_id = '40000000-0000-0000-0000-000000000001' and segment_id = '51000000-0000-0000-0000-000000000001'$$,
  $$values ('complete')$$,
  'a yes and yes verdict completes the segment'
);
select is(
  (select count(*)::int from public.flags where pupil_id = '40000000-0000-0000-0000-000000000001'
     and kind = 'stalled' and cleared_at is not null),
  1, 'completing the segment clears the stalled flag'
);

-- Suspended pupil C -----------------------------------------------------------
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000b003","role":"authenticated"}', true);
select is_empty('select 1 from public.topics', 'a suspended pupil reads no content');
reset role;

-- Teacher of Basic 7A -----------------------------------------------------------
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000a002","role":"authenticated"}', true);
select results_eq('select distinct answer from public.attempts', $$values ('A answer')$$, 'teacher reads attempts for their own class only');
select is((select count(*)::int from public.flags), 2, 'teacher reads flags for their own class only');
select is_empty('select 1 from public.exam_item_keys', 'teacher cannot read the exam answer key');
select is_empty('select 1 from public.ai_calls', 'teacher cannot read the AI call log');
select is_empty($$update public.flags set note = 'x' returning id$$, 'teacher cannot change flags');
reset role;

-- Admin ---------------------------------------------------------------------------
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000a001","role":"authenticated"}', true);
select is(
  (select count(*)::int from public.exam_item_keys where item_id in
     ('56000000-0000-0000-0000-000000000001', '56000000-0000-0000-0000-000000000002')),
  2, 'admin reads the exam answer key'
);
select is(
  (select count(*)::int from public.ai_calls where pupil_id in
     ('40000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000002')),
  2, 'admin reads the AI call log'
);
select lives_ok(
  $$update public.exam_answers set marks_awarded = 1, borderline = false,
      approved_by = '10000000-0000-0000-0000-000000000001', approved_at = now()
    where pupil_id = '40000000-0000-0000-0000-000000000001'$$,
  'admin approves a mark'
);
select lives_ok(
  $$update public.flags set admin_action = 'content_fix', note = 'Video needs a clearer example'
    where pupil_id = '40000000-0000-0000-0000-000000000002'$$,
  'admin records a decision on a flag'
);
reset role;

select * from finish();
rollback;
