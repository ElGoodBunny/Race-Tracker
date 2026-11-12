-- Phase 1: schema gaps and decisions from Checkpoint A (docs/decisions/2026-11-12-architektur.md).
-- Every rule here has a case in tests/rls.test.ts.

-- ---------- crew per race (decision 2) ----------
-- Crew may set official splits and start/finish for their race, nothing else.
-- Like admins, crew members are added in the SQL editor (docs/ARCHITECTURE.md).

create table public.race_crew (
  race_slug text not null references public.races (slug) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  primary key (race_slug, user_id)
);
alter table public.race_crew enable row level security;
-- no policies: only the service role and SQL editor can read or write this table

create or replace function public.is_crew(slug text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.race_crew c where c.race_slug = slug and c.user_id = (select auth.uid()));
$$;
revoke all on function public.is_crew(text) from public;
grant execute on function public.is_crew(text) to anon, authenticated;

-- ---------- race distance (gap 5) ----------

alter table public.races add column distance_km numeric(7, 4) check (distance_km > 0 and distance_km <= 250);
update public.races set distance_km = 21.0975 where slug = 'hamburg-2026'; -- distanceKm in src/content/races/hamburg-2026.json
alter table public.races alter column distance_km set not null;

create or replace function public.enforce_race_distance()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  dist numeric;
begin
  select r.distance_km into dist from public.races r where r.slug = new.race_slug;
  if dist is not null and new.km > dist then
    raise exception 'km beyond race distance' using errcode = '23514';
  end if;
  return new;
end;
$$;

create trigger spots_race_distance before insert or update on public.spots
  for each row execute function public.enforce_race_distance();
create trigger checkpoints_race_distance before insert or update on public.checkpoints
  for each row execute function public.enforce_race_distance();

-- ---------- races.updated_at (gap 7) ----------

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger races_touch before update on public.races
  for each row execute function public.touch_updated_at();

-- ---------- authors: name in the row, posts survive the account (gap 1) ----------
-- author_name comes from profiles, never from the client. Without a profile there is no write,
-- which also forces the onboarding. created_by becomes null when the account is deleted.

alter table public.spots add column author_name text;
alter table public.messages add column author_name text;
alter table public.checkpoints add column author_name text;

update public.spots t set author_name = coalesce((select p.display_name from public.profiles p where p.id = t.created_by), 'Gast');
update public.messages t set author_name = coalesce((select p.display_name from public.profiles p where p.id = t.created_by), 'Gast');
update public.checkpoints t set author_name = coalesce((select p.display_name from public.profiles p where p.id = t.created_by), 'Gast');

alter table public.spots alter column author_name set not null;
alter table public.messages alter column author_name set not null;
alter table public.checkpoints alter column author_name set not null;

alter table public.spots alter column created_by drop not null,
  drop constraint spots_created_by_fkey,
  add constraint spots_created_by_fkey foreign key (created_by) references auth.users (id) on delete set null;
alter table public.messages alter column created_by drop not null,
  drop constraint messages_created_by_fkey,
  add constraint messages_created_by_fkey foreign key (created_by) references auth.users (id) on delete set null;
alter table public.checkpoints alter column created_by drop not null,
  drop constraint checkpoints_created_by_fkey,
  add constraint checkpoints_created_by_fkey foreign key (created_by) references auth.users (id) on delete set null;

create or replace function public.set_author()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  -- On update only the name is pinned. created_by is guarded by the policies, and it has to stay
  -- writable for "on delete set null" when the account goes away.
  if tg_op = 'UPDATE' then
    new.author_name := old.author_name;
    return new;
  end if;
  select p.display_name into new.author_name from public.profiles p where p.id = new.created_by;
  if new.author_name is null then
    raise exception 'profile required' using errcode = 'P0001', hint = 'Erst einen Namen setzen.';
  end if;
  return new;
end;
$$;

create trigger spots_author before insert or update on public.spots
  for each row execute function public.set_author();
create trigger messages_author before insert or update on public.messages
  for each row execute function public.set_author();
create trigger checkpoints_author before insert or update on public.checkpoints
  for each row execute function public.set_author();

-- ---------- messages: no more 'seen' kind (gap 2) ----------
-- Sightings live only in checkpoints. The pinboard shows them from there.

delete from public.messages where kind = 'seen';
alter table public.messages drop column kind; -- also drops the old check on kind and body
alter table public.messages alter column body drop default;
alter table public.messages add constraint messages_body_not_blank check (char_length(btrim(body)) > 0);

-- ---------- sightings carry the server time (gap 3) ----------

create or replace function public.stamp_sighting()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.src = 'seen' then
    new.seen_at := now();
  end if;
  return new;
end;
$$;

create trigger checkpoints_stamp before insert on public.checkpoints
  for each row execute function public.stamp_sighting();

-- ---------- one official split per km, crew may write them (gap 4, decision 2) ----------

create unique index checkpoints_official_km_idx on public.checkpoints (race_slug, km) where src = 'official';

drop policy "guests add sightings, admin adds splits" on public.checkpoints;
create policy "guests add sightings, admin and crew add splits" on public.checkpoints
  for insert to authenticated
  with check (created_by = (select auth.uid())
    and (src = 'seen' or (select public.is_admin()) or (select public.is_crew(race_slug))));

drop policy "own or admin deletes checkpoints" on public.checkpoints;
create policy "own, admin or crew deletes checkpoints" on public.checkpoints
  for delete to authenticated
  using (created_by = (select auth.uid()) or (select public.is_admin())
    or (src = 'official' and (select public.is_crew(race_slug))));

-- Insert or correct an official split. PostgREST upserts cannot target the partial index above,
-- so the client calls this function instead.
create or replace function public.set_official_split(slug text, split_km numeric, split_net_sec integer)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not (public.is_admin() or public.is_crew(slug)) then
    raise exception 'permission denied for official splits' using errcode = '42501';
  end if;
  insert into public.checkpoints (race_slug, km, src, net_sec, created_by)
  values (slug, split_km, 'official', split_net_sec, (select auth.uid()))
  on conflict (race_slug, km) where src = 'official'
  do update set net_sec = excluded.net_sec;
end;
$$;
revoke all on function public.set_official_split(text, numeric, integer) from public;
grant execute on function public.set_official_split(text, numeric, integer) to authenticated;

-- Start and finish for admins and crew. Sets both values, the client passes the current one it keeps.
create or replace function public.set_race_times(slug text, start_at timestamptz, finish_at timestamptz)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not (public.is_admin() or public.is_crew(slug)) then
    raise exception 'permission denied for race times' using errcode = '42501';
  end if;
  update public.races set actual_start = start_at, finished_at = finish_at where races.slug = set_race_times.slug;
end;
$$;
revoke all on function public.set_race_times(text, timestamptz, timestamptz) from public;
grant execute on function public.set_race_times(text, timestamptz, timestamptz) to authenticated;

-- ---------- rate limit: crew is exempt like admins ----------

create or replace function public.enforce_rate_limit()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  recent integer;
begin
  if public.is_admin() or public.is_crew(new.race_slug) then
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

-- ---------- at most 3 spots per guest and race (decision 1) ----------
-- No lock: two inserts at the same moment may let a fourth spot through, accepted.

create or replace function public.enforce_spot_limit()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if public.is_admin() then
    return new;
  end if;
  if (select count(*) from public.spots s where s.race_slug = new.race_slug and s.created_by = new.created_by) >= 3 then
    raise exception 'spot limit reached' using errcode = 'P0001', hint = 'Höchstens 3 Spots pro Rennen.';
  end if;
  return new;
end;
$$;

create trigger spots_limit before insert on public.spots
  for each row execute function public.enforce_spot_limit();

-- ---------- telemetry: watch distance next to the course km (gap 6) ----------
-- km is the course km (may stay empty while the client projects), distance_m the raw value from the watch.

alter table public.telemetry add column distance_m numeric(8, 1) check (distance_m is null or distance_m >= 0);

-- ---------- LiveTrack link only in a hidden table (decision 3) ----------
-- Nobody reads race_secrets through the API. Admins set the link through set_livetrack_link,
-- the settings page asks livetrack_link_status, the poller reads it with the service role.

create table public.race_secrets (
  race_slug text primary key references public.races (slug) on delete cascade,
  livetrack_url text not null,
  updated_at timestamptz not null default now()
);
alter table public.race_secrets enable row level security;
-- no policies

insert into public.race_secrets (race_slug, livetrack_url)
select slug, live_track_url from public.races where live_track_url is not null;
alter table public.races drop column live_track_url;

create or replace function public.set_livetrack_link(slug text, url text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  -- The poller fetches this URL from the server, so it may only point to these hosts.
  allowed_hosts constant text[] := array['livetrack.garmin.com'];
  authority text;
begin
  if not public.is_admin() then
    raise exception 'permission denied for livetrack link' using errcode = '42501';
  end if;
  authority := substring(url from '^https://([^/?#]*)');
  if authority is null or position('@' in authority) > 0 or position(':' in authority) > 0
     or not (lower(authority) = any (allowed_hosts)) then
    raise exception 'livetrack link not allowed' using errcode = '22023', hint = 'Nur Links von livetrack.garmin.com.';
  end if;
  insert into public.race_secrets (race_slug, livetrack_url, updated_at)
  values (slug, url, now())
  on conflict (race_slug) do update set livetrack_url = excluded.livetrack_url, updated_at = excluded.updated_at;
end;
$$;
revoke all on function public.set_livetrack_link(text, text) from public;
grant execute on function public.set_livetrack_link(text, text) to authenticated;

create or replace function public.livetrack_link_status(slug text)
returns table (is_set boolean, updated_at timestamptz)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.is_admin() then
    raise exception 'permission denied for livetrack link' using errcode = '42501';
  end if;
  return query
    select s.race_slug is not null, s.updated_at
    from (select 1) one
    left join public.race_secrets s on s.race_slug = livetrack_link_status.slug;
end;
$$;
revoke all on function public.livetrack_link_status(text) from public;
grant execute on function public.livetrack_link_status(text) to authenticated;
