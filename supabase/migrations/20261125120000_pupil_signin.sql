-- S10: database side of the pupil-signin Edge Function (D-36).
--
-- The PIN is hashed with bcrypt (pgcrypto, cost 10) inside Postgres, so the
-- hash never leaves the database and the Edge Function needs no crypto library.
-- The lockout decision (5 wrong PINs, 15 minutes) lives in src/domain/auth.ts;
-- these functions only hash, compare and count.
--
-- Every function here is for the service role only (the Edge Function). anon and
-- authenticated cannot execute them, and cannot read signin_rate.

-- Rate limit ----------------------------------------------------------------------

-- key: HMAC-SHA256 of the pupil code with a function secret, never the code itself.
create table public.signin_rate (
  key text not null check (key ~ '^[0-9a-f]{64}$'),
  minute timestamptz not null,
  hits integer not null default 0 check (hits >= 0),
  primary key (key, minute)
);
alter table public.signin_rate enable row level security;
revoke all on public.signin_rate from public, anon, authenticated;
-- No policies: only the service role (which bypasses RLS) uses it, through
-- signin_rate_hit below.

-- Counts one call and says whether it is within the limit. Old buckets go.
create function public.signin_rate_hit(p_key text, p_minute timestamptz, p_limit integer)
returns boolean language plpgsql security definer set search_path = ''
as $$
declare
  v_hits integer;
begin
  delete from public.signin_rate where minute < now() - interval '10 minutes';
  insert into public.signin_rate as r (key, minute, hits) values (p_key, p_minute, 1)
    on conflict (key, minute) do update set hits = r.hits + 1
    returning hits into v_hits;
  return v_hits <= p_limit;
end;
$$;

-- Pupil lookup and PIN ------------------------------------------------------------

-- What the function needs to decide, without ever reading pin_hash.
create function public.pupil_signin_lookup(p_code text)
returns table (pupil_id uuid, user_id uuid, status public.pupil_status, has_pin boolean, locked_until timestamptz)
language sql stable security definer set search_path = ''
as $$
  select p.id, p.user_id, p.status, p.pin_hash is not null, p.locked_until
  from public.pupils p
  where p.code = p_code
$$;

-- First sign-in: stores the bcrypt hash only if no PIN is set yet. Two phones
-- setting a PIN at once: one wins, the other gets false.
create function public.set_pupil_pin(p_pupil_id uuid, p_pin text)
returns boolean language plpgsql security definer set search_path = ''
as $$
begin
  if p_pin !~ '^[0-9]{4}$' then
    raise exception 'PIN must be 4 digits' using errcode = '22023';
  end if;
  update public.pupils
     set pin_hash = extensions.crypt(p_pin, extensions.gen_salt('bf', 10)),
         failed_pin_count = 0,
         locked_until = null
   where id = p_pupil_id and pin_hash is null;
  return found;
end;
$$;

-- Compares the PIN. Right: count back to 0. Wrong: count + 1 in one update, so
-- two quick wrong PINs never both read the same count. Returns the new count.
create function public.check_pupil_pin(p_pupil_id uuid, p_pin text)
returns table (ok boolean, failed_count integer)
language plpgsql security definer set search_path = ''
as $$
declare
  v_hash text;
  v_count integer;
begin
  select p.pin_hash into v_hash from public.pupils p where p.id = p_pupil_id for update;
  if not found or v_hash is null then
    return;
  end if;
  if v_hash = extensions.crypt(p_pin, v_hash) then
    update public.pupils set failed_pin_count = 0, locked_until = null where id = p_pupil_id;
    ok := true;
    failed_count := 0;
  else
    update public.pupils p set failed_pin_count = p.failed_pin_count + 1
     where p.id = p_pupil_id
     returning p.failed_pin_count into v_count;
    ok := false;
    failed_count := v_count;
  end if;
  return next;
end;
$$;

-- Sets or clears the lock. The count goes back to 0 so the pupil gets 5 new
-- tries once the lock ends.
create function public.lock_pupil(p_pupil_id uuid, p_until timestamptz)
returns void language sql security definer set search_path = ''
as $$
  update public.pupils set locked_until = p_until, failed_pin_count = 0 where id = p_pupil_id
$$;

-- First sign-in of an admin-created pupil: links the auth user made for them.
create function public.link_pupil_user(p_pupil_id uuid, p_user_id uuid)
returns boolean language plpgsql security definer set search_path = ''
as $$
begin
  update public.pupils set user_id = p_user_id where id = p_pupil_id and user_id is null;
  return found;
end;
$$;

-- Privileges ------------------------------------------------------------------------

revoke all on function public.signin_rate_hit(text, timestamptz, integer) from public, anon, authenticated;
revoke all on function public.pupil_signin_lookup(text) from public, anon, authenticated;
revoke all on function public.set_pupil_pin(uuid, text) from public, anon, authenticated;
revoke all on function public.check_pupil_pin(uuid, text) from public, anon, authenticated;
revoke all on function public.lock_pupil(uuid, timestamptz) from public, anon, authenticated;
revoke all on function public.link_pupil_user(uuid, uuid) from public, anon, authenticated;

grant execute on function public.signin_rate_hit(text, timestamptz, integer) to service_role;
grant execute on function public.pupil_signin_lookup(text) to service_role;
grant execute on function public.set_pupil_pin(uuid, text) to service_role;
grant execute on function public.check_pupil_pin(uuid, text) to service_role;
grant execute on function public.lock_pupil(uuid, timestamptz) to service_role;
grant execute on function public.link_pupil_user(uuid, uuid) to service_role;
