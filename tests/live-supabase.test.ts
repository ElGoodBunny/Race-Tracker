// Data layer of the race page (docs/tasks/018-claude-datenschicht.md), against a fake Supabase client.
import { describe, expect, it } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { MESSAGE_LIMIT, applyChange, emptyState, subscribeRace, type Change, type LiveState } from "../src/lib/live/supabase";

const SLUG = "barcelona-2027";
type Row = Record<string, unknown>;

const race = (over: Row = {}): Row => ({ slug: SLUG, runner_name: "Dima", planned_start: "2027-03-14T07:30:00Z", actual_start: null, finished_at: null, target_sec: 13500, bib: null, start_block: null, distance_km: 42.195, updated_at: "2026-11-24T10:00:00Z", ...over });
const spot = (id: string, km: number, over: Row = {}): Row => ({ id, race_slug: SLUG, name: `Spot ${id}`, km, author_name: "Anna", created_by: "u1", created_at: "2026-11-24T10:00:00Z", ...over });
const msg = (id: string, at: string, over: Row = {}): Row => ({ id, race_slug: SLUG, body: `Hallo ${id}`, km: null, author_name: "Anna", created_by: "u1", created_at: at, ...over });
const cp = (id: string, km: number, over: Row = {}): Row => ({ id, race_slug: SLUG, km, src: "official", net_sec: 1200, seen_at: null, author_name: "Dima", created_by: "u0", created_at: "2026-11-24T10:00:00Z", ...over });

/** Minimal stand-in for the parts of supabase-js the layer uses: select chains and one realtime channel. */
function fakeClient(tables: Record<string, Row[]>) {
  const queries: { table: string; columns: string; eq: [string, unknown][]; order: [string, boolean][]; limit?: number }[] = [];
  const handlers: { table: string; filter?: string; fn: (p: unknown) => void }[] = [];
  let status: ((s: string) => void) | undefined;
  let removed = false;
  let fail = false;
  const client = {
    from(table: string) {
      const q = { table, columns: "", eq: [] as [string, unknown][], order: [] as [string, boolean][], limit: undefined as number | undefined };
      queries.push(q);
      const chain = {
        select(columns: string) {
          q.columns = columns;
          return chain;
        },
        eq(col: string, val: unknown) {
          q.eq.push([col, val]);
          return chain;
        },
        order(col: string, opts?: { ascending?: boolean }) {
          q.order.push([col, opts?.ascending ?? true]);
          return chain;
        },
        limit(n: number) {
          q.limit = n;
          return chain;
        },
        maybeSingle() {
          return chain;
        },
        then(resolve: (r: { data: unknown; error: unknown }) => void) {
          if (fail) return resolve({ data: null, error: { message: "offline" } });
          let rows = tables[table].filter((r) => q.eq.every(([c, v]) => r[c] === v));
          if (q.limit != null) rows = rows.slice(0, q.limit);
          resolve({ data: table === "races" ? (rows[0] ?? null) : rows, error: null });
        },
      };
      return chain;
    },
    channel() {
      const ch = {
        on(_type: string, opts: { table: string; filter?: string }, fn: (p: unknown) => void) {
          handlers.push({ table: opts.table, filter: opts.filter, fn });
          return ch;
        },
        subscribe(cb: (s: string) => void) {
          status = cb;
          return ch;
        },
      };
      return ch;
    },
    removeChannel() {
      removed = true;
      return Promise.resolve("ok");
    },
  };
  const emit = (table: string, eventType: string, n: Row, o: Row = {}) => {
    for (const h of handlers.filter((h) => h.table === table)) h.fn({ table, eventType, new: n, old: o });
  };
  return {
    client: client as unknown as SupabaseClient,
    queries,
    handlers,
    emit,
    status: (s: string) => status!(s),
    get removed() {
      return removed;
    },
    setFail(on: boolean) {
      fail = on;
    },
  };
}

const flush = () => new Promise((r) => setTimeout(r, 0));

function start(tables: Record<string, Row[]>) {
  const fake = fakeClient(tables);
  const states: LiveState[] = [];
  const stop = subscribeRace(fake.client, SLUG, (s) => states.push(s));
  return { fake, states, stop, last: () => states[states.length - 1] };
}

describe("applyChange", () => {
  const base = (): LiveState => ({ ...emptyState(), spots: [spot("a", 10) as never], status: "live" });
  const change = (c: Partial<Change> & Pick<Change, "table" | "eventType">): Change => ({ new: {}, old: {}, ...c });

  it("fügt ein, sortiert Spots nach km", () => {
    const s = applyChange(base(), SLUG, change({ table: "spots", eventType: "INSERT", new: spot("b", 5) }));
    expect(s.spots.map((x) => x.id)).toEqual(["b", "a"]);
  });

  it("ein Insert, das schon da ist, wird nicht doppelt", () => {
    const s = applyChange(base(), SLUG, change({ table: "spots", eventType: "INSERT", new: spot("a", 10) }));
    expect(s.spots).toHaveLength(1);
  });

  it("ändert und löscht über die id, auch wenn beim Löschen nur die id kommt", () => {
    let s = applyChange(base(), SLUG, change({ table: "spots", eventType: "UPDATE", new: spot("a", 12, { name: "Neu" }) }));
    expect(s.spots[0]).toMatchObject({ name: "Neu", km: 12 });
    s = applyChange(s, SLUG, change({ table: "spots", eventType: "DELETE", old: { id: "a" } }));
    expect(s.spots).toEqual([]);
  });

  it("ignoriert Zeilen eines anderen Rennens", () => {
    const s = applyChange(base(), SLUG, change({ table: "spots", eventType: "INSERT", new: spot("x", 3, { race_slug: "hamburg-2026" }) }));
    expect(s.spots.map((x) => x.id)).toEqual(["a"]);
  });

  it("macht aus numeric als Text eine Zahl", () => {
    const s = applyChange(base(), SLUG, change({ table: "spots", eventType: "INSERT", new: spot("b", "7.50" as never) }));
    expect(s.spots[0].km).toBe(7.5);
  });

  it("Nachrichten: neueste zuerst, höchstens 120", () => {
    const many = Array.from({ length: MESSAGE_LIMIT }, (_, i) => msg(`m${i}`, `2026-11-24T10:${String(i % 60).padStart(2, "0")}:00Z`) as never);
    const s = applyChange({ ...emptyState(), messages: many }, SLUG, change({ table: "messages", eventType: "INSERT", new: msg("neu", "2026-11-24T12:00:00Z") }));
    expect(s.messages).toHaveLength(MESSAGE_LIMIT);
    expect(s.messages[0].id).toBe("neu");
  });

  it("Rennzeile wird ersetzt", () => {
    const s = applyChange(base(), SLUG, change({ table: "races", eventType: "UPDATE", new: race({ actual_start: "2027-03-14T07:31:00Z" }) }));
    expect(s.race?.actual_start).toBe("2027-03-14T07:31:00Z");
  });
});

describe("subscribeRace", () => {
  const tables = () => ({
    races: [race(), race({ slug: "hamburg-2026" })],
    spots: [spot("a", 20), spot("b", 5), spot("x", 1, { race_slug: "hamburg-2026" })],
    messages: [msg("m1", "2026-11-24T10:00:00Z")],
    checkpoints: [cp("c1", 10)],
  });

  it("lädt erst nach dem Abonnieren, nur dieses Rennen, mit ausgewählten Spalten", async () => {
    const { fake, last } = start(tables());
    expect(fake.queries).toHaveLength(0);
    expect(last().status).toBe("loading");
    fake.status("SUBSCRIBED");
    await flush();
    expect(last()).toMatchObject({ status: "live", race: { slug: SLUG } });
    expect(last().spots.map((s) => s.id)).toEqual(["b", "a"]);
    for (const q of fake.queries) {
      expect(q.columns).not.toContain("*");
      expect(q.eq).toEqual([[q.table === "races" ? "slug" : "race_slug", SLUG]]);
    }
    expect(fake.queries.find((q) => q.table === "messages")?.limit).toBe(MESSAGE_LIMIT);
    expect(fake.handlers.map((h) => h.filter)).toEqual([`slug=eq.${SLUG}`, `race_slug=eq.${SLUG}`, `race_slug=eq.${SLUG}`, `race_slug=eq.${SLUG}`]);
  });

  it("Änderungen während des Ladens gehen nicht verloren", async () => {
    const { fake, last } = start(tables());
    fake.status("SUBSCRIBED");
    fake.emit("spots", "INSERT", spot("c", 7));
    await flush();
    expect(last().spots.map((s) => s.id)).toEqual(["b", "c", "a"]);
  });

  it("nach einem Abbruch offline, beim neuen Abonnieren wird alles neu geladen", async () => {
    const t = tables();
    const { fake, last } = start(t);
    fake.status("SUBSCRIBED");
    await flush();
    fake.status("CHANNEL_ERROR");
    expect(last().status).toBe("offline");
    expect(last().spots).toHaveLength(2);
    // While offline a spot was added and missed.
    t.spots.push(spot("d", 30));
    fake.status("SUBSCRIBED");
    await flush();
    expect(last().status).toBe("live");
    expect(last().spots.map((s) => s.id)).toEqual(["b", "a", "d"]);
  });

  it("Ladefehler: offline, die Daten bleiben", async () => {
    const { fake, last } = start(tables());
    fake.status("SUBSCRIBED");
    await flush();
    fake.setFail(true);
    fake.status("SUBSCRIBED");
    await flush();
    expect(last().status).toBe("offline");
    expect(last().spots).toHaveLength(2);
  });

  it("Abbestellen entfernt den Kanal, danach kommt nichts mehr", async () => {
    const { fake, states, stop } = start(tables());
    fake.status("SUBSCRIBED");
    await flush();
    stop();
    const n = states.length;
    fake.emit("spots", "INSERT", spot("z", 2));
    expect(fake.removed).toBe(true);
    expect(states).toHaveLength(n);
  });
});
