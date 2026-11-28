-- S19 (D-52): what the ai-check Edge Function may read and write.
--
-- Same approach as 20261127130000_ai_overview_grants.sql: the service role
-- bypasses RLS, so the grants are kept to the columns the function needs.
-- Pupils and staff are unchanged. Already granted there: pupils, consents,
-- app_settings, ai_calls (count and insert), flags (pupil_id, kind, note).

-- The question and its references, loaded from the database, never from the phone.
grant select (id, segment_id, try_number, question, accepted_answers, tap_options, reason_options, reference_reasoning)
  on public.check_items to service_role;
grant select (id, code, reference_meaning, misconceptions) on public.segments to service_role;

-- Rule 14: the safeguarding flag names the segment.
grant insert (segment_id) on public.flags to service_role;
