-- S06 part 1: content tables. specs/data-model.md as amended by D-27 and D-28.
-- topics, segments, video_versions, check_items, worked_examples, exam_papers,
-- exam_items, exam_item_keys, recheck_items.
--
-- Read access: any signed-in staff member or active pupil (same rule as
-- schools in S05), except the exam tables. Write access: admins and the
-- service role only.
--
-- Exam answers stay hidden from pupils (runbook S06 rule 4, D-28):
--   * The answer key and scheme points live in exam_item_keys. Only admins
--     (and the service role) can read that table. They are a separate table
--     because admins and pupils share the authenticated role, so column
--     privileges cannot hide them from one and not the other.
--   * Pupils cannot read exam_items directly either. They get questions only
--     through get_exam_items(attempt_id), for their own attempt, without keys.
--   * get_exam_review(attempt_id) returns the key for the pupil's own attempt,
--     and only once that attempt is submitted. It is defined in part 2, next
--     to exam_attempts.

-- Types -------------------------------------------------------------------------

create type public.exam_item_kind as enum ('objective', 'theory');

-- Tables ------------------------------------------------------------------------

create table public.topics (
  id uuid primary key default gen_random_uuid(),
  code text not null unique check (code ~ '^[A-Z0-9-]{2,24}$'),
  title text not null check (char_length(title) between 1 and 120),
  class_level text not null check (char_length(class_level) between 1 and 40),
  subject text not null check (char_length(subject) between 1 and 80),
  created_at timestamptz not null default now()
);
alter table public.topics enable row level security;

-- The overview is a segment with code OV (specs/prd.md section 7.1).
create table public.segments (
  id uuid primary key default gen_random_uuid(),
  topic_id uuid not null references public.topics (id) on delete cascade,
  code text not null check (code ~ '^[A-Z0-9]{1,4}$'),
  title text not null check (char_length(title) between 1 and 120),
  sort_order integer not null check (sort_order >= 0),
  objective text not null default '',
  reference_meaning text not null default '',
  created_at timestamptz not null default now(),
  unique (topic_id, code),
  unique (topic_id, sort_order)
);
alter table public.segments enable row level security;

create table public.video_versions (
  id uuid primary key default gen_random_uuid(),
  segment_id uuid not null references public.segments (id) on delete cascade,
  label text not null check (label ~ '^[a-z]$'),
  url_360 text not null,
  url_480 text not null,
  poster_url text,
  captions_url text,
  board_colour text not null default '#F6F0E6' check (board_colour ~ '^#[0-9A-Fa-f]{6}$'),
  duration_seconds integer not null check (duration_seconds > 0),
  example_world text not null default '',
  misconception_tags text[] not null default '{}',
  interest_tags text[] not null default '{}',
  created_at timestamptz not null default now(),
  unique (segment_id, label)
);
alter table public.video_versions enable row level security;

-- tap_options: JSON array of 3 strings.
-- reason_options: JSON array of 3 objects {text, code}; code is null for the
-- sound reason and a misconception code for the other two.
create table public.check_items (
  id uuid primary key default gen_random_uuid(),
  segment_id uuid not null references public.segments (id) on delete cascade,
  try_number integer not null check (try_number between 1 and 3),
  question text not null check (char_length(question) between 1 and 600),
  accepted_answers text[] not null default '{}',
  tap_options jsonb not null default '[]'::jsonb check (jsonb_typeof(tap_options) = 'array'),
  reason_options jsonb not null default '[]'::jsonb check (jsonb_typeof(reason_options) = 'array'),
  reference_reasoning text not null default '',
  misconception_codes text[] not null default '{}',
  created_at timestamptz not null default now(),
  unique (segment_id, try_number)
);
alter table public.check_items enable row level security;

-- One card per segment, under 120 words (checked by the content schema).
create table public.worked_examples (
  id uuid primary key default gen_random_uuid(),
  segment_id uuid not null unique references public.segments (id) on delete cascade,
  body text not null check (char_length(body) between 1 and 1200),
  image_url text,
  created_at timestamptz not null default now()
);
alter table public.worked_examples enable row level security;

create table public.exam_papers (
  id uuid primary key default gen_random_uuid(),
  topic_id uuid not null references public.topics (id) on delete cascade,
  label text not null check (label in ('A', 'B')),
  duration_minutes integer not null check (duration_minutes between 1 and 180),
  created_at timestamptz not null default now(),
  unique (topic_id, label)
);
alter table public.exam_papers enable row level security;

-- No answers in this table. options: JSON array of strings for objective
-- items, null for theory items.
create table public.exam_items (
  id uuid primary key default gen_random_uuid(),
  paper_id uuid not null references public.exam_papers (id) on delete cascade,
  kind public.exam_item_kind not null,
  sort_order integer not null check (sort_order >= 0),
  question text not null check (char_length(question) between 1 and 1200),
  options jsonb check (options is null or jsonb_typeof(options) = 'array'),
  marks integer not null check (marks > 0),
  created_at timestamptz not null default now(),
  unique (paper_id, sort_order),
  check ((kind = 'objective') = (options is not null))
);
alter table public.exam_items enable row level security;

-- Admin and service role only. correct_option is a 0-based index into
-- exam_items.options. scheme_points: JSON array of {id, text, marks}.
create table public.exam_item_keys (
  item_id uuid primary key references public.exam_items (id) on delete cascade,
  correct_option integer check (correct_option >= 0),
  scheme_points jsonb check (scheme_points is null or jsonb_typeof(scheme_points) = 'array'),
  suggested_answer text not null default '',
  check (correct_option is not null or scheme_points is not null)
);
alter table public.exam_item_keys enable row level security;

create table public.recheck_items (
  id uuid primary key default gen_random_uuid(),
  topic_id uuid not null references public.topics (id) on delete cascade,
  segment_id uuid not null references public.segments (id) on delete cascade,
  sort_order integer not null check (sort_order >= 0),
  question text not null check (char_length(question) between 1 and 600),
  accepted_answers text[] not null default '{}',
  tap_options jsonb not null default '[]'::jsonb check (jsonb_typeof(tap_options) = 'array'),
  created_at timestamptz not null default now(),
  unique (topic_id, sort_order)
);
alter table public.recheck_items enable row level security;

-- Indexes on foreign keys not covered by a unique constraint or primary key --
-- (segments, video_versions, check_items, exam_papers and exam_items lead their
-- unique constraint with the foreign key, so those are already indexed.)

create index recheck_items_segment_id_idx on public.recheck_items (segment_id);

-- Helper --------------------------------------------------------------------------

-- True for any staff member or active pupil. Suspended pupils read no content.
create function public.is_signed_in_user()
returns boolean language sql stable security definer set search_path = ''
as $$ select public.current_staff_id() is not null or public.current_pupil_id() is not null $$;
revoke all on function public.is_signed_in_user() from public, anon, authenticated;
grant execute on function public.is_signed_in_user() to authenticated;

-- Privileges ----------------------------------------------------------------------

revoke all on public.topics, public.segments, public.video_versions, public.check_items,
  public.worked_examples, public.exam_papers, public.exam_items, public.exam_item_keys,
  public.recheck_items from anon, authenticated;

grant select, insert, update, delete on public.topics, public.segments, public.video_versions,
  public.check_items, public.worked_examples, public.exam_papers, public.exam_items,
  public.exam_item_keys, public.recheck_items to authenticated;

-- Policies ------------------------------------------------------------------------

-- Readable by every signed-in user.
create policy topics_select on public.topics for select to authenticated
  using ((select public.is_signed_in_user()));
create policy segments_select on public.segments for select to authenticated
  using ((select public.is_signed_in_user()));
create policy video_versions_select on public.video_versions for select to authenticated
  using ((select public.is_signed_in_user()));
create policy check_items_select on public.check_items for select to authenticated
  using ((select public.is_signed_in_user()));
create policy worked_examples_select on public.worked_examples for select to authenticated
  using ((select public.is_signed_in_user()));
create policy exam_papers_select on public.exam_papers for select to authenticated
  using ((select public.is_signed_in_user()));
create policy recheck_items_select on public.recheck_items for select to authenticated
  using ((select public.is_signed_in_user()));

-- Exam questions: staff only. Pupils use get_exam_items().
create policy exam_items_select on public.exam_items for select to authenticated
  using ((select public.current_staff_id()) is not null);

-- Answer key: admins only. Pupils use get_exam_review() after submitting.
create policy exam_item_keys_select on public.exam_item_keys for select to authenticated
  using ((select public.is_admin()));

-- Admins write every content table.
create policy topics_admin_insert on public.topics for insert to authenticated with check ((select public.is_admin()));
create policy topics_admin_update on public.topics for update to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
create policy topics_admin_delete on public.topics for delete to authenticated using ((select public.is_admin()));

create policy segments_admin_insert on public.segments for insert to authenticated with check ((select public.is_admin()));
create policy segments_admin_update on public.segments for update to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
create policy segments_admin_delete on public.segments for delete to authenticated using ((select public.is_admin()));

create policy video_versions_admin_insert on public.video_versions for insert to authenticated with check ((select public.is_admin()));
create policy video_versions_admin_update on public.video_versions for update to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
create policy video_versions_admin_delete on public.video_versions for delete to authenticated using ((select public.is_admin()));

create policy check_items_admin_insert on public.check_items for insert to authenticated with check ((select public.is_admin()));
create policy check_items_admin_update on public.check_items for update to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
create policy check_items_admin_delete on public.check_items for delete to authenticated using ((select public.is_admin()));

create policy worked_examples_admin_insert on public.worked_examples for insert to authenticated with check ((select public.is_admin()));
create policy worked_examples_admin_update on public.worked_examples for update to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
create policy worked_examples_admin_delete on public.worked_examples for delete to authenticated using ((select public.is_admin()));

create policy exam_papers_admin_insert on public.exam_papers for insert to authenticated with check ((select public.is_admin()));
create policy exam_papers_admin_update on public.exam_papers for update to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
create policy exam_papers_admin_delete on public.exam_papers for delete to authenticated using ((select public.is_admin()));

create policy exam_items_admin_insert on public.exam_items for insert to authenticated with check ((select public.is_admin()));
create policy exam_items_admin_update on public.exam_items for update to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
create policy exam_items_admin_delete on public.exam_items for delete to authenticated using ((select public.is_admin()));

create policy exam_item_keys_admin_insert on public.exam_item_keys for insert to authenticated with check ((select public.is_admin()));
create policy exam_item_keys_admin_update on public.exam_item_keys for update to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
create policy exam_item_keys_admin_delete on public.exam_item_keys for delete to authenticated using ((select public.is_admin()));

create policy recheck_items_admin_insert on public.recheck_items for insert to authenticated with check ((select public.is_admin()));
create policy recheck_items_admin_update on public.recheck_items for update to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
create policy recheck_items_admin_delete on public.recheck_items for delete to authenticated using ((select public.is_admin()));
