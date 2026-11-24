-- Function privileges as intended (docs/tasks/021-claude-funktionsrechte.md).
-- Supabase grants EXECUTE on every new function in public to anon and authenticated directly. The earlier
-- "revoke all ... from public" does not touch those grants, so the Supabase advisor found SECURITY DEFINER
-- functions callable without login. Not exploitable (the functions check admin or crew themselves, trigger
-- functions cannot be called directly), but not what the migrations meant.

-- RPCs: signed-in users only. The functions still check admin or crew inside.
revoke execute on function public.set_livetrack_link(text, text) from public, anon;
revoke execute on function public.livetrack_link_status(text) from public, anon;
revoke execute on function public.set_official_split(text, numeric, integer) from public, anon;
revoke execute on function public.set_race_times(text, timestamptz, timestamptz) from public, anon;

-- Helpers used in policies. Every policy that calls them is "to authenticated", so anon needs neither.
revoke execute on function public.is_admin() from public, anon;
revoke execute on function public.is_crew(text) from public, anon;
grant execute on function public.is_admin() to authenticated;
grant execute on function public.is_crew(text) to authenticated;

-- Trigger functions: nobody calls them. Postgres checks EXECUTE only when the trigger is created, not when it fires.
revoke execute on function public.set_author() from public, anon, authenticated;
revoke execute on function public.enforce_rate_limit() from public, anon, authenticated;
revoke execute on function public.enforce_spot_limit() from public, anon, authenticated;
revoke execute on function public.enforce_race_distance() from public, anon, authenticated;
revoke execute on function public.stamp_sighting() from public, anon, authenticated;
revoke execute on function public.touch_updated_at() from public, anon, authenticated;

-- New functions from here on: not callable without login unless a migration grants it on purpose.
alter default privileges in schema public revoke execute on functions from anon;
