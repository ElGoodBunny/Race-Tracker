// Runs the Supabase migration against an in-memory Postgres (PGlite) with a minimal auth stub
// and checks the row level security rules. No Supabase account needed.
import { readFileSync, readdirSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
import { beforeAll, describe, expect, it } from "vitest";

const ADMIN = "11111111-1111-1111-1111-111111111111";
const GUEST = "22222222-2222-2222-2222-222222222222";
const OTHER = "33333333-3333-3333-3333-333333333333";
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

beforeAll(async () => {
  await db.exec(`
    create role anon; create role authenticated;
    create schema auth; create table auth.users(id uuid primary key);
    create function auth.uid() returns uuid language sql stable
      as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
    grant usage on schema auth to anon, authenticated;
    create publication supabase_realtime;
    insert into auth.users values ('${ADMIN}'), ('${GUEST}'), ('${OTHER}');`);
  const dir = new URL("../supabase/migrations/", import.meta.url);
  for (const f of readdirSync(dir).filter((f) => f.endsWith(".sql")).sort()) await db.exec(readFileSync(new URL(f, dir), "utf8"));
  // Supabase grants table privileges to these roles by default, RLS does the filtering.
  await db.exec(`grant usage on schema public to anon, authenticated;
    grant all on all tables in schema public to anon, authenticated;
    insert into public.admins values ('${ADMIN}');`);
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
    expect((await db.query<{ t: number }>("select target_sec t from public.races")).rows[0].t).toBe(6000);
    await as("authenticated", ADMIN, "update public.races set target_sec = 5400 where slug = 'hamburg-2026'");
    expect((await db.query<{ t: number }>("select target_sec t from public.races")).rows[0].t).toBe(5400);
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

  it("rate limits guests to 10 inserts per table in 10 minutes", async () => {
    let last = "";
    for (let i = 0; i < 11; i++) last = await as("authenticated", OTHER, `insert into public.spots(race_slug, name, km) values ('hamburg-2026', 'Spot ${i}', 3)`);
    expect(last).toMatch(/rate limit/);
    expect(await as("authenticated", ADMIN, "insert into public.spots(race_slug, name, km) values ('hamburg-2026', 'Admin', 3)")).toBe("ok");
  });
});
