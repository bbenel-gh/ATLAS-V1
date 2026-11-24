-- S06 part 2: learning, exam, mastery, flags and the AI call log.
-- overview_responses, segment_status, attempts, exam_attempts, exam_answers,
-- mastery, flags, ai_calls.
--
-- Pupil data tables: a pupil reads their own rows, a teacher their own class,
-- an admin everything (CLAUDE.md rule 8).
-- A pupil can never write marks, borderline, approval fields, scores or flags.
-- flags and ai_calls: no pupil access at all. Only the service role inserts
-- ai_calls.
--
-- Guard triggers are security invoker, so current_user is the caller's role
-- (the S05 lesson, 20261124200000_fix_pupils_guard.sql).

-- Types -------------------------------------------------------------------------

create type public.input_mode as enum ('typed', 'tap', 'handwriting');
create type public.ai_verdict as enum ('yes', 'no', 'unsure');
create type public.segment_state as enum ('not_started', 'in_progress', 'complete', 'moved_on');
create type public.exam_attempt_status as enum ('in_progress', 'submitted', 'marked');
create type public.mastery_status as enum ('achieved', 'confirmed', 'revision');
create type public.recheck_result as enum ('pass', 'miss');
create type public.flag_kind as enum ('stalled', 'borderline', 'safeguarding');
create type public.flag_action as enum ('content_fix', 'human_help');
create type public.ai_job as enum ('overview', 'check', 'mark_theory', 'read_handwriting');

-- Tables ------------------------------------------------------------------------

-- Raw overview answers (FR-11 to FR-13). ai_result is written by the
-- ai-overview edge function only.
create table public.overview_responses (
  id uuid primary key default gen_random_uuid(),
  pupil_id uuid not null references public.pupils (id) on delete cascade,
  topic_id uuid not null references public.topics (id) on delete cascade,
  summary_text text check (char_length(summary_text) <= 2000),
  confusing_text text check (char_length(confusing_text) <= 2000),
  skipped boolean not null default false,
  ai_result jsonb,
  client_created_at timestamptz,
  created_at timestamptz not null default now()
);
alter table public.overview_responses enable row level security;

-- One row per pupil and segment. versions_seen holds video_versions ids.
create table public.segment_status (
  pupil_id uuid not null references public.pupils (id) on delete cascade,
  segment_id uuid not null references public.segments (id) on delete cascade,
  status public.segment_state not null default 'not_started',
  tries_used integer not null default 0 check (tries_used between 0 and 3),
  versions_seen uuid[] not null default '{}',
  updated_at timestamptz not null default now(),
  primary key (pupil_id, segment_id)
);
alter table public.segment_status enable row level security;

-- Every field in specs/prd.md FR-23. Saved once, never changed by a pupil.
create table public.attempts (
  id uuid primary key default gen_random_uuid(),
  pupil_id uuid not null references public.pupils (id) on delete cascade,
  segment_id uuid not null references public.segments (id) on delete cascade,
  try_number integer not null check (try_number between 1 and 3),
  video_version_id uuid references public.video_versions (id) on delete set null,
  check_item_id uuid references public.check_items (id) on delete set null,
  answer text check (char_length(answer) <= 2000),
  input_mode public.input_mode not null,
  reason text check (char_length(reason) <= 2000),
  reason_input_mode public.input_mode,
  sure boolean,
  time_taken_ms integer check (time_taken_ms >= 0),
  changed_answer boolean not null default false,
  answer_verdict public.ai_verdict,
  reasoning_verdict public.ai_verdict,
  misconception_codes text[] not null default '{}',
  read_back text check (char_length(read_back) <= 600),
  read_back_confirmed boolean,
  ai_fallback boolean not null default false,
  client_created_at timestamptz,
  created_at timestamptz not null default now()
);
alter table public.attempts enable row level security;

-- started_at is always the server time and duration is copied from the paper
-- by a trigger, so the timer cannot be wound back from the phone (FR-29).
create table public.exam_attempts (
  id uuid primary key default gen_random_uuid(),
  pupil_id uuid not null references public.pupils (id) on delete cascade,
  paper_id uuid not null references public.exam_papers (id) on delete restrict,
  started_at timestamptz not null default now(),
  duration_seconds integer not null default 0 check (duration_seconds >= 0),
  submitted_at timestamptz,
  auto_submitted boolean not null default false,
  score numeric(6, 2) check (score >= 0),
  max_score numeric(6, 2) check (max_score >= 0),
  status public.exam_attempt_status not null default 'in_progress',
  created_at timestamptz not null default now()
);
alter table public.exam_attempts enable row level security;

create table public.exam_answers (
  id uuid primary key default gen_random_uuid(),
  attempt_id uuid not null references public.exam_attempts (id) on delete cascade,
  item_id uuid not null references public.exam_items (id) on delete restrict,
  pupil_id uuid not null references public.pupils (id) on delete cascade,
  answer text check (char_length(answer) <= 4000),
  answer_option integer check (answer_option >= 0),
  marks_awarded numeric(5, 2) check (marks_awarded >= 0),
  borderline boolean not null default false,
  ai_notes jsonb,
  approved_by uuid references public.staff (id) on delete set null,
  approved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (attempt_id, item_id)
);
alter table public.exam_answers enable row level security;

create table public.mastery (
  id uuid primary key default gen_random_uuid(),
  pupil_id uuid not null references public.pupils (id) on delete cascade,
  topic_id uuid not null references public.topics (id) on delete cascade,
  exam_attempt_id uuid references public.exam_attempts (id) on delete set null,
  status public.mastery_status not null,
  exam_score numeric(5, 2) check (exam_score between 0 and 100),
  achieved_at timestamptz,
  recheck_due_at timestamptz,
  recheck_result public.recheck_result,
  recheck_done_at timestamptz,
  missed_segment_ids uuid[] not null default '{}',
  updated_at timestamptz not null default now(),
  unique (pupil_id, topic_id)
);
alter table public.mastery enable row level security;

create table public.flags (
  id uuid primary key default gen_random_uuid(),
  pupil_id uuid not null references public.pupils (id) on delete cascade,
  kind public.flag_kind not null,
  segment_id uuid references public.segments (id) on delete set null,
  attempt_id uuid references public.attempts (id) on delete set null,
  exam_answer_id uuid references public.exam_answers (id) on delete set null,
  admin_action public.flag_action,
  note text check (char_length(note) <= 2000),
  decided_by uuid references public.staff (id) on delete set null,
  decided_at timestamptz,
  created_at timestamptz not null default now(),
  cleared_at timestamptz
);
alter table public.flags enable row level security;

-- Deleted with the pupil, because input holds the pupil's own words.
create table public.ai_calls (
  id bigint generated always as identity primary key,
  job public.ai_job not null,
  model text not null check (char_length(model) between 1 and 80),
  pupil_id uuid references public.pupils (id) on delete cascade,
  input jsonb,
  output jsonb,
  ok boolean not null,
  latency_ms integer check (latency_ms >= 0),
  created_at timestamptz not null default now()
);
alter table public.ai_calls enable row level security;

-- Indexes -------------------------------------------------------------------------
-- Every foreign key, plus (pupil_id, segment_id) and the daily AI cap lookup.

create index overview_responses_pupil_id_idx on public.overview_responses (pupil_id);
create index overview_responses_topic_id_idx on public.overview_responses (topic_id);
create index segment_status_segment_id_idx on public.segment_status (segment_id);
create index attempts_pupil_segment_idx on public.attempts (pupil_id, segment_id);
create index attempts_segment_id_idx on public.attempts (segment_id);
create index attempts_video_version_id_idx on public.attempts (video_version_id);
create index attempts_check_item_id_idx on public.attempts (check_item_id);
create index exam_attempts_pupil_id_idx on public.exam_attempts (pupil_id);
create index exam_attempts_paper_id_idx on public.exam_attempts (paper_id);
-- At most one open sitting per pupil.
create unique index exam_attempts_one_open_idx on public.exam_attempts (pupil_id) where submitted_at is null;
create index exam_answers_item_id_idx on public.exam_answers (item_id);
create index exam_answers_pupil_id_idx on public.exam_answers (pupil_id);
create index exam_answers_approved_by_idx on public.exam_answers (approved_by);
create index mastery_topic_id_idx on public.mastery (topic_id);
create index mastery_exam_attempt_id_idx on public.mastery (exam_attempt_id);
create index flags_pupil_id_idx on public.flags (pupil_id);
create index flags_segment_id_idx on public.flags (segment_id);
create index flags_attempt_id_idx on public.flags (attempt_id);
create index flags_exam_answer_id_idx on public.flags (exam_answer_id);
create index flags_decided_by_idx on public.flags (decided_by);
create index flags_open_kind_idx on public.flags (kind, created_at desc) where cleared_at is null;
create index ai_calls_pupil_created_idx on public.ai_calls (pupil_id, created_at);
create index ai_calls_created_at_idx on public.ai_calls (created_at);

-- Helpers -------------------------------------------------------------------------

-- True when the item belongs to the caller's own exam attempt and that attempt
-- is not yet submitted. Security definer because pupils cannot read exam_items.
create function public.can_answer_exam_item(p_attempt_id uuid, p_item_id uuid)
returns boolean language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1
    from public.exam_attempts a
    join public.exam_items i on i.paper_id = a.paper_id
    where a.id = p_attempt_id
      and i.id = p_item_id
      and a.pupil_id = public.current_pupil_id()
      and a.submitted_at is null
  )
$$;
revoke all on function public.can_answer_exam_item(uuid, uuid) from public, anon, authenticated;
grant execute on function public.can_answer_exam_item(uuid, uuid) to authenticated;

-- The questions of the caller's own attempt, with no answer key.
create function public.get_exam_items(p_attempt_id uuid)
returns table (
  id uuid,
  kind public.exam_item_kind,
  sort_order integer,
  question text,
  options jsonb,
  marks integer
)
language sql stable security definer set search_path = ''
as $$
  select i.id, i.kind, i.sort_order, i.question, i.options, i.marks
  from public.exam_attempts a
  join public.exam_items i on i.paper_id = a.paper_id
  where a.id = p_attempt_id
    and a.pupil_id = public.current_pupil_id()
  order by i.sort_order
$$;
revoke all on function public.get_exam_items(uuid) from public, anon, authenticated;
grant execute on function public.get_exam_items(uuid) to authenticated;

-- The answer key for the caller's own attempt, only after it is submitted.
create function public.get_exam_review(p_attempt_id uuid)
returns table (
  item_id uuid,
  correct_option integer,
  scheme_points jsonb,
  suggested_answer text
)
language sql stable security definer set search_path = ''
as $$
  select k.item_id, k.correct_option, k.scheme_points, k.suggested_answer
  from public.exam_attempts a
  join public.exam_items i on i.paper_id = a.paper_id
  join public.exam_item_keys k on k.item_id = i.id
  where a.id = p_attempt_id
    and a.pupil_id = public.current_pupil_id()
    and a.submitted_at is not null
  order by i.sort_order
$$;
revoke all on function public.get_exam_review(uuid) from public, anon, authenticated;
grant execute on function public.get_exam_review(uuid) to authenticated;

-- Triggers ----------------------------------------------------------------------

-- Duration always comes from the paper, never from the phone.
create function public.exam_attempts_set_duration()
returns trigger language plpgsql security invoker set search_path = ''
as $$
begin
  select p.duration_minutes * 60 into new.duration_seconds
  from public.exam_papers p where p.id = new.paper_id;
  return new;
end;
$$;
revoke all on function public.exam_attempts_set_duration() from public, anon, authenticated;

create trigger exam_attempts_set_duration
  before insert on public.exam_attempts
  for each row execute function public.exam_attempts_set_duration();

-- A pupil may only submit, once. submitted_at becomes the server time and the
-- status becomes submitted. Nothing else may change.
create function public.exam_attempts_guard_pupil_update()
returns trigger language plpgsql security invoker set search_path = ''
as $$
begin
  if current_user = 'authenticated' and not public.is_admin() then
    if old.submitted_at is not null or new.submitted_at is null then
      raise exception 'An exam can be submitted once and not changed after'
        using errcode = '42501';
    end if;
    if (to_jsonb(new) - 'submitted_at' - 'auto_submitted' - 'status')
       is distinct from (to_jsonb(old) - 'submitted_at' - 'auto_submitted' - 'status') then
      raise exception 'A pupil may only submit their exam'
        using errcode = '42501';
    end if;
    new.submitted_at := now();
    new.status := 'submitted';
  end if;
  return new;
end;
$$;
revoke all on function public.exam_attempts_guard_pupil_update() from public, anon, authenticated;

create trigger exam_attempts_guard_pupil_update
  before update on public.exam_attempts
  for each row execute function public.exam_attempts_guard_pupil_update();

-- A pupil may change only their answer, and only while the attempt is open.
create function public.exam_answers_guard_pupil_update()
returns trigger language plpgsql security invoker set search_path = ''
as $$
begin
  if current_user = 'authenticated' and not public.is_admin() then
    if (to_jsonb(new) - 'answer' - 'answer_option' - 'updated_at')
       is distinct from (to_jsonb(old) - 'answer' - 'answer_option' - 'updated_at') then
      raise exception 'A pupil may only change their answer'
        using errcode = '42501';
    end if;
    if not public.can_answer_exam_item(new.attempt_id, new.item_id) then
      raise exception 'This exam is already submitted'
        using errcode = '42501';
    end if;
  end if;
  new.updated_at := now();
  return new;
end;
$$;
revoke all on function public.exam_answers_guard_pupil_update() from public, anon, authenticated;

create trigger exam_answers_guard_pupil_update
  before update on public.exam_answers
  for each row execute function public.exam_answers_guard_pupil_update();

-- Moving on after 3 failed tries raises a stalled flag (FR-25). Completing the
-- segment later clears it (FR-26). Security definer because pupils cannot
-- write flags.
create function public.segment_status_sync_stalled_flag()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  if new.status = 'moved_on' and (tg_op = 'INSERT' or old.status is distinct from 'moved_on') then
    if not exists (
      select 1 from public.flags f
      where f.pupil_id = new.pupil_id and f.segment_id = new.segment_id
        and f.kind = 'stalled' and f.cleared_at is null
    ) then
      insert into public.flags (pupil_id, kind, segment_id)
      values (new.pupil_id, 'stalled', new.segment_id);
    end if;
  elsif new.status = 'complete' then
    update public.flags f set cleared_at = now()
    where f.pupil_id = new.pupil_id and f.segment_id = new.segment_id
      and f.kind = 'stalled' and f.cleared_at is null;
  end if;
  return new;
end;
$$;
revoke all on function public.segment_status_sync_stalled_flag() from public, anon, authenticated;

create trigger segment_status_sync_stalled_flag
  after insert or update on public.segment_status
  for each row execute function public.segment_status_sync_stalled_flag();

create trigger segment_status_set_updated_at
  before update on public.segment_status
  for each row execute function public.set_updated_at();

create trigger mastery_set_updated_at
  before update on public.mastery
  for each row execute function public.set_updated_at();

-- Privileges ----------------------------------------------------------------------

revoke all on public.overview_responses, public.segment_status, public.attempts,
  public.exam_attempts, public.exam_answers, public.mastery, public.flags,
  public.ai_calls from anon, authenticated;

grant select, delete on public.overview_responses to authenticated;
grant insert (pupil_id, topic_id, summary_text, confusing_text, skipped, client_created_at)
  on public.overview_responses to authenticated;

grant select, insert, update, delete on public.segment_status to authenticated;

grant select, delete on public.attempts to authenticated;
grant insert (pupil_id, segment_id, try_number, video_version_id, check_item_id, answer, input_mode,
              reason, reason_input_mode, sure, time_taken_ms, changed_answer, answer_verdict,
              reasoning_verdict, misconception_codes, read_back, read_back_confirmed, ai_fallback,
              client_created_at)
  on public.attempts to authenticated;

grant select, delete on public.exam_attempts to authenticated;
grant insert (pupil_id, paper_id) on public.exam_attempts to authenticated;
grant update (submitted_at, auto_submitted, score, max_score, status) on public.exam_attempts to authenticated;

grant select, delete on public.exam_answers to authenticated;
grant insert (attempt_id, item_id, pupil_id, answer, answer_option) on public.exam_answers to authenticated;
grant update (answer, answer_option, marks_awarded, borderline, ai_notes, approved_by, approved_at)
  on public.exam_answers to authenticated;

grant select, insert, update, delete on public.mastery to authenticated;
grant select, insert, update, delete on public.flags to authenticated;

-- ai_calls: read by admins; written only by the service role.
grant select on public.ai_calls to authenticated;

-- Policies ------------------------------------------------------------------------

-- overview_responses
create policy overview_responses_select on public.overview_responses for select to authenticated
  using (pupil_id = (select public.current_pupil_id()) or (select public.is_admin()) or public.is_teacher_of_pupil(pupil_id));
create policy overview_responses_insert on public.overview_responses for insert to authenticated
  with check (pupil_id = (select public.current_pupil_id()));
create policy overview_responses_admin_delete on public.overview_responses for delete to authenticated
  using ((select public.is_admin()));

-- segment_status: the pupil keeps their own progress up to date.
create policy segment_status_select on public.segment_status for select to authenticated
  using (pupil_id = (select public.current_pupil_id()) or (select public.is_admin()) or public.is_teacher_of_pupil(pupil_id));
create policy segment_status_insert on public.segment_status for insert to authenticated
  with check (pupil_id = (select public.current_pupil_id()) or (select public.is_admin()));
create policy segment_status_update on public.segment_status for update to authenticated
  using (pupil_id = (select public.current_pupil_id()) or (select public.is_admin()))
  with check (pupil_id = (select public.current_pupil_id()) or (select public.is_admin()));
create policy segment_status_admin_delete on public.segment_status for delete to authenticated
  using ((select public.is_admin()));

-- attempts: insert only, no updates.
create policy attempts_select on public.attempts for select to authenticated
  using (pupil_id = (select public.current_pupil_id()) or (select public.is_admin()) or public.is_teacher_of_pupil(pupil_id));
create policy attempts_insert on public.attempts for insert to authenticated
  with check (pupil_id = (select public.current_pupil_id()));
create policy attempts_admin_delete on public.attempts for delete to authenticated
  using ((select public.is_admin()));

-- exam_attempts
create policy exam_attempts_select on public.exam_attempts for select to authenticated
  using (pupil_id = (select public.current_pupil_id()) or (select public.is_admin()) or public.is_teacher_of_pupil(pupil_id));
create policy exam_attempts_insert on public.exam_attempts for insert to authenticated
  with check (pupil_id = (select public.current_pupil_id()));
create policy exam_attempts_update on public.exam_attempts for update to authenticated
  using (pupil_id = (select public.current_pupil_id()) or (select public.is_admin()))
  with check (pupil_id = (select public.current_pupil_id()) or (select public.is_admin()));
create policy exam_attempts_admin_delete on public.exam_attempts for delete to authenticated
  using ((select public.is_admin()));

-- exam_answers
create policy exam_answers_select on public.exam_answers for select to authenticated
  using (pupil_id = (select public.current_pupil_id()) or (select public.is_admin()) or public.is_teacher_of_pupil(pupil_id));
create policy exam_answers_insert on public.exam_answers for insert to authenticated
  with check (pupil_id = (select public.current_pupil_id()) and public.can_answer_exam_item(attempt_id, item_id));
create policy exam_answers_update on public.exam_answers for update to authenticated
  using (pupil_id = (select public.current_pupil_id()) or (select public.is_admin()))
  with check (pupil_id = (select public.current_pupil_id()) or (select public.is_admin()));
create policy exam_answers_admin_delete on public.exam_answers for delete to authenticated
  using ((select public.is_admin()));

-- mastery: pupils read only. Written by admins and the service role.
create policy mastery_select on public.mastery for select to authenticated
  using (pupil_id = (select public.current_pupil_id()) or (select public.is_admin()) or public.is_teacher_of_pupil(pupil_id));
create policy mastery_admin_insert on public.mastery for insert to authenticated
  with check ((select public.is_admin()));
create policy mastery_admin_update on public.mastery for update to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));
create policy mastery_admin_delete on public.mastery for delete to authenticated
  using ((select public.is_admin()));

-- flags: no pupil access. Teachers read their own class. Admins everything.
create policy flags_select on public.flags for select to authenticated
  using ((select public.is_admin()) or public.is_teacher_of_pupil(pupil_id));
create policy flags_admin_insert on public.flags for insert to authenticated
  with check ((select public.is_admin()));
create policy flags_admin_update on public.flags for update to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));
create policy flags_admin_delete on public.flags for delete to authenticated
  using ((select public.is_admin()));

-- ai_calls: admins read. No insert, update or delete grant for authenticated.
create policy ai_calls_admin_select on public.ai_calls for select to authenticated
  using ((select public.is_admin()));
