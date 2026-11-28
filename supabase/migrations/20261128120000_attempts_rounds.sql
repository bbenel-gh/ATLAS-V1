-- S20 (D-54): saving attempts, Relearn rounds (D-48) and the consent check on
-- lesson writes (BL-15).
--
--   1. Rounds: attempts.round, segment_status.round and round_done.
--      attempts.tap_answer and tap_reason keep the tap that decided an unsure
--      or unchecked side (FR-22 tie-break, rule 5 fallback).
--   2. check_results: what ai-check judged for an attempt id, kept for
--      save-attempt. Server only: no pupil or staff access.
--   3. Pupils no longer insert attempts at all. The save-attempt Edge Function
--      (service role) is the only writer: it checks the pupil and consent and
--      decides the verdicts on the server (D-29, BL-14).
--   4. BL-15: no consent, no lesson rows (overview answers, exam attempts,
--      exam answers), for the pupil's own inserts.
--   5. The tries rule in SQL gains rounds. KEEP IN STEP with src/domain/tries.ts.
--   6. start_segment_round: the pupil opens round 1, or the next round after
--      one ends (Relearn, return from Recommended). Status never goes down.

-- 1. Rounds -----------------------------------------------------------------------

alter table public.attempts
  add column round integer not null default 1 check (round >= 1),
  add column tap_answer text check (char_length(tap_answer) <= 600),
  add column tap_reason text check (char_length(tap_reason) <= 600);

alter table public.segment_status
  add column round integer not null default 1 check (round >= 1),
  add column round_done boolean not null default false;

update public.segment_status set round_done = (status = 'complete' or tries_used >= 3);

create index attempts_pupil_segment_round_idx on public.attempts (pupil_id, segment_id, round);

-- 2. check_results ----------------------------------------------------------------
-- attempt_id is the id made on the phone; the attempt row may not exist yet.

create table public.check_results (
  id bigint generated always as identity primary key,
  attempt_id uuid not null,
  pupil_id uuid not null references public.pupils (id) on delete cascade,
  check_item_id uuid not null references public.check_items (id) on delete cascade,
  answer_text text not null check (char_length(answer_text) <= 600),
  answer_mode text not null check (answer_mode in ('typing', 'tap')),
  reason_text text not null check (char_length(reason_text) <= 600),
  reason_mode text not null check (reason_mode in ('typing', 'tap')),
  result jsonb not null,
  flag_id uuid references public.flags (id) on delete set null,
  created_at timestamptz not null default now()
);
alter table public.check_results enable row level security;
revoke all on public.check_results from anon, authenticated;
create index check_results_attempt_idx on public.check_results (attempt_id, created_at desc);
create index check_results_pupil_id_idx on public.check_results (pupil_id);
create index check_results_check_item_id_idx on public.check_results (check_item_id);
create index check_results_flag_id_idx on public.check_results (flag_id);

-- 3. Attempts: written by save-attempt only ---------------------------------------

drop policy attempts_insert on public.attempts;
revoke insert on public.attempts from authenticated;

-- 4. BL-15: consent before lesson rows --------------------------------------------

create function public.has_consent(p_pupil_id uuid)
returns boolean language sql stable security definer set search_path = ''
as $$
  select exists (select 1 from public.consents c where c.pupil_id = p_pupil_id and c.withdrawn_at is null)
$$;
revoke all on function public.has_consent(uuid) from public, anon, authenticated;
grant execute on function public.has_consent(uuid) to authenticated, service_role;

drop policy overview_responses_insert on public.overview_responses;
create policy overview_responses_insert on public.overview_responses for insert to authenticated
  with check (pupil_id = (select public.current_pupil_id()) and public.has_consent(pupil_id));

drop policy exam_attempts_insert on public.exam_attempts;
create policy exam_attempts_insert on public.exam_attempts for insert to authenticated
  with check (pupil_id = (select public.current_pupil_id()) and public.has_consent(pupil_id));

drop policy exam_answers_insert on public.exam_answers;
create policy exam_answers_insert on public.exam_answers for insert to authenticated
  with check (pupil_id = (select public.current_pupil_id()) and public.can_answer_exam_item(attempt_id, item_id)
              and public.has_consent(pupil_id));

-- 5. The tries rule with rounds ---------------------------------------------------
-- Any attempt: in progress if not started, version shown added to versions_seen.
-- Verdicts first set (both): the attempt must be in the open round.
--   yes and yes: complete, round done.
--   otherwise: one try in this round; at 3 the round is done; in progress
--   becomes moved on (segment_status_sync_stalled_flag raises the flag); a
--   moved-on segment gets a note on its open stalled flag (FR-26a); a complete
--   one stays complete. Status never goes down.

create or replace function public.attempts_sync_segment_status()
returns trigger language plpgsql security definer set search_path = ''
as $$
declare
  v_final_now boolean := new.answer_verdict is not null and new.reasoning_verdict is not null;
  v_final_before boolean := tg_op = 'UPDATE'
    and old.answer_verdict is not null and old.reasoning_verdict is not null;
  v_s public.segment_status;
  v_tries integer;
begin
  insert into public.segment_status as s (pupil_id, segment_id, status, versions_seen, round)
  values (
    new.pupil_id, new.segment_id, 'in_progress',
    case when new.video_version_id is null then '{}'::uuid[] else array[new.video_version_id] end,
    new.round
  )
  on conflict (pupil_id, segment_id) do update set
    status = case when s.status = 'not_started' then 'in_progress'::public.segment_state else s.status end,
    versions_seen = case
      when new.video_version_id is null or new.video_version_id = any (s.versions_seen) then s.versions_seen
      else s.versions_seen || new.video_version_id
    end;

  if v_final_now and not v_final_before then
    select * into v_s from public.segment_status s
    where s.pupil_id = new.pupil_id and s.segment_id = new.segment_id
    for update;

    if new.round <> v_s.round or v_s.round_done then
      raise exception 'This attempt is not in the open round' using errcode = '22023';
    end if;

    if new.answer_verdict = 'yes' and new.reasoning_verdict = 'yes' then
      update public.segment_status s set status = 'complete', round_done = true
      where s.pupil_id = new.pupil_id and s.segment_id = new.segment_id;
    else
      v_tries := least(3, v_s.tries_used + 1);
      update public.segment_status s set
        tries_used = v_tries,
        round_done = v_tries >= 3,
        status = case
          when v_tries >= 3 and s.status in ('not_started', 'in_progress') then 'moved_on'::public.segment_state
          else s.status
        end
      where s.pupil_id = new.pupil_id and s.segment_id = new.segment_id;

      if v_tries >= 3 and v_s.status = 'moved_on' then
        update public.flags f set note = left(concat_ws(E'\n', f.note,
            format('Round %s ended after 3 tries on %s.', new.round, to_char(now(), 'YYYY-MM-DD'))), 2000)
        where f.pupil_id = new.pupil_id and f.segment_id = new.segment_id
          and f.kind = 'stalled' and f.cleared_at is null;
      end if;
    end if;
  end if;

  return new;
end;
$$;
revoke all on function public.attempts_sync_segment_status() from public, anon, authenticated;

-- 6. Rounds are opened by the server for the signed-in pupil -----------------------
-- Same round again: nothing changes (a resend from the phone queue).

create function public.start_segment_round(p_segment_id uuid, p_round integer)
returns integer language plpgsql security definer set search_path = ''
as $$
declare
  v_pupil uuid := public.current_pupil_id();
  v_s public.segment_status;
begin
  if v_pupil is null or not public.has_consent(v_pupil) then
    raise exception 'Not allowed' using errcode = '42501';
  end if;

  select * into v_s from public.segment_status s
  where s.pupil_id = v_pupil and s.segment_id = p_segment_id
  for update;

  if not found then
    if p_round <> 1 then
      raise exception 'That round cannot start now' using errcode = '22023';
    end if;
    insert into public.segment_status (pupil_id, segment_id, status, round)
    values (v_pupil, p_segment_id, 'in_progress', 1);
    return 1;
  end if;

  if p_round = v_s.round then
    if v_s.status = 'not_started' then
      update public.segment_status s set status = 'in_progress'
      where s.pupil_id = v_pupil and s.segment_id = p_segment_id;
    end if;
    return v_s.round;
  end if;

  if p_round = v_s.round + 1 and v_s.round_done then
    update public.segment_status s set round = p_round, tries_used = 0, round_done = false
    where s.pupil_id = v_pupil and s.segment_id = p_segment_id;
    return p_round;
  end if;

  raise exception 'That round cannot start now' using errcode = '22023';
end;
$$;
revoke all on function public.start_segment_round(uuid, integer) from public, anon, authenticated;
grant execute on function public.start_segment_round(uuid, integer) to authenticated;

-- 7. What save-attempt, raise-flag and ai-check may read and write ---------------
-- Same approach as 20261128090000_ai_check_grants.sql: columns the functions need.

grant select (id, segment_id, label) on public.video_versions to service_role;
grant select (pupil_id, segment_id, status, tries_used, round, round_done) on public.segment_status to service_role;

grant select (id, pupil_id, segment_id, round, try_number, answer_verdict, reasoning_verdict, misconception_codes)
  on public.attempts to service_role;
grant insert (id, pupil_id, segment_id, round, try_number, video_version_id, check_item_id, answer, input_mode,
              reason, reason_input_mode, sure, time_taken_ms, changed_answer, answer_verdict, reasoning_verdict,
              misconception_codes, read_back, read_back_confirmed, ai_fallback, tap_answer, tap_reason,
              client_created_at)
  on public.attempts to service_role;

grant select (id, attempt_id, pupil_id, check_item_id, answer_text, answer_mode, reason_text, reason_mode, result, flag_id, created_at)
  on public.check_results to service_role;
grant insert (attempt_id, pupil_id, check_item_id, answer_text, answer_mode, reason_text, reason_mode, result, flag_id)
  on public.check_results to service_role;

-- Flags: the id back from an insert, the open-flag lookup, linking a
-- safeguarding flag to its attempt, and the attempt on a borderline flag.
grant select (id, pupil_id, kind, segment_id, attempt_id, cleared_at) on public.flags to service_role;
grant insert (attempt_id) on public.flags to service_role;
grant update (attempt_id) on public.flags to service_role;
