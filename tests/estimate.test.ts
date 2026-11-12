import { describe, expect, it } from "vitest";
import { estimate, estPassTime, type Checkpoint, type RaceState } from "../src/lib/estimate";

const D = 21.0975;
const T0 = Date.UTC(2026, 9, 25, 8, 45);
const base: RaceState = { plannedStart: T0, actualStart: null, finishedAt: null, targetSec: 6000 };
const min = 60_000;

describe("estimate", () => {
  it("is 'pre' before the start and counts down", () => {
    const e = estimate(base, [], D, T0 - 10 * min);
    expect(e.phase).toBe("pre");
    expect(e.km).toBe(0);
    expect(e.untilMs).toBe(10 * min);
    expect(e.pace).toBeCloseTo(6000 / D);
  });

  it("runs at target pace without checkpoints", () => {
    const e = estimate(base, [], D, T0 + 30 * min);
    expect(e.phase).toBe("run");
    expect(e.km).toBeCloseTo((30 * 60) / (6000 / D), 5);
  });

  it("uses actualStart over plannedStart", () => {
    const e = estimate({ ...base, actualStart: T0 + 5 * min }, [], D, T0 + 5 * min + 1000);
    expect(e.t0).toBe(T0 + 5 * min);
  });

  it("blends segment and overall pace 60/40 after official splits", () => {
    const cps: Checkpoint[] = [
      { km: 5, netSec: 1500, at: null, src: "official" }, // 5:00 /km
      { km: 10, netSec: 2900, at: null, src: "official" }, // 4:40 /km on the segment
    ];
    const e = estimate(base, cps, D, T0 + 2900 * 1000 + 1000);
    const overall = 2900 / 10;
    const seg = (2900 - 1500) / 5;
    expect(e.pace).toBeCloseTo(0.6 * seg + 0.4 * overall, 6);
  });

  it("does not let a sighting override an earlier official split at a higher km", () => {
    const cps: Checkpoint[] = [
      { km: 10, netSec: 3000, at: null, src: "official" },
      { km: 9, netSec: null, at: T0 + 3100 * 1000, src: "seen" },
    ];
    const e = estimate(base, cps, D, T0 + 3200 * 1000);
    expect(e.kept.map((a) => a.km)).toEqual([10]);
  });

  it("clamps pace to 2:40 to 10:00 per km", () => {
    const fast: Checkpoint[] = [{ km: 10, netSec: 600, at: null, src: "official" }];
    expect(estimate(base, fast, D, T0 + 700 * 1000).pace).toBe(160);
  });

  it("is 'done' once a finish split exists", () => {
    const cps: Checkpoint[] = [{ km: D, netSec: 6425, at: null, src: "official" }];
    const e = estimate(base, cps, D, T0 + 7000 * 1000);
    expect(e.phase).toBe("done");
    expect(e.netSec).toBe(6425);
  });

  it("is 'stale' 4.5 h after start without any checkpoint", () => {
    const e = estimate({ ...base, targetSec: 36000 }, [], D, T0 + 4.6 * 3600 * 1000);
    expect(e.phase).toBe("stale");
  });

  it("ignores checkpoints from the future (more than 60 s ahead)", () => {
    const cps: Checkpoint[] = [{ km: 5, netSec: 1500, at: null, src: "official" }];
    const e = estimate(base, cps, D, T0 + 1000 * 1000);
    expect(e.kept).toHaveLength(0);
  });
});

describe("estPassTime", () => {
  it("interpolates between start and the first anchor", () => {
    const cps: Checkpoint[] = [{ km: 10, netSec: 3000, at: null, src: "official" }];
    const e = estimate(base, cps, D, T0 + 3100 * 1000);
    expect(estPassTime(e, 5)).toBe(T0 + 1500 * 1000);
  });
});
