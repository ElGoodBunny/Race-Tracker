-- Race Tracker: initial schema.
-- Static course data lives in the repo (src/content/races/*.json). This schema holds only what
-- changes on race day. Replaces the artifact collections race/config, spots, msgs, checkpoints.
--
-- Auth model
--   Guests: Supabase anonymous sign-in, they pick a display name (profiles).
--   Dima:   magic link sign-in, user id listed in public.admins (insert manually, see docs/ARCHITECTURE.md).
-- Anonymous sign-ins must be enabled in the dashboard (Authentication > Sign In / Providers),
-- ideally together with CAPTCHA protection.

-- ---------- helpers ----------

create table public.admins (
  user_id uuid primary key references auth.users (id) on delete cascade
);
alter table public.admins enable row level security;
-- no policies: only the service role and SQL editor can read or write this table

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.admins a where a.user_id = (select auth.uid()));
$$;
revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to anon, authenticated;

-- ---------- profiles ----------

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null check (char_length(btrim(display_name)) between 1 and 30),
  created_at timestamptz not null default now()
);
alter table public.profiles enable row level security;

create policy "profiles are public" on public.profiles
  for select to anon, authenticated using (true);
create policy "own profile insert" on public.profiles
  for insert to authenticated with check (id = (select auth.uid()));
create policy "own profile update" on public.profiles
  for update to authenticated using (id = (select auth.uid())) with check (id = (select auth.uid()));

-- ---------- races (live state per race, slug matches the content file) ----------

create table public.races (
  slug text primary key check (slug ~ '^[a-z0-9-]{3,64}$'),
  runner_name text not null default 'Dima' check (char_length(runner_name) between 1 and 40),
  planned_start timestamptz,
  actual_start timestamptz,
  finished_at timestamptz,
  target_sec integer check (target_sec between 600 and 36000),
  bib text check (char_length(bib) <= 12),
  start_block text check (char_length(start_block) <= 12),
  live_track_url text check (live_track_url is null or live_track_url ~ '^https://'),
  updated_at timestamptz not null default now()
);
alter table public.races enable row level security;

create policy "races are public" on public.races
  for select to anon, authenticated using (true);
create policy "admin writes races" on public.races
  for all to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));

-- ---------- spots (cheering spots along the course) ----------

create table public.spots (
  id uuid primary key default gen_random_uuid(),
  race_slug text not null references public.races (slug) on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 40),
  km numeric(5, 2) not null check (km >= 0 and km <= 50),
  created_by uuid not null default auth.uid() references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);
create index spots_race_idx on public.spots (race_slug);
alter table public.spots enable row level security;

create policy "spots are public" on public.spots
  for select to anon, authenticated using (true);
create policy "guests add spots" on public.spots
  for insert to authenticated with check (created_by = (select auth.uid()));
create policy "own or admin edits spots" on public.spots
  for update to authenticated
  using (created_by = (select auth.uid()) or (select public.is_admin()))
  with check (created_by = (select auth.uid()) or (select public.is_admin()));
create policy "own or admin deletes spots" on public.spots
  for delete to authenticated using (created_by = (select auth.uid()) or (select public.is_admin()));

-- ---------- messages (pinboard; kind 'seen' doubles as a sighting note) ----------

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  race_slug text not null references public.races (slug) on delete cascade,
  kind text not null default 'msg' check (kind in ('msg', 'seen')),
  body text not null default '' check (char_length(body) <= 200),
  km numeric(5, 2) check (km is null or (km >= 0 and km <= 50)),
  created_by uuid not null default auth.uid() references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  check (kind = 'seen' or char_length(btrim(body)) > 0)
);
create index messages_race_created_idx on public.messages (race_slug, created_at desc);
alter table public.messages enable row level security;

create policy "messages are public" on public.messages
  for select to anon, authenticated using (true);
create policy "guests post messages" on public.messages
  for insert to authenticated with check (created_by = (select auth.uid()));
create policy "own or admin deletes messages" on public.messages
  for delete to authenticated using (created_by = (select auth.uid()) or (select public.is_admin()));

-- ---------- checkpoints (official splits by Dima, sightings by guests) ----------

create table public.checkpoints (
  id uuid primary key default gen_random_uuid(),
  race_slug text not null references public.races (slug) on delete cascade,
  km numeric(6, 3) not null check (km > 0 and km <= 50),
  src text not null check (src in ('official', 'seen')),
  net_sec integer check (net_sec is null or net_sec between 1 and 36000),
  seen_at timestamptz,
  created_by uuid not null default auth.uid() references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  -- official splits carry a net time, sightings a wall clock time
  check ((src = 'official' and net_sec is not null and seen_at is null)
      or (src = 'seen' and seen_at is not null and net_sec is null))
);
create index checkpoints_race_idx on public.checkpoints (race_slug);
alter table public.checkpoints enable row level security;

create policy "checkpoints are public" on public.checkpoints
  for select to anon, authenticated using (true);
create policy "guests add sightings, admin adds splits" on public.checkpoints
  for insert to authenticated
  with check (created_by = (select auth.uid()) and (src = 'seen' or (select public.is_admin())));
create policy "own or admin deletes checkpoints" on public.checkpoints
  for delete to authenticated using (created_by = (select auth.uid()) or (select public.is_admin()));

-- ---------- rate limit for guest writes ----------
-- Max 10 rows per user and table within 10 minutes. Admins are exempt.

create or replace function public.enforce_rate_limit()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  recent integer;
begin
  if public.is_admin() then
    return new;
  end if;
  execute format(
    'select count(*) from %I.%I where created_by = $1 and created_at > now() - interval ''10 minutes''',
    tg_table_schema, tg_table_name
  ) into recent using new.created_by;
  if recent >= 10 then
    raise exception 'rate limit exceeded' using errcode = 'P0001', hint = 'Kurz warten und nochmal versuchen.';
  end if;
  return new;
end;
$$;

create trigger spots_rate_limit before insert on public.spots
  for each row execute function public.enforce_rate_limit();
create trigger messages_rate_limit before insert on public.messages
  for each row execute function public.enforce_rate_limit();
create trigger checkpoints_rate_limit before insert on public.checkpoints
  for each row execute function public.enforce_rate_limit();

-- ---------- realtime ----------

alter publication supabase_realtime add table public.races, public.spots, public.messages, public.checkpoints;

-- ---------- seed: finished race from the legacy artifact ----------

insert into public.races (slug, runner_name, planned_start, target_sec, bib, start_block)
values ('hamburg-2026', 'Dima', '2026-10-25T08:45:00Z', 6000, '14821', 'B');
