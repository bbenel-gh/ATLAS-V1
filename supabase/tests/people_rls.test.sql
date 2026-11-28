-- S05: Row Level Security for the people tables.
-- Run: npx supabase test db --remote   (atlas-dev only, CLAUDE.md rule 15)
-- Everything runs in one transaction and is rolled back, so no test row stays.

begin;
create extension if not exists pgtap with schema extensions;
select plan(32);

-- Fixtures, created as the migration owner (bypasses RLS) -------------------
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-00000000a001', 'admin@test.atlas.invalid'),
  ('00000000-0000-0000-0000-00000000a002', 'teacher@test.atlas.invalid'),
  ('00000000-0000-0000-0000-00000000a003', 'teacher2@test.atlas.invalid'),
  ('00000000-0000-0000-0000-00000000b001', 'pupil-a@test.atlas.invalid'),
  ('00000000-0000-0000-0000-00000000b002', 'pupil-b@test.atlas.invalid'),
  ('00000000-0000-0000-0000-00000000b003', 'pupil-c@test.atlas.invalid');

insert into public.staff (id, user_id, display_name, role) values
  ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-00000000a001', 'Test Admin', 'admin'),
  ('10000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-00000000a002', 'Test Teacher', 'teacher'),
  ('10000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-00000000a003', 'Other Teacher', 'teacher');

insert into public.schools (id, name, added_by) values
  ('20000000-0000-0000-0000-000000000001', 'Test School', '10000000-0000-0000-0000-000000000001');

insert into public.classes (id, name, level, school_id, teacher_id, join_code) values
  ('30000000-0000-0000-0000-000000000001', 'Basic 7A', 'Basic 7', '20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000002', 'TSTA7A'),
  ('30000000-0000-0000-0000-000000000002', 'Basic 7B', 'Basic 7', '20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000003', 'TSTB7B');

insert into public.pupils (id, user_id, class_id, display_name, school_given, class_level, code, pin_hash, signed_up_by, status) values
  ('40000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-00000000b001', '30000000-0000-0000-0000-000000000001', 'Pupil A', 'Test School', 'Basic 7', 'TSTAAA', 'hash-a', 'admin', 'active'),
  ('40000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-00000000b002', '30000000-0000-0000-0000-000000000002', 'Pupil B', 'Test School', 'Basic 7', 'TSTBBB', 'hash-b', 'self', 'active'),
  ('40000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-00000000b003', null, 'Pupil C', 'Another School', 'Basic 7', 'TSTCCC', 'hash-c', 'self', 'suspended');

insert into public.profiles (pupil_id, interests) values
  ('40000000-0000-0000-0000-000000000001', '{football}'),
  ('40000000-0000-0000-0000-000000000002', '{music}');

insert into public.consents (pupil_id, method, recorded_by, form_ref) values
  ('40000000-0000-0000-0000-000000000001', 'paper', '10000000-0000-0000-0000-000000000001', 'FORM-1');

-- Structure ------------------------------------------------------------------
select ok(
  (select bool_and(c.relrowsecurity) from pg_class c join pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'public' and c.relname in ('schools','staff','classes','pupils','profiles','consents','app_settings')),
  'RLS is enabled on all seven people tables'
);
select is(
  (select count(*)::int from pg_class c join pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'public' and c.relname in ('schools','staff','classes','pupils','profiles','consents','app_settings')),
  7, 'all seven people tables exist'
);
select is((select public_signup_enabled from public.app_settings), false, 'public sign-up starts switched off');

-- Anon: no table access at all -------------------------------------------------
set local role anon;
select throws_ok('select 1 from public.pupils', '42501', null, 'anon cannot read pupils');
select throws_ok('select 1 from public.schools', '42501', null, 'anon cannot read schools');
select throws_ok('select 1 from public.app_settings', '42501', null, 'anon cannot read app_settings');
select is(public.public_signup_enabled(), false, 'anon can ask whether public sign-up is on');
reset role;

-- Pupil A -----------------------------------------------------------------------
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000b001","role":"authenticated"}', true);

select results_eq('select display_name from public.pupils', $$values ('Pupil A')$$, 'pupil reads only their own pupils row');
select throws_ok('select pin_hash from public.pupils', '42501', null, 'pupil cannot read pin_hash');
select throws_ok('select failed_pin_count from public.pupils', '42501', null, 'pupil cannot read failed_pin_count');
select throws_ok('select locked_until from public.pupils', '42501', null, 'pupil cannot read locked_until');
select lives_ok(
  $$update public.pupils set ai_notice_seen_at = now() where id = '40000000-0000-0000-0000-000000000001'$$,
  'pupil can record that they saw the AI notice'
);
select throws_ok(
  $$update public.pupils set display_name = 'Changed' where id = '40000000-0000-0000-0000-000000000001'$$,
  '42501', null, 'pupil cannot change their own display name directly'
);
select throws_ok(
  $$update public.pupils set status = 'active', class_id = null where id = '40000000-0000-0000-0000-000000000001'$$,
  '42501', null, 'pupil cannot change their own status or class'
);
select results_eq('select interests from public.profiles', $$values ('{football}'::text[])$$, 'pupil reads only their own profile');
select lives_ok(
  $$update public.profiles set interests = '{football,cooking}' where pupil_id = '40000000-0000-0000-0000-000000000001'$$,
  'pupil can update their own profile'
);
select results_eq('select name from public.classes', $$values ('Basic 7A')$$, 'pupil reads only their own class');
select is_empty('select 1 from public.staff', 'pupil reads no staff rows');
select is_empty('select 1 from public.app_settings', 'pupil reads no app settings');
select lives_ok(
  $$insert into public.consents (pupil_id, method) values ('40000000-0000-0000-0000-000000000001', 'in_app')$$,
  'pupil can record in-app guardian consent for themselves'
);
select throws_ok(
  $$insert into public.consents (pupil_id, method) values ('40000000-0000-0000-0000-000000000002', 'in_app')$$,
  '42501', null, 'pupil cannot record consent for another pupil'
);
select throws_ok(
  $$insert into public.consents (pupil_id, method, recorded_by) values ('40000000-0000-0000-0000-000000000001', 'paper', '10000000-0000-0000-0000-000000000001')$$,
  '42501', null, 'pupil cannot record a paper consent'
);
reset role;

-- Suspended pupil C sees nothing --------------------------------------------------
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000b003","role":"authenticated"}', true);
select is_empty('select 1 from public.pupils', 'a suspended pupil reads no pupil rows');
reset role;

-- Teacher of Basic 7A -------------------------------------------------------------
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000a002","role":"authenticated"}', true);
select results_eq('select display_name from public.pupils', $$values ('Pupil A')$$, 'teacher reads only pupils in their own class');
select results_eq('select interests from public.profiles', $$values ('{football,cooking}'::text[])$$, 'teacher reads profiles in their own class only');
select is((select count(*)::int from public.consents), 2, 'teacher reads consents for their own class only');
select throws_ok('select pin_hash from public.pupils', '42501', null, 'teacher cannot read pin_hash');
select is_empty(
  $$update public.pupils set class_level = 'Basic 8' returning id$$,
  'teacher cannot update pupils'
);
reset role;

-- Admin ----------------------------------------------------------------------------
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000a001","role":"authenticated"}', true);
select is((select count(*)::int from public.pupils where code like 'TST%'), 3, 'admin reads every pupil');
select lives_ok(
  $$update public.pupils set status = 'active' where id = '40000000-0000-0000-0000-000000000003'$$,
  'admin can reactivate a suspended pupil'
);
select lives_ok(
  $$update public.app_settings set global_daily_ai_cap = 500$$,
  'admin can change app settings'
);
select lives_ok(
  $$insert into public.schools (name, added_by) values ('Second Test School', '10000000-0000-0000-0000-000000000001')$$,
  'admin can add a school'
);
reset role;

select * from finish();
rollback;
