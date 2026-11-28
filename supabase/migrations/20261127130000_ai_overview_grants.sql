-- S17 (D-49): what the ai-overview Edge Function may read and write.
--
-- In this project new tables are not exposed to the API roles by default, and
-- until now the service role only ran the sign-in functions (S10). The service
-- role bypasses RLS, so these grants are kept to the columns the function
-- needs, and no more. Pupils and staff are unchanged.

grant select (id, user_id, status) on public.pupils to service_role;
grant select (id, pupil_id, withdrawn_at) on public.consents to service_role;
grant select (id, code) on public.topics to service_role;
grant select (topic_id, code, title, sort_order) on public.segments to service_role;
grant select (id, global_daily_ai_cap) on public.app_settings to service_role;

grant select (id, pupil_id, ai_result) on public.overview_responses to service_role;
grant insert (id, pupil_id, topic_id, summary_text, confusing_text, skipped, client_created_at)
  on public.overview_responses to service_role;
grant update (ai_result) on public.overview_responses to service_role;

grant select (pupil_id, overview_keywords, overview_interests, overview_confusions) on public.profiles to service_role;
grant insert (pupil_id, overview_keywords, overview_interests, overview_confusions) on public.profiles to service_role;
grant update (pupil_id, overview_keywords, overview_interests, overview_confusions) on public.profiles to service_role;

-- Counting today's calls (rule 13) and logging each one (rule 9).
grant select (id, pupil_id, created_at) on public.ai_calls to service_role;
grant insert (job, model, pupil_id, input, output, ok, latency_ms) on public.ai_calls to service_role;

-- Rule 14: a safeguarding flag for the admin.
grant insert (pupil_id, kind, note) on public.flags to service_role;
