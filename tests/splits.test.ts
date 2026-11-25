// Split table (docs/tasks/028-claude-zwischenzeiten.md): points, times and sources as in renderSplits() of the legacy page.
import { describe, expect, it } from "vitest";
import { estimate, type Checkpoint } from "../src/lib/estimate";
import { splitPoints, splitRows } from "../src/lib/live/splits";

const START = Date.parse("2026-10-25T07:45:00Z"); // 8:45 in Hamburg (CET)
const DIST = 21.0975;
const TARGET = 6000;
const tz = "Europe/Berlin";
const est = (t: number, cps: Checkpoint[] = [], finishedAt: number | null = null) =>
  estimate({ plannedStart: START, actualStart: null, finishedAt, targetSec: TARGET }, cps, DIST, t);

describe("splitPoints", () => {
  it("every 5 km, the turn and the finish, like the legacy table for Hamburg", () => {
    expect(splitPoints(DIST, 17)).toEqual([
      { km: 5, name: "5 km" },
      { km: 10, name: "10 km" },
      { km: 15, name: "15 km" },
      { km: 17, name: "Wende" },
      { km: 20, name: "20 km" },
      { km: DIST, name: "Ziel" },
    ]);
  });
  it("a marathon without a turn: 5 to 40 km and the finish", () => {
    const p = splitPoints(42.195);
    expect(p.map((x) => x.name)).toEqual(["5 km", "10 km", "15 km", "20 km", "25 km", "30 km", "35 km", "40 km", "Ziel"]);
  });
  it("no 5 km point right at the finish", () => {
    expect(splitPoints(10).map((x) => x.name)).toEqual(["5 km", "Ziel"]);
  });
});

describe("splitRows", () => {
  const points = splitPoints(DIST, 17);

  it("before the start: planned times, marked as plan", () => {
    const r = splitRows(est(START - 3600_000), points, tz);
    expect(r[0]).toEqual({ name: "5 km", time: "23:42", clock: "09:08", pace: "4:44", src: { kind: "plan", text: "Plan" } });
    expect(r[5]).toMatchObject({ name: "Ziel", time: "1:40:00", clock: "10:25", src: { kind: "plan", text: "Plan" } });
  });
  it("while running: passed points estimated, the rest a forecast, official splits as such", () => {
    const t = START + 3600_000;
    const r = splitRows(est(t, [{ km: 10, netSec: 2900, at: null, src: "official" }]), points, tz);
    expect(r[0].src).toEqual({ kind: "seen", text: "geschätzt" });
    expect(r[1]).toMatchObject({ time: "48:20", clock: "09:33", src: { kind: "official", text: "offiziell" } });
    expect(r[5].src).toEqual({ kind: "plan", text: "Prognose" });
  });
  it("pace per segment between the points", () => {
    const r = splitRows(est(START - 1), points, tz);
    expect(r.map((x) => x.pace)).toEqual(["4:44", "4:44", "4:44", "4:44", "4:44", "4:44"]);
  });
  it("at the finish: the finish time is marked as finish", () => {
    const fin = START + 6425_000;
    const r = splitRows(est(fin + 1, [], fin), points, tz);
    expect(r[5]).toMatchObject({ name: "Ziel", time: "1:47:05", clock: "10:32", src: { kind: "official", text: "Ziel" } });
    expect(r[0].src?.text).toBe("geschätzt");
  });
});
