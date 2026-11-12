// Runs the Supabase migration against an in-memory Postgres (PGlite) with a minimal auth stub
// and checks the row level security rules. No Supabase account needed.
import { readFileSync, readdirSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
import { beforeAll, describe, expect, it } from "vitest";

const ADMIN = "11111111-1111-1111-1111-111111111111";
const GUEST = "22222222-2222-2222-2222-222222222222";
const OTHER = "33333333-3333-3333-3333-333333333333";
const CREW = "44444444-4444-4444-4444-444444444444"; // crew of hamburg-2026 only
const NOPROFILE = "55555555-5555-5555-5555-555555555555"; // signed in, but never set a display name
const RACE_KM = JSON.parse(readFileSync(new URL("../src/content/races/hamburg-2026.json", import.meta.url), "utf8")).distanceKm as number;
const db = new PGlite();

async function as(role: "anon" | "authenticated", uid: string | null, sql: string) {
  try {
    await db.exec(`reset role; set request.jwt.claim.sub='${uid ?? ""}'; set role ${role}; ${sql}`);
    return "ok";
  } catch (e) {
    return `denied: ${(e as Error).message.split("\n")[0]}`;
  } finally {
    await db.exec("reset role");
  }
}
const count = async (table: string) => (await db.query<{ c: number }>(`select count(*)::int c from public.${table}`)).rows[0].c;
/** Runs a query as the given user and returns the rows, or the error message. */
async function rowsAs<T>(role: "anon" | "authenticated", uid: string | null, sql: string): Promise<T[] | string> {
  try {
    await db.exec(`reset role; set request.jwt.claim.sub='${uid ?? ""}'; set role ${role}`);
    return (await db.query<T>(sql)).rows;
  } catch (e) {
    return `denied: ${(e as Error).message.split("\n")[0]}`;
  } finally {
    await db.exec("reset role");
  }
}

beforeAll(async () => {
  await db.exec(`
    create role anon; create role authenticated;
    create schema auth; create table auth.users(id uuid primary key);
    create function auth.uid() returns uuid language sql stable
      as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
    grant usage on schema auth to anon, authenticated;
    create publication supabase_realtime;
    insert into auth.users values ('${ADMIN}'), ('${GUEST}'), ('${OTHER}'), ('${CREW}'), ('${NOPROFILE}');`);
  const dir = new URL("../supabase/migrations/", import.meta.url);
  for (const f of readdirSync(dir).filter((f) => f.endsWith(".sql")).sort()) await db.exec(readFileSync(new URL(f, dir), "utf8"));
  // Supabase grants table privileges to these roles by default, RLS does the filtering.
  await db.exec(`grant usage on schema public to anon, authenticated;
    grant all on all tables in schema public to anon, authenticated;
    insert into public.admins values ('${ADMIN}');
    insert into public.profiles (id, display_name) values ('${ADMIN}', 'Dima'), ('${GUEST}', 'Anna'), ('${OTHER}', 'Ben'), ('${CREW}', 'Carla');
    insert into public.races (slug, distance_km) values ('berlin-2027', 42.195);
    insert into public.race_crew (race_slug, user_id) values ('hamburg-2026', '${CREW}');`);
});

describe("row level security", () => {
  it("lets everyone read, but only signed-in users write", async () => {
    expect(await as("anon", null, "select * from public.races")).toBe("ok");
    expect(await as("anon", null, "insert into public.messages(race_slug, body) values ('hamburg-2026', 'hi')")).toMatch(/denied/);
    expect(await as("authenticated", GUEST, "insert into public.messages(race_slug, body) values ('hamburg-2026', 'Lauf!')")).toBe("ok");
  });

  it("blocks posting in someone else's name", async () => {
    expect(await as("authenticated", GUEST, `insert into public.messages(race_slug, body, created_by) values ('hamburg-2026', 'x', '${OTHER}')`)).toMatch(/denied/);
  });

  it("allows sightings from guests but official splits only from admins", async () => {
    expect(await as("authenticated", GUEST, "insert into public.checkpoints(race_slug, km, src, net_sec) values ('hamburg-2026', 5, 'official', 1500)")).toMatch(/denied/);
    expect(await as("authenticated", GUEST, "insert into public.checkpoints(race_slug, km, src, seen_at) values ('hamburg-2026', 7.3, 'seen', now())")).toBe("ok");
    expect(await as("authenticated", ADMIN, "insert into public.checkpoints(race_slug, km, src, net_sec) values ('hamburg-2026', 5, 'official', 1500)")).toBe("ok");
  });

  it("rejects malformed checkpoints", async () => {
    expect(await as("authenticated", GUEST, "insert into public.checkpoints(race_slug, km, src, net_sec) values ('hamburg-2026', 5, 'seen', 100)")).toMatch(/check constraint/);
  });

  it("lets only admins change race state", async () => {
    await as("authenticated", GUEST, "update public.races set target_sec = 5000 where slug = 'hamburg-2026'");
    expect((await db.query<{ t: number }>("select target_sec t from public.races where slug = 'hamburg-2026'")).rows[0].t).toBe(6000);
    await as("authenticated", ADMIN, "update public.races set target_sec = 5400 where slug = 'hamburg-2026'");
    expect((await db.query<{ t: number }>("select target_sec t from public.races where slug = 'hamburg-2026'")).rows[0].t).toBe(5400);
  });

  it("lets users delete only their own messages, admins delete any", async () => {
    await as("authenticated", OTHER, "delete from public.messages");
    expect(await count("messages")).toBe(1);
    await as("authenticated", ADMIN, "delete from public.messages");
    expect(await count("messages")).toBe(0);
  });

  it("hides the admin list from guests", async () => {
    await db.exec(`set request.jwt.claim.sub='${GUEST}'; set role authenticated`);
    const n = (await db.query<{ c: number }>("select count(*)::int c from public.admins")).rows[0].c;
    await db.exec("reset role");
    expect(n).toBe(0);
  });

  it("lets only admins write telemetry, everyone reads it", async () => {
    const row = "('hamburg-2026', now(), 'phone', 5.2, 53.55, 9.96, 162, 172, 12)";
    const cols = "(race_slug, recorded_at, source, km, lat, lng, hr, cadence, altitude)";
    expect(await as("authenticated", GUEST, `insert into public.telemetry ${cols} values ${row}`)).toMatch(/denied/);
    expect(await as("authenticated", ADMIN, `insert into public.telemetry ${cols} values ${row}`)).toBe("ok");
    expect(await as("anon", null, "select hr from public.telemetry")).toBe("ok");
    expect(await as("authenticated", ADMIN, `insert into public.telemetry ${cols} values ('hamburg-2026', now(), 'phone', 5, 0, 0, 300, 0, 0)`)).toMatch(/check constraint/);
  });

  // Runs on messages: spots stop at 3 per guest since the Phase 1 migration, before the rate limit kicks in.
  it("rate limits guests to 10 inserts per table in 10 minutes", async () => {
    let last = "";
    for (let i = 0; i < 11; i++) last = await as("authenticated", OTHER, `insert into public.messages(race_slug, body) values ('berlin-2027', 'Nachricht ${i}')`);
    expect(last).toMatch(/rate limit/);
    expect(await as("authenticated", ADMIN, "insert into public.messages(race_slug, body) values ('berlin-2027', 'Admin')")).toBe("ok");
  });
});

// Phase 1 migration: schema gaps and decisions from docs/decisions/2026-11-12-architektur.md
describe("authors", () => {
  it("stores the display name from the profile, not from the client", async () => {
    expect(await as("authenticated", GUEST, "insert into public.messages(race_slug, body, author_name) values ('hamburg-2026', 'Hopp', 'Dima')")).toBe("ok");
    const rows = await db.query<{ a: string }>("select author_name a from public.messages where body = 'Hopp'");
    expect(rows.rows[0].a).toBe("Anna");
  });

  it("rejects writes from users without a display name", async () => {
    expect(await as("authenticated", NOPROFILE, "insert into public.messages(race_slug, body) values ('hamburg-2026', 'anonym')")).toMatch(/profile/);
  });

  it("keeps the author name when the owner edits a spot", async () => {
    await as("authenticated", GUEST, "insert into public.spots(race_slug, name, km) values ('hamburg-2026', 'Brücke', 4)");
    await as("authenticated", GUEST, "update public.spots set author_name = 'Dima', name = 'Brücke Nord' where name = 'Brücke'");
    const r = await db.query<{ a: string }>("select author_name a from public.spots where name = 'Brücke Nord'");
    expect(r.rows[0].a).toBe("Anna");
  });

  it("keeps posts when the account is deleted", async () => {
    await db.exec(`insert into auth.users values ('66666666-6666-6666-6666-666666666666');
      insert into public.profiles (id, display_name) values ('66666666-6666-6666-6666-666666666666', 'Gast weg')`);
    expect(await as("authenticated", "66666666-6666-6666-6666-666666666666", "insert into public.messages(race_slug, body) values ('hamburg-2026', 'Bleibt')")).toBe("ok");
    await db.exec("delete from auth.users where id = '66666666-6666-6666-6666-666666666666'");
    const r = await db.query<{ a: string; c: string | null }>("select author_name a, created_by c from public.messages where body = 'Bleibt'");
    expect(r.rows).toEqual([{ a: "Gast weg", c: null }]);
  });
});

describe("messages and sightings", () => {
  it("has no message kind any more and still rejects empty messages", async () => {
    expect(await rowsAs("anon", null, "select kind from public.messages")).toMatch(/denied/);
    expect(await as("authenticated", GUEST, "insert into public.messages(race_slug, body) values ('hamburg-2026', '   ')")).toMatch(/check constraint/);
  });

  it("stamps sightings with the server time, whatever the client sends", async () => {
    expect(await as("authenticated", GUEST, "insert into public.checkpoints(race_slug, km, src, seen_at) values ('hamburg-2026', 8.1, 'seen', '2020-01-01')")).toBe("ok");
    expect(await as("authenticated", GUEST, "insert into public.checkpoints(race_slug, km, src) values ('hamburg-2026', 8.2, 'seen')")).toBe("ok");
    const r = await db.query<{ old: number }>("select count(*)::int old from public.checkpoints where src = 'seen' and km in (8.1, 8.2) and seen_at < now() - interval '1 minute'");
    expect(r.rows[0].old).toBe(0);
    expect(await count("checkpoints")).toBeGreaterThan(0);
  });
});

describe("official splits", () => {
  const split = (km: number, sec: number, slug = "hamburg-2026") => `select public.set_official_split('${slug}', ${km}, ${sec})`;
  const splits = async (km: number) => (await db.query<{ n: number }>(`select net_sec n from public.checkpoints where race_slug = 'hamburg-2026' and src = 'official' and km = ${km}`)).rows.map((r) => r.n);

  it("keeps one official split per km, a second call corrects it", async () => {
    expect(await as("authenticated", ADMIN, split(10, 3000))).toBe("ok");
    expect(await as("authenticated", ADMIN, split(10, 2990))).toBe("ok");
    expect(await splits(10)).toEqual([2990]);
  });

  it("blocks a second official split per km on direct insert", async () => {
    expect(await as("authenticated", ADMIN, "insert into public.checkpoints(race_slug, km, src, net_sec) values ('hamburg-2026', 10, 'official', 2000)")).toMatch(/duplicate|unique/);
  });

  it("lets crew set splits for their race only, guests never", async () => {
    expect(await as("authenticated", CREW, split(15, 4500))).toBe("ok");
    expect(await splits(15)).toEqual([4500]);
    expect(await as("authenticated", CREW, split(15, 4500, "berlin-2027"))).toMatch(/denied/);
    expect(await as("authenticated", GUEST, split(16, 4800))).toMatch(/denied/);
    expect(await as("authenticated", CREW, "insert into public.checkpoints(race_slug, km, src, net_sec) values ('berlin-2027', 5, 'official', 1500)")).toMatch(/denied/);
  });

  it("lets crew delete official splits of their race, not sightings of others", async () => {
    expect(await as("authenticated", CREW, "delete from public.checkpoints where race_slug = 'hamburg-2026' and src = 'official' and km = 15")).toBe("ok");
    expect(await splits(15)).toEqual([]);
    const seen = async () => (await db.query<{ c: number }>("select count(*)::int c from public.checkpoints where km = 8.1")).rows[0].c;
    await as("authenticated", CREW, "delete from public.checkpoints where km = 8.1");
    expect(await seen()).toBe(1);
  });
});

describe("race distance", () => {
  it("matches the distance in the race file", async () => {
    const r = await db.query<{ d: string }>("select distance_km d from public.races where slug = 'hamburg-2026'");
    expect(Number(r.rows[0].d)).toBe(RACE_KM);
  });

  it("rejects spots and checkpoints beyond the finish", async () => {
    expect(await as("authenticated", GUEST, "insert into public.spots(race_slug, name, km) values ('hamburg-2026', 'Zu weit', 25)")).toMatch(/distance/);
    expect(await as("authenticated", GUEST, "insert into public.checkpoints(race_slug, km, src) values ('hamburg-2026', 30, 'seen')")).toMatch(/distance/);
    expect(await as("authenticated", GUEST, "insert into public.spots(race_slug, name, km) values ('berlin-2027', 'Weit ok', 35)")).toBe("ok");
  });
});

describe("telemetry", () => {
  it("stores the watch distance next to the course km", async () => {
    const cols = "(race_slug, recorded_at, source, distance_m)";
    expect(await as("authenticated", ADMIN, `insert into public.telemetry ${cols} values ('hamburg-2026', now() - interval '5 seconds', 'livetrack', 5230)`)).toBe("ok");
    expect(await as("authenticated", ADMIN, `insert into public.telemetry ${cols} values ('hamburg-2026', now() - interval '1 second', 'livetrack', -1)`)).toMatch(/check constraint/);
  });
});

describe("races", () => {
  it("moves updated_at on every change", async () => {
    await db.exec("update public.races set updated_at = '2020-01-01' where slug = 'hamburg-2026'");
    await as("authenticated", ADMIN, "update public.races set target_sec = 5500 where slug = 'hamburg-2026'");
    const r = await db.query<{ old: boolean }>("select updated_at < now() - interval '1 minute' old from public.races where slug = 'hamburg-2026'");
    expect(r.rows[0].old).toBe(false);
  });
});

describe("spot limit", () => {
  it("allows 3 spots per guest and race, admins more", async () => {
    // GUEST already has one spot in hamburg-2026 from the author tests.
    for (const km of [5, 6]) expect(await as("authenticated", GUEST, `insert into public.spots(race_slug, name, km) values ('hamburg-2026', 'Spot ${km}', ${km})`)).toBe("ok");
    expect(await as("authenticated", GUEST, "insert into public.spots(race_slug, name, km) values ('hamburg-2026', 'Spot 7', 7)")).toMatch(/spot limit/);
    expect(await as("authenticated", GUEST, "insert into public.spots(race_slug, name, km) values ('berlin-2027', 'Anderes Rennen', 7)")).toBe("ok");
    for (const km of [1, 2, 3, 4]) expect(await as("authenticated", ADMIN, `insert into public.spots(race_slug, name, km) values ('hamburg-2026', 'Admin ${km}', ${km})`)).toBe("ok");
  });
});

describe("crew", () => {
  const times = (slug: string) => `select public.set_race_times('${slug}', '2026-10-25T08:47:12Z', null)`;
  const start = async (slug: string) => (await db.query<{ s: string | null }>(`select actual_start::text s from public.races where slug = '${slug}'`)).rows[0].s;

  it("sets start and finish for their race through the function", async () => {
    expect(await as("authenticated", CREW, times("hamburg-2026"))).toBe("ok");
    expect(await start("hamburg-2026")).toMatch(/^2026-10-25 08:47:12/);
  });

  it("cannot change other races, race settings, or the crew list", async () => {
    expect(await as("authenticated", CREW, times("berlin-2027"))).toMatch(/denied/);
    expect(await start("berlin-2027")).toBeNull();
    await as("authenticated", CREW, "update public.races set target_sec = 4000 where slug = 'hamburg-2026'");
    expect((await db.query<{ t: number }>("select target_sec t from public.races where slug = 'hamburg-2026'")).rows[0].t).toBe(5500);
    expect(await as("authenticated", CREW, `insert into public.race_crew values ('berlin-2027', '${CREW}')`)).toMatch(/denied/);
    expect(await rowsAs("authenticated", CREW, "select * from public.race_crew")).toEqual([]);
  });

  it("guests cannot use the function", async () => {
    expect(await as("authenticated", GUEST, times("hamburg-2026"))).toMatch(/denied/);
  });
});

describe("livetrack link", () => {
  const set = (url: string, uid = ADMIN) => as("authenticated", uid, `select public.set_livetrack_link('hamburg-2026', '${url}')`);

  it("stores a Garmin link for admins and never returns it", async () => {
    const r = await rowsAs<Record<string, unknown>>("authenticated", ADMIN, "select public.set_livetrack_link('hamburg-2026', 'https://livetrack.garmin.com/session/abc/token/XYZ') r");
    expect(JSON.stringify(r)).not.toContain("garmin");
    expect((await db.query<{ u: string }>("select livetrack_url u from public.race_secrets")).rows[0].u).toBe("https://livetrack.garmin.com/session/abc/token/XYZ");
    expect(await set("https://LiveTrack.Garmin.com/session/abc")).toBe("ok");
  });

  it.each([
    ["http", "http://livetrack.garmin.com/session/abc"],
    ["foreign host", "https://evil.de/session/abc"],
    ["suffix trick", "https://livetrack.garmin.com.evil.de/session/abc"],
    ["subdomain", "https://evil.livetrack.garmin.com/session/abc"],
    ["at trick", "https://livetrack.garmin.com@evil.de/session/abc"],
    ["credentials", "https://user:pass@livetrack.garmin.com/session/abc"],
    ["port", "https://livetrack.garmin.com:8443/session/abc"],
    ["trailing dot", "https://livetrack.garmin.com./session/abc"],
  ])("rejects %s", async (_, url) => {
    expect(await set(url)).toMatch(/denied/);
  });

  it("lets nobody but admins set the link or read its status", async () => {
    for (const uid of [GUEST, CREW]) {
      expect(await set("https://livetrack.garmin.com/session/x", uid)).toMatch(/denied/);
      expect(await as("authenticated", uid, "select * from public.livetrack_link_status('hamburg-2026')")).toMatch(/denied/);
    }
    expect(await as("anon", null, "select public.set_livetrack_link('hamburg-2026', 'https://livetrack.garmin.com/session/x')")).toMatch(/denied/);
    expect(await as("anon", null, "select * from public.livetrack_link_status('hamburg-2026')")).toMatch(/denied/);
  });

  it("status says only whether a link is set and when", async () => {
    const r = await rowsAs<Record<string, unknown>>("authenticated", ADMIN, "select * from public.livetrack_link_status('hamburg-2026')");
    expect(Array.isArray(r) && Object.keys(r[0]).sort()).toEqual(["is_set", "updated_at"]);
    expect(JSON.stringify(r)).not.toContain("garmin");
    expect(Array.isArray(r) && r[0].is_set).toBe(true);
    const none = await rowsAs<Record<string, unknown>>("authenticated", ADMIN, "select * from public.livetrack_link_status('berlin-2027')");
    expect(Array.isArray(none) && none[0].is_set).toBe(false);
  });

  it("hides the secrets table from everyone but the service role", async () => {
    for (const uid of [ADMIN, CREW, GUEST]) expect(await rowsAs("authenticated", uid, "select * from public.race_secrets")).toEqual([]);
    expect(await rowsAs("anon", null, "select * from public.race_secrets")).toEqual([]);
  });

  it("removed the link column from races", async () => {
    const r = await db.query("select 1 from information_schema.columns where table_name = 'races' and column_name = 'live_track_url'");
    expect(r.rows).toEqual([]);
  });
});

describe("crew rate limit", () => {
  it("does not limit crew in their own race", async () => {
    let last = "";
    for (let i = 0; i < 11; i++) last = await as("authenticated", CREW, `insert into public.checkpoints(race_slug, km, src) values ('hamburg-2026', ${11 + i * 0.1}, 'seen')`);
    expect(last).toBe("ok");
  });
});
