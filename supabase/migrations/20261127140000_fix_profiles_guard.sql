-- S17 (D-49) fix: profiles_guard_overview called public.is_admin() for every
-- role, because SQL "and" does not stop early. The service role may not run
-- is_admin(), so the ai-overview profile update failed with 42501. Now
-- is_admin() is only asked for a signed-in user.

create or replace function public.profiles_guard_overview()
returns trigger language plpgsql security invoker set search_path = ''
as $$
begin
  if current_user <> 'authenticated' then
    return new;
  end if;
  if public.is_admin() then
    return new;
  end if;
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
  return new;
end;
$$;
revoke all on function public.profiles_guard_overview() from public, anon, authenticated;
