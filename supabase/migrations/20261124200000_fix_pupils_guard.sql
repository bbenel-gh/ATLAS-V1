-- S05 fix: the pupils self-update guard never fired.
-- As security definer, current_user inside the function is the owner, not the
-- signed-in role, so "current_user = 'authenticated'" was always false and a
-- pupil could change their own name, status and class. Found by
-- supabase/tests/people_rls.test.sql (tests 13 and 14) on atlas-dev.
-- Security invoker makes current_user the caller's role. is_admin() stays
-- security definer and is granted to authenticated, so the check still works.

alter function public.pupils_guard_self_update() security invoker;
