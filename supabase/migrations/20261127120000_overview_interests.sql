-- S17 overview listening (runbook S17, specs/prd.md FR-12, D-49).
--
-- 1. profiles.overview_interests: everyday things a pupil mentioned after an
--    overview video (football, cooking), in their own words. Kept apart from
--    profiles.interests, which holds the fixed onboarding tags.
-- 2. The three overview columns are written only by the ai-overview Edge
--    Function (service role). A pupil still writes their onboarding answers on
--    the same row, so this is a guard trigger, as for pupils (S05, S14).

alter table public.profiles
  add column overview_interests text[] not null default '{}';

create or replace function public.profiles_guard_overview()
returns trigger language plpgsql security invoker set search_path = ''
as $$
begin
  if current_user = 'authenticated' and not public.is_admin() then
    if tg_op = 'INSERT' then
      if new.overview_keywords <> '{}' or new.overview_confusions <> '{}' or new.overview_interests <> '{}' then
        raise exception 'Only ATLAS may write the overview words'
          using errcode = '42501';
      end if;
    elsif new.overview_keywords is distinct from old.overview_keywords
       or new.overview_confusions is distinct from old.overview_confusions
       or new.overview_interests is distinct from old.overview_interests then
      raise exception 'Only ATLAS may write the overview words'
        using errcode = '42501';
    end if;
  end if;
  return new;
end;
$$;
revoke all on function public.profiles_guard_overview() from public, anon, authenticated;

create trigger profiles_guard_overview
  before insert or update on public.profiles
  for each row execute function public.profiles_guard_overview();
