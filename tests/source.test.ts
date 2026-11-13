import { describe, expect, it } from "vitest";
import replay from "../public/data/hamburg-2026/replay.json";
import { createClock } from "../src/lib/live/clock";
import raceJson from "../src/content/races/barcelona-2027.json";
import type { CourseData } from "../src/lib/course";
import { PACE_WINDOW_S, replaySource, rescaleSource } from "../src/lib/live/source";

const source = replaySource(replay);

describe("replaySource", () => {
  it("Puls ist echt: at 1:00:00 the source gives 174 from replay.json", () => {
    expect(source.sampleAt(3600).hr).toBe(174);
  });

  it("gives exactly the values from the file at every measurement point", () => {
    for (let i = 0; i < replay.t.length; i++) {
      const s = source.sampleAt(replay.t[i]);
      expect([s.km, s.lat, s.lng, s.hr, s.cad, s.alt]).toEqual([replay.km[i], replay.lat[i], replay.lng[i], replay.hr[i], replay.cad[i], replay.alt[i]]);
    }
  });

  it("knows its duration", () => {
    expect(source.duration).toBe(replay.t.at(-1));
  });

  it("Jeder Messwert kommt an: 30 s at 10x give a new km for every measurement point", () => {
    const from = 3600;
    const points = replay.t.map((t, i) => ({ t, km: replay.km[i] })).filter((p) => p.t > from && p.t <= from + 300);
    // Precondition: the runner moves in this window, every point has a higher km than the one before.
    expect(points.length).toBeGreaterThan(60);
    for (let i = 1; i < points.length; i++) expect(points[i].km).toBeGreaterThan(points[i - 1].km);

    const clock = createClock(source.duration, from);
    clock.setSpeed(10, 0);
    clock.play(0);
    const frames: { t: number; km: number }[] = [];
    for (let frame = 1; frame <= 30 * 60; frame++) {
      const t = clock.time((frame * 1000) / 60);
      frames.push({ t, km: source.sampleAt(t).km });
    }
    expect(frames.at(-1)!.t).toBeCloseTo(from + 300, 6);

    // The first frame at or after each measurement point shows a higher km than at the point before.
    let prevKm = source.sampleAt(from).km;
    for (const p of points) {
      const f = frames.find((x) => x.t >= p.t)!;
      expect(f.km).toBeGreaterThan(prevKm);
      prevKm = f.km;
    }
  });
});

describe("replaySource pace and quality", () => {
  it("gives the pace of the last 30 s from the file and marks it as measured", () => {
    const s = source.sampleAt(3600);
    const before = source.sampleAt(3600 - PACE_WINDOW_S);
    expect(s.pace).toBeCloseTo(PACE_WINDOW_S / (s.km - before.km), 6);
    expect(s.pace).toBeGreaterThan(240); // between 4:00 and 6:30 per km at 1:00:00
    expect(s.pace).toBeLessThan(390);
    expect(s.quality).toBe("measured");
  });

  it("has no pace at the start", () => {
    expect(source.sampleAt(0).pace).toBeNull();
  });
});

describe("rescaleSource (demo with data from Hamburg on the Barcelona course)", () => {
  const course = raceJson.course as unknown as CourseData;
  const recordedKm = replay.km.at(-1)!;
  const f = 42.195 / recordedKm;
  const demo = rescaleSource(source, recordedKm, course);

  it("ends at the finish of the other course and stretches the time by the same factor", () => {
    expect(demo.duration).toBeCloseTo(source.duration * f, 6);
    const end = demo.sampleAt(demo.duration);
    expect(end.km).toBeCloseTo(42.195, 6);
    expect(end.t).toBeCloseTo(demo.duration, 6);
  });

  it("keeps pulse, cadence and pace of the recording at the same share of the race", () => {
    const orig = source.sampleAt(3600);
    const s = demo.sampleAt(3600 * f);
    expect(s.km).toBeCloseTo(orig.km * f, 6);
    expect(s.hr).toBe(174);
    expect(s.cad).toBe(orig.cad);
    expect(s.pace).toBe(orig.pace);
    expect(s.quality).toBe("measured");
  });

  it("puts the position on the new course and drops the altitude of the other city", () => {
    const s = demo.sampleAt(demo.duration / 2);
    expect(s.lat).toBeGreaterThan(41.3);
    expect(s.lat).toBeLessThan(41.5);
    expect(s.lng).toBeGreaterThan(2.1);
    expect(s.lng).toBeLessThan(2.3);
    expect(s.alt).toBeNull();
  });

  it("runs monotonic from start to finish", () => {
    let last = -1;
    for (let t = 0; t <= demo.duration; t += 60) {
      const km = demo.sampleAt(t).km;
      expect(km).toBeGreaterThanOrEqual(last);
      last = km;
    }
  });
});
