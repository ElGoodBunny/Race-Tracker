-- Live telemetry from the watch (position, heart rate, cadence, altitude).
-- Source-agnostic on purpose: Garmin LiveTrack poller, own Connect IQ app, phone or a replay
-- all write the same rows. The client prefers fresh telemetry over the estimate (docs/VISION.md).

create table public.telemetry (
  id bigint generated always as identity primary key,
  race_slug text not null references public.races (slug) on delete cascade,
  recorded_at timestamptz not null,
  source text not null check (source in ('livetrack', 'connectiq', 'phone', 'replay')),
  km numeric(6, 3) check (km is null or (km >= 0 and km <= 50)),
  lat double precision check (lat is null or lat between -90 and 90),
  lng double precision check (lng is null or lng between -180 and 180),
  hr smallint check (hr is null or hr between 30 and 240),
  cadence smallint check (cadence is null or cadence between 0 and 260), -- steps per minute
  altitude real,
  created_at timestamptz not null default now(),
  unique (race_slug, source, recorded_at)
);
create index telemetry_race_time_idx on public.telemetry (race_slug, recorded_at desc);
alter table public.telemetry enable row level security;

create policy "telemetry is public" on public.telemetry
  for select to anon, authenticated using (true);
-- Writers are Dima's own devices (signed in as admin) or server functions using the service role,
-- which bypasses RLS. Guests can never write telemetry.
create policy "admin writes telemetry" on public.telemetry
  for insert to authenticated with check ((select public.is_admin()));
create policy "admin deletes telemetry" on public.telemetry
  for delete to authenticated using ((select public.is_admin()));

alter publication supabase_realtime add table public.telemetry;
