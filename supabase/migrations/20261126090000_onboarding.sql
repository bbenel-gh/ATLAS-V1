-- S14 onboarding (runbook S14, specs/prd.md FR-5 to FR-7, D-41).
--
-- 1. profiles.onboarding holds the time taken per screen (name, class,
--    interests) and when the answers last changed. The playful choices keep
--    their own time inside playful_choices.
-- 2. profiles.onboarded_at is set when the pupil finishes. Each answer is saved
--    as soon as it is given, so "a profiles row exists" no longer means
--    finished (D-37 replaced).
-- 3. A pupil may now change their own display_name and class_level, the two
--    onboarding answers kept on pupils, as well as ai_notice_seen_at. The
--    values are checked here too, not only in the app.

alter table public.profiles
  add column onboarding jsonb not null default '{}'::jsonb,
  add column onboarded_at timestamptz;

create or replace function public.pupils_guard_self_update()
returns trigger language plpgsql security invoker set search_path = ''
as $$
begin
  if current_user = 'authenticated' and not public.is_admin() then
    if (to_jsonb(new) - array['ai_notice_seen_at', 'display_name', 'class_level'])
       is distinct from (to_jsonb(old) - array['ai_notice_seen_at', 'display_name', 'class_level']) then
      raise exception 'A pupil may only change their name, class level and AI notice date'
        using errcode = '42501';
    end if;
    if new.display_name is distinct from old.display_name
       and not (new.display_name ~ '^[[:alpha:]][[:alpha:] -]*$' and char_length(new.display_name) <= 20) then
      raise exception 'A name may have letters, spaces and hyphens, at most 20'
        using errcode = '22023';
    end if;
    if new.class_level is distinct from old.class_level
       and new.class_level not in ('Basic 7', 'Basic 8', 'Basic 9') then
      raise exception 'Class level must be Basic 7, Basic 8 or Basic 9'
        using errcode = '22023';
    end if;
  end if;
  return new;
end;
$$;
revoke all on function public.pupils_guard_self_update() from public, anon, authenticated;
