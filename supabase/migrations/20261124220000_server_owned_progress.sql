-- S06 addendum: progress is owned by the server (D-29).
--
-- Before this, a pupil could write their own segment_status and the AI verdicts
-- on their own attempts. Going around the app, they could unlock the exam early
-- or clear their own stalled flag (breaking FR-26). Now:
--   1. Pupils cannot set answer_verdict, reasoning_verdict, misconception_codes
--      or read_back on attempts. The ai-check edge function (service role) sets
--      them, including for tap answers and for answers queued offline (S18+).
--   2. Pupils read segment_status but cannot write it. Admins still can.
--   3. A trigger on attempts keeps segment_status in step:
--      - any attempt: in_progress if not started, version shown added to versions_seen
--      - verdict first set to yes and yes: complete (the existing trigger clears the stalled flag)
--      - any other verdict first set: one try used, up to 3; at 3, moved_on
--        (the existing trigger raises the stalled flag)
--      - a moved_on segment that fails again stays moved_on; a complete one stays complete
--      "unsure" counts as not complete. FR-22's tie-breaker is applied by the
--      edge function before it writes the final verdict.
--
-- The same tries rule will live in src/domain/tries.ts (S18). Keep the two in
-- step: a change to one needs the same change to the other.

-- 1. Verdict columns ----------------------------------------------------------------

revoke insert (answer_verdict, reasoning_verdict, misconception_codes, read_back)
  on public.attempts from authenticated;

-- 2. segment_status writes: admins only ------------------------------------------------

drop policy segment_status_insert on public.segment_status;
drop policy segment_status_update on public.segment_status;

create policy segment_status_admin_insert on public.segment_status for insert to authenticated
  with check ((select public.is_admin()));
create policy segment_status_admin_update on public.segment_status for update to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));

-- 3. Derive segment_status from attempts -----------------------------------------------
-- Security definer because pupils cannot write segment_status.

create function public.attempts_sync_segment_status()
returns trigger language plpgsql security definer set search_path = ''
as $$
declare
  v_final_now boolean := new.answer_verdict is not null and new.reasoning_verdict is not null;
  v_final_before boolean := tg_op = 'UPDATE'
    and old.answer_verdict is not null and old.reasoning_verdict is not null;
begin
  insert into public.segment_status as s (pupil_id, segment_id, status, versions_seen)
  values (
    new.pupil_id, new.segment_id, 'in_progress',
    case when new.video_version_id is null then '{}'::uuid[] else array[new.video_version_id] end
  )
  on conflict (pupil_id, segment_id) do update set
    status = case when s.status = 'not_started' then 'in_progress'::public.segment_state else s.status end,
    versions_seen = case
      when new.video_version_id is null or new.video_version_id = any (s.versions_seen) then s.versions_seen
      else s.versions_seen || new.video_version_id
    end;

  if v_final_now and not v_final_before then
    if new.answer_verdict = 'yes' and new.reasoning_verdict = 'yes' then
      update public.segment_status s set status = 'complete'
      where s.pupil_id = new.pupil_id and s.segment_id = new.segment_id
        and s.status <> 'complete';
    else
      update public.segment_status s set
        tries_used = least(3, s.tries_used + 1),
        status = case when s.tries_used + 1 >= 3 then 'moved_on'::public.segment_state else s.status end
      where s.pupil_id = new.pupil_id and s.segment_id = new.segment_id
        and s.status in ('not_started', 'in_progress');
    end if;
  end if;

  return new;
end;
$$;
revoke all on function public.attempts_sync_segment_status() from public, anon, authenticated;

create trigger attempts_sync_segment_status
  after insert or update of answer_verdict, reasoning_verdict on public.attempts
  for each row execute function public.attempts_sync_segment_status();
