-- S09: columns the content import needs (D-34).
--
-- topics.prerequisites    topic codes the home screen nudges about (framework, home).
-- topics.content_version  "YYYY-MM-DD-<8 hex>", the import date and a short hash
--                         of content/materials.json. The app compares it with
--                         what it cached to know the content changed.
-- segments.misconceptions the segment's misconception list, [{code, text}].
--                         ai-check sends it to the model (specs/ai-prompts.md).
--
-- No new table, so no new policy: the existing content policies cover these
-- columns (readable by signed-in users, writable by admins and the service role).

alter table public.topics
  add column prerequisites text[] not null default '{}',
  add column content_version text
    check (content_version is null or content_version ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}-[0-9a-f]{8}$');

alter table public.segments
  add column misconceptions jsonb not null default '[]'::jsonb
    check (jsonb_typeof(misconceptions) = 'array');
