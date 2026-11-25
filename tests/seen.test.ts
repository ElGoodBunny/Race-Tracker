// "Ich sehe Dima gerade" (docs/tasks/026-claude-gesehen.md): which km, when, and the writes. Fake Supabase client.
import { describe, expect, it } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Estimate, Phase } from "../src/lib/estimate";
import { deleteSighting, reportSeen, sightingKm } from "../src/lib/live/seen";

const SLUG = "barcelona-2027";
const DIST = 42.195;
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

const est = (phase: Phase, km: number) => ({ phase, km }) as Estimate;

describe("sightingKm", () => {
  it("is null before the start, after the finish and when the estimate is stale, like the hidden legacy button", () => {
    for (const phase of ["pre", "done", "stale"] as Phase[]) expect(sightingKm(est(phase, 10), [], DIST)).toBeNull();
  });
  it("takes the estimate rounded to 0.1 km while running and arriving", () => {
    expect(sightingKm(est("run", 12.34), [], DIST)).toBe(12.3);
    expect(sightingKm(est("run", 12.36), [], DIST)).toBe(12.4);
    expect(sightingKm(est("arriving", 42.1), [], DIST)).toBe(42.1);
  });
  it("takes an own spot within 2.5 km of the estimate, the nearest of several", () => {
    expect(sightingKm(est("run", 12), [{ km: 14.4 }], DIST)).toBe(14.4);
    expect(sightingKm(est("run", 12), [{ km: 14.6 }], DIST)).toBe(12);
    expect(sightingKm(est("run", 12), [{ km: 9.8 }, { km: 13 }, { km: 30 }], DIST)).toBe(13);
  });
  it("stays above 0, the database rejects km 0 right after the start", () => {
    expect(sightingKm(est("run", 0.02), [], DIST)).toBe(0.1);
  });
  it("stays inside the race, 42.19 on a marathon becomes 42.1 and not 42.2", () => {
    expect(sightingKm(est("arriving", 42.19), [], DIST)).toBe(42.1);
    expect(sightingKm(est("run", 21.09), [], 21.0975)).toBe(21);
  });
});

describe("reportSeen and deleteSighting", () => {
  it("inserts only race, km and src, the server sets time, author and owner", async () => {
    const { client, calls } = fakeClient();
    expect(await reportSeen(client, SLUG, 12.3)).toEqual({});
    expect(calls).toEqual([{ op: "insert", table: "checkpoints", row: { race_slug: SLUG, km: 12.3, src: "seen" } }]);
  });
  it("deletes by id", async () => {
    const { client, calls } = fakeClient();
    expect(await deleteSighting(client, "c1")).toEqual({});
    expect(calls).toEqual([{ op: "delete", table: "checkpoints", arg: "c1" }]);
  });
  it("turns database errors into the texts from errorText", async () => {
    const { client } = fakeClient({ code: "P0001", message: "rate limit exceeded" });
    expect(await reportSeen(client, SLUG, 12.3)).toEqual({ error: "Zu viele Aktionen auf einmal. Kurz warten." });
    const prof = fakeClient({ code: "P0001", message: "profile required" });
    expect(await reportSeen(prof.client, SLUG, 12.3)).toEqual({ error: "Setz zuerst deinen Namen." });
    const rls = fakeClient({ code: "42501", message: "new row violates row-level security policy" });
    expect(await deleteSighting(rls.client, "c1")).toEqual({ error: "Du hast hier nur Leserechte." });
  });
});
