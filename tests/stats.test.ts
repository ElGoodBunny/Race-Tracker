import { describe, expect, it } from "vitest";
import replay from "../public/data/hamburg-2026/replay.json";
import hamburgJson from "../src/content/races/hamburg-2026.json";
import type { CourseData } from "../src/lib/course";
import type { ReplaySample } from "../src/lib/replay";
import { createStats, finishForecast, passedLandmark } from "../src/lib/live/stats";

const hamburg = hamburgJson.course as unknown as CourseData;
const points: ReplaySample[] = replay.t.map((t, i) => ({ t, km: replay.km[i], lat: 0, lng: 0, hr: replay.hr[i], cad: replay.cad[i], alt: replay.alt[i] }));
const pt = (t: number, km: number, hr: number | null): ReplaySample => ({ t, km, lat: 0, lng: 0, hr, cad: null, alt: null });

describe("splits", () => {
  // 5:00 for the first km, 4:00 for the second, then still running.
  const stats = createStats([pt(0, 0, 120), pt(150, 0.5, 140), pt(300, 1, 150), pt(420, 1.5, 160), pt(540, 2, 170), pt(600, 2.25, 165)]);

  it("gives the time of every full km run so far", () => {
    expect(stats.splits(299)).toEqual([]);
    expect(stats.splits(300)).toEqual([300]);
    expect(stats.splits(600)).toEqual([300, 240]);
  });

  it("interpolates the crossing between two measurements", () => {
    const s = createStats([pt(0, 0, null), pt(100, 0.4, null), pt(400, 1.4, null)]).splits(400);
    expect(s).toHaveLength(1);
    expect(s[0]).toBeCloseTo(280, 9); // km 1 is 0.6 of the way from 100 to 400 s
  });

  it("adds up to the time at the last full km of the Hamburg replay", () => {
    const s = createStats(points).splits(replay.t.at(-1)!);
    expect(s).toHaveLength(21);
    const sum = s.reduce((a, b) => a + b, 0);
    expect(sum).toBeGreaterThan(5800);
    expect(sum).toBeLessThan(replay.t.at(-1)!);
    expect(Math.min(...s)).toBeGreaterThan(200);
  });
});

describe("pulse", () => {
  const stats = createStats([pt(0, 0, 120), pt(10, 0.03, null), pt(20, 0.06, 150), pt(30, 0.09, 180), pt(40, 0.12, 90)]);

  it("averages and takes the maximum over the measurements up to t, gaps skipped", () => {
    expect(stats.hr(25)).toEqual({ avg: 135, max: 150 });
    expect(stats.hr(40)).toEqual({ avg: 135, max: 180 });
  });

  it("has nothing before the first pulse", () => {
    expect(createStats([pt(0, 0, null), pt(10, 0.03, 140)]).hr(5)).toBeNull();
  });

  it("gives the pulse curve of the last window, oldest first", () => {
    expect(stats.hrTrail(40, 25)).toEqual([150, 180, 90]);
  });

  it("Puls ist echt: the curve ends with the value of replay.json", () => {
    const i = replay.t.findIndex((t) => t >= 3600);
    expect(createStats(points).hrTrail(replay.t[i], 300).at(-1)).toBe(replay.hr[i]);
  });
});

describe("finishForecast", () => {
  it("projects the average pace to the finish", () => {
    expect(finishForecast(3000, 10, 42.195)).toBeCloseTo(12658.5, 6);
  });
  it("has no forecast in the first km", () => {
    expect(finishForecast(200, 0.6, 42.195)).toBeNull();
  });
});

describe("passedLandmark", () => {
  it("names the last landmark behind the runner", () => {
    const named = hamburg.landmarks.map((l) => ({ name: l.name, km: hamburg.km[l.idx] })).sort((a, b) => a.km - b.km);
    const mid = named[Math.floor(named.length / 2)];
    expect(passedLandmark(hamburg, mid.km + 0.01)).toBe(mid.name);
    expect(passedLandmark(hamburg, -1)).toBeNull();
  });

  it("says nothing when the last landmark is more than 2 km behind", () => {
    const course = { km: [0, 5, 10], landmarks: [{ name: "Start Rathaus", idx: 0 }, { name: "Hafen", idx: 1 }] } as unknown as CourseData;
    expect(passedLandmark(course, 6.9)).toBe("Hafen");
    expect(passedLandmark(course, 7.1)).toBeNull();
    expect(passedLandmark(course, 1)).toBe("Rathaus");
  });
});
