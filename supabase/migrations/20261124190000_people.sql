-- S05: people tables. specs/data-model.md as amended by D-24.
-- schools, staff, classes, pupils, profiles, consents, app_settings.
-- Row Level Security is enabled in this same migration for every table
-- (CLAUDE.md rule 8). The anon role gets no table access at all.
--
-- PIN fields: hidden with column privileges, not a view. The authenticated
-- role is granted every pupils column except pin_hash, failed_pin_count and
-- locked_until, so no pupil, teacher or admin can read them through the API.
-- Only the service role (the pupil-signin edge function, S10) touches them.

-- Types -------------------------------------------------------------------------

create type public.staff_role as enum ('admin', 'teacher');
create type public.pupil_source as enum ('self', 'admin');
create type public.pupil_status as enum ('active', 'suspended');
create type public.consent_method as enum ('paper', 'in_app');

-- Tables ------------------------------------------------------------------------

create table public.staff (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users (id) on delete cascade,
  display_name text not null check (char_length(display_name) between 1 and 80),
  role public.staff_role not null,
  created_at timestamptz not null default now()
);
alter table public.staff enable row level security;

create table public.schools (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 160),
  district text check (char_length(district) <= 120),
  region text check (char_length(region) <= 120),
  added_by uuid references public.staff (id) on delete set null,
  created_at timestamptz not null default now()
);
alter table public.schools enable row level security;

-- Codes use no ambiguous characters: no 0, O, 1 or I (specs/prd.md FR-1).
create table public.classes (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 80),
  level text not null default 'Basic 7' check (char_length(level) between 1 and 40),
  school_id uuid references public.schools (id) on delete set null,
  teacher_id uuid references public.staff (id) on delete set null,
  join_code text unique check (join_code ~ '^[A-HJ-NP-Z2-9]{6}$'),
  created_at timestamptz not null default now()
);
alter table public.classes enable row level security;

create table public.pupils (
  id uuid primary key default gen_random_uuid(),
  -- Null until the pupil first signs in (admin-created pupils).
  user_id uuid unique references auth.users (id) on delete cascade,
  class_id uuid references public.classes (id) on delete set null,
  display_name text not null check (char_length(display_name) between 1 and 40),
  -- The school in the pupil's own words. An admin may link school_id later.
  school_given text check (char_length(school_given) <= 160),
  school_id uuid references public.schools (id) on delete set null,
  class_level text not null default 'Basic 7' check (char_length(class_level) between 1 and 40),
  code text not null unique check (code ~ '^[A-HJ-NP-Z2-9]{6}$'),
  pin_hash text,
  failed_pin_count integer not null default 0 check (failed_pin_count >= 0),
  locked_until timestamptz,
  signed_up_by public.pupil_source not null,
  status public.pupil_status not null default 'active',
  ai_notice_seen_at timestamptz,
  created_at timestamptz not null default now()
);
alter table public.pupils enable row level security;

create table public.profiles (
  pupil_id uuid primary key references public.pupils (id) on delete cascade,
  interests text[] not null default '{}',
  playful_choices jsonb not null default '{}'::jsonb,
  overview_keywords text[] not null default '{}',
  overview_confusions text[] not null default '{}',
  updated_at timestamptz not null default now()
);
alter table public.profiles enable row level security;

create table public.consents (
  id uuid primary key default gen_random_uuid(),
  pupil_id uuid not null references public.pupils (id) on delete cascade,
  method public.consent_method not null,
  recorded_by uuid references public.staff (id) on delete set null,
  given_at timestamptz not null default now(),
  form_ref text check (char_length(form_ref) <= 80),
  withdrawn_at timestamptz,
  check (method = 'in_app' or recorded_by is not null)
);
alter table public.consents enable row level security;

-- One row only. Public sign-up starts switched off (D-24).
create table public.app_settings (
  id boolean primary key default true check (id),
  public_signup_enabled boolean not null default false,
  global_daily_ai_cap integer not null default 2000 check (global_daily_ai_cap > 0),
  signups_per_device_per_day integer not null default 3 check (signups_per_device_per_day > 0),
  updated_by uuid references public.staff (id) on delete set null,
  updated_at timestamptz not null default now()
);
alter table public.app_settings enable row level security;
insert into public.app_settings (id) values (true);

-- Indexes on every foreign key not already covered by a unique constraint -------

create index schools_added_by_idx on public.schools (added_by);
create index classes_school_id_idx on public.classes (school_id);
create index classes_teacher_id_idx on public.classes (teacher_id);
create index pupils_class_id_idx on public.pupils (class_id);
create index pupils_school_id_idx on public.pupils (school_id);
create index consents_pupil_id_idx on public.consents (pupil_id);
create index consents_recorded_by_idx on public.consents (recorded_by);
create index app_settings_updated_by_idx on public.app_settings (updated_by);

-- Helper functions ----------------------------------------------------------------
-- Security definer so policies can look up roles without recursive RLS.
-- Fixed empty search_path, every name fully qualified.

create function public.current_staff_id()
returns uuid language sql stable security definer set search_path = ''
as $$ select s.id from public.staff s where s.user_id = auth.uid() $$;

create function public.is_admin()
returns boolean language sql stable security definer set search_path = ''
as $$ select exists (select 1 from public.staff s where s.user_id = auth.uid() and s.role = 'admin') $$;

create function public.is_teacher_of(p_class_id uuid)
returns boolean language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.classes c join public.staff s on s.id = c.teacher_id
    where c.id = p_class_id and s.user_id = auth.uid() and s.role = 'teacher'
  )
$$;

-- Null for a suspended pupil, so a suspended pupil reads nothing.
create function public.current_pupil_id()
returns uuid language sql stable security definer set search_path = ''
as $$ select p.id from public.pupils p where p.user_id = auth.uid() and p.status = 'active' $$;

create function public.is_teacher_of_pupil(p_pupil_id uuid)
returns boolean language sql stable security definer set search_path = ''
as $$ select public.is_teacher_of((select p.class_id from public.pupils p where p.id = p_pupil_id)) $$;

create function public.current_pupil_class_id()
returns uuid language sql stable security definer set search_path = ''
as $$ select p.class_id from public.pupils p where p.id = public.current_pupil_id() $$;

create function public.current_pupil_school_id()
returns uuid language sql stable security definer set search_path = ''
as $$ select p.school_id from public.pupils p where p.id = public.current_pupil_id() $$;

-- The only setting the sign-up screen needs before anyone is signed in.
create function public.public_signup_enabled()
returns boolean language sql stable security definer set search_path = ''
as $$ select coalesce((select a.public_signup_enabled from public.app_settings a), false) $$;

revoke all on function public.current_staff_id() from public, anon, authenticated;
revoke all on function public.is_admin() from public, anon, authenticated;
revoke all on function public.is_teacher_of(uuid) from public, anon, authenticated;
revoke all on function public.current_pupil_id() from public, anon, authenticated;
revoke all on function public.is_teacher_of_pupil(uuid) from public, anon, authenticated;
revoke all on function public.current_pupil_class_id() from public, anon, authenticated;
revoke all on function public.current_pupil_school_id() from public, anon, authenticated;
revoke all on function public.public_signup_enabled() from public, anon, authenticated;
grant execute on function public.current_staff_id() to authenticated;
grant execute on function public.is_admin() to authenticated;
grant execute on function public.is_teacher_of(uuid) to authenticated;
grant execute on function public.current_pupil_id() to authenticated;
grant execute on function public.is_teacher_of_pupil(uuid) to authenticated;
grant execute on function public.current_pupil_class_id() to authenticated;
grant execute on function public.current_pupil_school_id() to authenticated;
grant execute on function public.public_signup_enabled() to anon, authenticated;

-- Triggers ----------------------------------------------------------------------

-- A signed-in pupil may change only ai_notice_seen_at on their own row.
-- Column privileges cannot express this, because pupils and admins share
-- the authenticated role.
create function public.pupils_guard_self_update()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  if current_user = 'authenticated' and not public.is_admin() then
    if (to_jsonb(new) - 'ai_notice_seen_at') is distinct from (to_jsonb(old) - 'ai_notice_seen_at') then
      raise exception 'A pupil may only record that they saw the AI notice'
        using errcode = '42501';
    end if;
  end if;
  return new;
end;
$$;
revoke all on function public.pupils_guard_self_update() from public, anon, authenticated;

create trigger pupils_guard_self_update
  before update on public.pupils
  for each row execute function public.pupils_guard_self_update();

create function public.set_updated_at()
returns trigger language plpgsql set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;
revoke all on function public.set_updated_at() from public, anon, authenticated;

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

create trigger app_settings_set_updated_at
  before update on public.app_settings
  for each row execute function public.set_updated_at();

-- Privileges ----------------------------------------------------------------------
-- Start from nothing for anon and authenticated, then grant only what the
-- policies below need. The service role keeps full access.

revoke all on public.schools, public.staff, public.classes, public.pupils,
  public.profiles, public.consents, public.app_settings from anon, authenticated;

grant select, insert, update, delete on public.schools to authenticated;
grant select, insert, update, delete on public.staff to authenticated;
grant select, insert, update, delete on public.classes to authenticated;
grant select, insert, update, delete on public.profiles to authenticated;
grant select, insert, update, delete on public.consents to authenticated;
grant select, update on public.app_settings to authenticated;

grant select (id, user_id, class_id, display_name, school_given, school_id, class_level,
              code, signed_up_by, status, ai_notice_seen_at, created_at)
  on public.pupils to authenticated;
grant insert (class_id, display_name, school_given, school_id, class_level, code,
              signed_up_by, status)
  on public.pupils to authenticated;
grant update (class_id, display_name, school_given, school_id, class_level, status,
              ai_notice_seen_at)
  on public.pupils to authenticated;
grant delete on public.pupils to authenticated;

-- Policies ------------------------------------------------------------------------
-- Helper calls are wrapped in (select ...) so Postgres runs them once per query.

-- staff: a staff member reads their own row; admins read and write all.
create policy staff_select on public.staff for select to authenticated
  using (user_id = (select auth.uid()) or (select public.is_admin()));
create policy staff_admin_insert on public.staff for insert to authenticated
  with check ((select public.is_admin()));
create policy staff_admin_update on public.staff for update to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));
create policy staff_admin_delete on public.staff for delete to authenticated
  using ((select public.is_admin()));

-- schools: readable by any staff member or active pupil; admins write.
create policy schools_select on public.schools for select to authenticated
  using ((select public.current_staff_id()) is not null or (select public.current_pupil_id()) is not null);
create policy schools_admin_insert on public.schools for insert to authenticated
  with check ((select public.is_admin()));
create policy schools_admin_update on public.schools for update to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));
create policy schools_admin_delete on public.schools for delete to authenticated
  using ((select public.is_admin()));

-- classes: admin all; a teacher their own classes; a pupil their own class.
create policy classes_select on public.classes for select to authenticated
  using (
    (select public.is_admin())
    or teacher_id = (select public.current_staff_id())
    or id = (select public.current_pupil_class_id())
  );
create policy classes_admin_insert on public.classes for insert to authenticated
  with check ((select public.is_admin()));
create policy classes_admin_update on public.classes for update to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));
create policy classes_admin_delete on public.classes for delete to authenticated
  using ((select public.is_admin()));

-- pupils: a pupil their own row; a teacher pupils in their classes; admin all.
create policy pupils_select on public.pupils for select to authenticated
  using (
    id = (select public.current_pupil_id())
    or (select public.is_admin())
    or (class_id is not null and public.is_teacher_of(class_id))
  );
create policy pupils_admin_insert on public.pupils for insert to authenticated
  with check ((select public.is_admin()));
create policy pupils_update on public.pupils for update to authenticated
  using (id = (select public.current_pupil_id()) or (select public.is_admin()))
  with check (id = (select public.current_pupil_id()) or (select public.is_admin()));
create policy pupils_admin_delete on public.pupils for delete to authenticated
  using ((select public.is_admin()));

-- profiles: a pupil reads and writes their own; a teacher reads their class; admin all.
create policy profiles_select on public.profiles for select to authenticated
  using (
    pupil_id = (select public.current_pupil_id())
    or (select public.is_admin())
    or public.is_teacher_of_pupil(pupil_id)
  );
create policy profiles_insert on public.profiles for insert to authenticated
  with check (pupil_id = (select public.current_pupil_id()) or (select public.is_admin()));
create policy profiles_update on public.profiles for update to authenticated
  using (pupil_id = (select public.current_pupil_id()) or (select public.is_admin()))
  with check (pupil_id = (select public.current_pupil_id()) or (select public.is_admin()));
create policy profiles_admin_delete on public.profiles for delete to authenticated
  using ((select public.is_admin()));

-- consents: a pupil reads their own and may add an in-app guardian consent for
-- themselves; a teacher reads their class; admins record paper consent and withdrawals.
create policy consents_select on public.consents for select to authenticated
  using (
    pupil_id = (select public.current_pupil_id())
    or (select public.is_admin())
    or public.is_teacher_of_pupil(pupil_id)
  );
create policy consents_insert on public.consents for insert to authenticated
  with check (
    (select public.is_admin())
    or (
      pupil_id = (select public.current_pupil_id())
      and method = 'in_app'
      and recorded_by is null
      and withdrawn_at is null
    )
  );
create policy consents_admin_update on public.consents for update to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));
create policy consents_admin_delete on public.consents for delete to authenticated
  using ((select public.is_admin()));

-- app_settings: admins only. Everyone else uses public_signup_enabled().
create policy app_settings_admin_select on public.app_settings for select to authenticated
  using ((select public.is_admin()));
create policy app_settings_admin_update on public.app_settings for update to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));
