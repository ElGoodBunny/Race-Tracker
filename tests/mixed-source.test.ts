import { describe, expect, it } from "vitest";
import replay from "../public/data/hamburg-2026/replay.json";
import raceJson from "../src/content/races/barcelona-2027.json";
import hamburgJson from "../src/content/races/hamburg-2026.json";
import type { CourseData } from "../src/lib/course";
import type { ReplaySample } from "../src/lib/replay";
import { mixedSource, replaySource, rescaleSource, type Sample, type Source } from "../src/lib/live/source";

const hamburg = hamburgJson.course as unknown as CourseData;
const barcelona = raceJson.course as unknown as CourseData;
const points: ReplaySample[] = replay.t.map((t, i) => ({ t, km: replay.km[i], lat: replay.lat[i], lng: replay.lng[i], hr: replay.hr[i], cad: replay.cad[i], alt: replay.alt[i] }));
/** Below the 60 s of the check. The real threshold is set after the LiveTrack measurement (phase 2b). */
const STALE_S = 30;
const withoutAge = ({ age: _age, ...s }: Sample) => s;

/** Samples every step seconds from a to b. */
function walk(src: Source, a: number, b: number, step = 0.25): Sample[] {
  const out: Sample[] = [];
  for (let t = a; t <= b; t += step) out.push(src.sampleAt(t));
  return out;
}

/** km never goes back, and never moves faster than maxKmPerS between two samples. */
function expectSmooth(samples: Sample[], maxKmPerS: number) {
  for (let i = 1; i < samples.length; i++) {
    const dkm = samples[i].km - samples[i - 1].km;
    const dt = samples[i].t - samples[i - 1].t;
    expect(dkm, `at t=${samples[i].t}`).toBeGreaterThanOrEqual(-1e-9);
    expect(dkm / dt, `at t=${samples[i].t}`).toBeLessThanOrEqual(maxKmPerS);
  }
}

/** Steady runner: km = t / pace (s per km), every 4 s, without the points in [cutFrom, cutTo). */
function steady(pace: number, until: number, cutFrom = Infinity, cutTo = -Infinity, paceAfter = pace): ReplaySample[] {
  const out: ReplaySample[] = [];
  for (let t = 4; t <= until; t += 4) {
    if (t >= cutFrom && t < cutTo) continue;
    const km = t <= cutFrom ? t / pace : cutFrom / pace + (t - cutFrom) / paceAfter;
    out.push({ t, km, lat: 0, lng: 0, hr: 150, cad: 170, alt: 10 });
  }
  return out;
}

describe("mixedSource without gaps", () => {
  const mixed = mixedSource(points, { staleS: STALE_S, course: hamburg, targetSec: 6600 });
  const plain = replaySource(replay);

  it("gives exactly the replay source, so Puls ist echt still holds (174 at 1:00:00)", () => {
    for (let t = 0; t <= plain.duration; t += 7.3) expect(withoutAge(mixed.sampleAt(t))).toEqual(plain.sampleAt(t));
    expect(mixed.sampleAt(3600).hr).toBe(174);
    expect(mixed.duration).toBe(plain.duration);
  });

  it("the largest spacing in replay.json stays below the threshold, the replay never turns estimated by itself", () => {
    expect(walk(mixed, 0, plain.duration, 1).every((s) => s.quality === "measured")).toBe(true);
  });

  it("tells the age of the latest measurement", () => {
    const i = points.findIndex((p) => p.t > 3600);
    const s = mixed.sampleAt(points[i - 1].t + 1);
    expect(s.age).toBeCloseTo(1, 9);
  });
});

describe("Rückfall ohne Sprung: 60 s of telemetry cut in the Hamburg replay", () => {
  const cut = points.filter((p) => p.t < 3000 || p.t >= 3060);
  const mixed = mixedSource(cut, { staleS: STALE_S, course: hamburg, targetSec: 6600 });

  it("km runs on smoothly: never back, never faster than 12 m/s", () => {
    expectSmooth(walk(mixed, 2900, 3400), 0.012);
  });

  it("switches to estimated once the latest measurement is older than the threshold, and back when data returns", () => {
    const last = cut.filter((p) => p.t < 3000).at(-1)!.t;
    expect(mixed.sampleAt(last + STALE_S - 1).quality).toBe("measured");
    expect(mixed.sampleAt(last + STALE_S + 1).quality).toBe("estimated");
    expect(mixed.sampleAt(3060).quality).toBe("measured");
  });

  it("an estimated sample carries no measurements, only the course position", () => {
    const s = mixed.sampleAt(3045);
    expect([s.hr, s.cad, s.alt]).toEqual([null, null, null]);
    expect(s.pace).toBeGreaterThan(160);
    expect(s.lat).not.toBe(0);
  });

  it("is back on the measured km a little after the data returns", () => {
    const plain = replaySource(replay);
    expect(mixed.sampleAt(3300).km).toBeCloseTo(plain.sampleAt(3300).km, 9);
  });

  it("depends on t only, the order of the calls does not matter", () => {
    const a = mixed.sampleAt(3100);
    walk(mixed, 3400, 2900, -5);
    expect(mixed.sampleAt(3100)).toEqual(a);
  });
});

describe("return after a gap in both directions (synthetic runner at 5:00 /km)", () => {
  it("runner much slower during the gap: the estimate is ahead, km still never goes back", () => {
    const pts = steady(300, 3000, 1200, 1500, 900);
    const mixed = mixedSource(pts, { staleS: STALE_S, course: hamburg, targetSec: 6600 });
    expect(mixed.sampleAt(1496).km - pts.find((p) => p.t >= 1500)!.km).toBeGreaterThan(0.3);
    expectSmooth(walk(mixed, 1100, 2600), 1 / 300 * 1.6);
  });

  it("runner much faster during the gap: the estimate is behind, no jump forward", () => {
    const pts = steady(300, 3000, 1200, 1500, 150);
    const mixed = mixedSource(pts, { staleS: STALE_S, course: hamburg, targetSec: 6600 });
    expect(pts.find((p) => p.t >= 1500)!.km - mixed.sampleAt(1496).km).toBeGreaterThan(0.3);
    expectSmooth(walk(mixed, 1100, 2600), (1 / 150) * 1.6);
  });
});

describe("before the first measurement and after the last", () => {
  it("without any telemetry it runs on the target pace, estimated", () => {
    const mixed = mixedSource([], { staleS: STALE_S, course: hamburg, targetSec: 6330 });
    const s = mixed.sampleAt(600);
    expect(s.quality).toBe("estimated");
    expect(s.km).toBeCloseTo((600 / 6330) * hamburg.km.at(-1)!, 6);
    expect(s.age).toBeUndefined();
  });

  it("keeps going from the last measurement when the data stops, and stops just before the finish", () => {
    const pts = steady(300, 1200);
    const mixed = mixedSource(pts, { staleS: STALE_S, course: hamburg, targetSec: 6600 });
    expect(mixed.sampleAt(1500).km).toBeCloseTo(5, 1);
    expect(mixed.sampleAt(100_000).km).toBeLessThan(hamburg.km.at(-1)!);
    expectSmooth(walk(mixed, 1100, 1600), 1 / 300 * 1.6);
  });
});

describe("Rückfall ohne Sprung on the Barcelona demo (time stretched by about 2)", () => {
  const demo = rescaleSource(replaySource(replay), replay.km.at(-1)!, barcelona);
  const f = demo.duration / replay.t.at(-1)!;
  // The mix works in the displayed race time: 60 s cut there, not 60 s of the recording.
  const demoPoints = replay.t.map((t) => demo.sampleAt(t * f)).filter((s) => s.t < 6000 || s.t >= 6060);
  const mixed = mixedSource(demoPoints, { staleS: STALE_S, course: barcelona, targetSec: 4 * 3600 });

  it("turns estimated in the cut and runs on without a jump", () => {
    expect(mixed.sampleAt(6050).quality).toBe("estimated");
    expectSmooth(walk(mixed, 5900, 6400), 0.012);
  });
});

describe("at the finish", () => {
  it("does not step back when the data stops within the last 50 m", () => {
    const mixed = mixedSource(points, { staleS: STALE_S, course: hamburg, targetSec: 6600 });
    const end = mixed.sampleAt(mixed.duration).km;
    expect(mixed.sampleAt(mixed.duration + 1).km).toBeGreaterThanOrEqual(end);
    expect(mixed.sampleAt(mixed.duration + 600).km).toBeGreaterThanOrEqual(end);
  });
});
