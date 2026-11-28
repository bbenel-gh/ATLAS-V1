-- S15 Home (runbook S15 item 2a, specs/prd.md FR-8, D-44).
--
-- class_topics: the topics a class teacher has set for a class. Home shows them
-- under "Recommended for you". One row per class and topic.
--
-- Who may do what (CLAUDE.md rule 8):
--   - an admin reads and writes every row;
--   - a teacher reads and writes the rows of their own classes;
--   - a pupil reads the rows of their own class only, and writes nothing.
-- A suspended pupil has no current_pupil_class_id, so reads nothing.

create table public.class_topics (
  class_id uuid not null references public.classes (id) on delete cascade,
  topic_id uuid not null references public.topics (id) on delete cascade,
  set_by uuid references public.staff (id) on delete set null default public.current_staff_id(),
  set_at timestamptz not null default now(),
  primary key (class_id, topic_id)
);
alter table public.class_topics enable row level security;

create index class_topics_topic_id_idx on public.class_topics (topic_id);

revoke all on public.class_topics from anon, authenticated;
grant select, insert, delete on public.class_topics to authenticated;

create policy class_topics_select on public.class_topics for select to authenticated
  using (
    (select public.is_admin())
    or public.is_teacher_of(class_id)
    or class_id = (select public.current_pupil_class_id())
  );
create policy class_topics_insert on public.class_topics for insert to authenticated
  with check (
    (select public.is_admin())
    or (public.is_teacher_of(class_id) and set_by = (select public.current_staff_id()))
  );
create policy class_topics_delete on public.class_topics for delete to authenticated
  using ((select public.is_admin()) or public.is_teacher_of(class_id));
