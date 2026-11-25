// Cheering spots (docs/tasks/025-claude-spots.md): checks like the database, writes, ETA, own spots. Fake Supabase client.
import { describe, expect, it } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { SPOT_NAME_MAX, addSpot, checkSpotKm, checkSpotName, deleteSpot, isMine, kmRange, raceEstimate, spotEta } from "../src/lib/live/spots";
import type { CheckpointRow, RaceRow, SpotRow } from "../src/lib/live/supabase";

const SLUG = "barcelona-2027";
type Row = Record<string, unknown>;

function fakeClient(writeError?: Row) {
  const calls: { op: string; table: string; row?: unknown; arg?: unknown }[] = [];
  const result = () => Promise.resolve({ data: null, error: writeError ?? null });
  const client = {
    from(table: string) {
      return {
        insert(row: Row) {
          calls.push({ op: "insert", table, row });
          return result();
        },
        delete() {
          return {
            eq(_c: string, id: string) {
              calls.push({ op: "delete", table, arg: id });
              return result();
            },
          };
        },
      };
    },
  };
  return { client: client as unknown as SupabaseClient, calls };
}

describe("checkSpotName", () => {
  it("trims and accepts 1 to 40 characters, like the check on spots.name", () => {
    expect(checkSpotName("  Alex & Sina mit Schild ")).toEqual({ name: "Alex & Sina mit Schild" });
    expect(checkSpotName("x".repeat(SPOT_NAME_MAX))).toEqual({ name: "x".repeat(40) });
  });
  it("rejects an empty or too long name with a text for the field", () => {
    expect(checkSpotName("   ")).toEqual({ error: "Gib deinem Spot einen Namen." });
    expect(checkSpotName("x".repeat(41))).toEqual({ error: "Höchstens 40 Zeichen." });
  });
});

describe("kmRange and checkSpotKm", () => {
  it("ends the slider at the last tenth inside the race, never past it", () => {
    expect(kmRange(42.195)).toEqual({ min: 0.3, max: 42.1 });
    expect(kmRange(21.1)).toEqual({ min: 0.3, max: 21.1 });
  });
  it("rounds to 0.1 km", () => {
    expect(checkSpotKm(9.04, 21.1)).toEqual({ km: 9 });
    expect(checkSpotKm(9.05, 21.1)).toEqual({ km: 9.1 });
    expect(checkSpotKm("12.37", 21.1)).toEqual({ km: 12.4 });
  });
  it("keeps the km inside the race, 42.19 on a marathon becomes 42.1 and not 42.2", () => {
    expect(checkSpotKm(42.19, 42.195)).toEqual({ km: 42.1 });
    expect(checkSpotKm(-3, 42.195)).toEqual({ km: 0.3 });
  });
  it("rejects what is not a number", () => {
    expect(checkSpotKm("abc", 21.1)).toEqual({ error: "Wähl einen Kilometer auf der Strecke." });
  });
});

describe("addSpot and deleteSpot", () => {
  it("inserts race, name and km only, author and owner come from the database", async () => {
    const { client, calls } = fakeClient();
    expect(await addSpot(client, SLUG, "Port Vell", 23.7)).toEqual({});
    expect(calls).toEqual([{ op: "insert", table: "spots", row: { race_slug: SLUG, name: "Port Vell", km: 23.7 } }]);
  });
  it("turns the spot limit into the known text", async () => {
    const { client } = fakeClient({ code: "P0001", message: "spot limit reached" });
    expect(await addSpot(client, SLUG, "Vierter", 5)).toEqual({ error: "Mehr als 3 Spots gehen nicht. Lösch einen, dann klappt es." });
  });
  it("turns a km behind the finish into the known text", async () => {
    const { client } = fakeClient({ code: "23514", message: "km beyond race distance" });
    expect(await addSpot(client, SLUG, "Hinterm Ziel", 43)).toEqual({ error: "Dieser Punkt liegt hinter dem Ziel." });
  });
  it("deletes by id", async () => {
    const { client, calls } = fakeClient();
    expect(await deleteSpot(client, "s1")).toEqual({});
    expect(calls).toEqual([{ op: "delete", table: "spots", arg: "s1" }]);
  });
  it("reports a refused delete", async () => {
    const { client } = fakeClient({ code: "42501", message: "permission denied" });
    expect(await deleteSpot(client, "s1")).toEqual({ error: "Du hast hier nur Leserechte." });
  });
});

describe("isMine", () => {
  const spot = { created_by: "u1" } as SpotRow;
  it("is true only for the guest who created it", () => {
    expect(isMine(spot, "u1")).toBe(true);
    expect(isMine(spot, "u2")).toBe(false);
    expect(isMine(spot, null)).toBe(false);
    expect(isMine({ created_by: null } as SpotRow, null)).toBe(false);
  });
});

describe("raceEstimate and spotEta", () => {
  const START = Date.parse("2027-03-07T07:30:00Z");
  const content = { plannedStart: "2027-03-07T07:30:00Z", targetSec: 4 * 3600, distanceKm: 42.195 };
  const row = (r: Partial<RaceRow> = {}): RaceRow => ({ slug: SLUG, runner_name: "Dima", planned_start: null, actual_start: null, finished_at: null, target_sec: null, bib: null, start_block: null, distance_km: 42.195, updated_at: "", ...r });

  it("before the start: planned start plus the share of the target time", () => {
    const est = raceEstimate(null, [], content, START - 3600_000);
    expect(est.phase).toBe("pre");
    expect(spotEta(est, 21.0975)).toEqual({ passed: false, at: START + 2 * 3600_000 });
  });

  it("takes start and target from the database when they are set", () => {
    const start = START + 15 * 60_000;
    const est = raceEstimate(row({ planned_start: new Date(start).toISOString(), target_sec: 3 * 3600 }), [], content, START);
    expect(spotEta(est, 42.195)).toEqual({ passed: false, at: start + 3 * 3600_000 });
  });

  it("falls back to the content file when the database has no start or target", () => {
    const est = raceEstimate(row(), [], content, START - 1);
    expect(spotEta(est, 42.195).at).toBe(START + 4 * 3600_000);
  });

  it("during the race: a spot behind the runner is passed, one ahead gets an arrival", () => {
    const est = raceEstimate(row({ actual_start: new Date(START).toISOString() }), [], content, START + 3600_000);
    expect(est.km).toBeGreaterThan(10);
    expect(spotEta(est, 5)).toEqual({ passed: true, at: null });
    const ahead = spotEta(est, 30);
    expect(ahead.passed).toBe(false);
    expect(ahead.at).toBeGreaterThan(START + 3600_000);
  });

  it("uses official splits and sightings like the legacy estimate", () => {
    const split: CheckpointRow = { id: "c1", race_slug: SLUG, km: 10, src: "official", net_sec: 3000, seen_at: null, author_name: "Dima", created_by: null, created_at: "" };
    const est = raceEstimate(row({ actual_start: new Date(START).toISOString() }), [split], content, START + 3000_000);
    expect(est.km).toBeCloseTo(10, 5);
    expect(spotEta(est, 15).at).toBe(START + 3000_000 + 5 * est.pace * 1000);
  });

  it("after the finish every spot is passed", () => {
    const est = raceEstimate(row({ actual_start: new Date(START).toISOString(), finished_at: new Date(START + 4 * 3600_000).toISOString() }), [], content, START + 5 * 3600_000);
    expect(spotEta(est, 42)).toEqual({ passed: true, at: null });
  });
});

describe("raceEstimate with a result in the content file", () => {
  const START = Date.parse("2026-10-25T08:45:00Z");
  const content = { plannedStart: "2026-10-25T08:45:00Z", targetSec: 6000, distanceKm: 21.0975, netSec: 6425 };
  const row = (r: Partial<RaceRow> = {}): RaceRow => ({ slug: "hamburg-2026", runner_name: "Dima", planned_start: null, actual_start: null, finished_at: null, target_sec: null, bib: null, start_block: null, distance_km: 21.0975, updated_at: "", ...r });

  it("counts as finished at start plus the net time when the database has no finish", () => {
    const est = raceEstimate(row(), [], content, START + 40 * 86400_000);
    expect(est.phase).toBe("done");
    expect(est.netSec).toBe(6425);
    expect(est.finishAt).toBe(START + 6425_000);
  });
  it("prefers the finish from the database", () => {
    const fin = START + 6000_000;
    const est = raceEstimate(row({ finished_at: new Date(fin).toISOString() }), [], content, fin + 1);
    expect(est.netSec).toBe(6000);
  });
  it("is not finished before start plus the net time", () => {
    expect(raceEstimate(row(), [], content, START + 3600_000).phase).toBe("run");
  });
});
