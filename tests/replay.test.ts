import { describe, expect, it } from "vitest";
import raceJson from "../src/content/races/hamburg-2026.json";
import replay from "../public/data/hamburg-2026/replay.json";
import type { CourseData } from "../src/lib/course";
import { projectOnCourse, sampleAt, type ReplaySample } from "../src/lib/replay";

const course = raceJson.course as unknown as CourseData;
const samples: ReplaySample[] = replay.t.map((t, i) => ({
  t, km: replay.km[i], lat: replay.lat[i], lng: replay.lng[i], hr: replay.hr[i], cad: replay.cad[i], alt: replay.alt[i],
}));

/** Longest time in seconds during which km does not grow. */
function longestStall(s: ReplaySample[]): number {
  let longest = 0;
  let since = 0;
  for (let i = 1; i < s.length; i++) {
    if (s[i].km > s[since].km) since = i;
    else longest = Math.max(longest, s[i].t - s[since].t);
  }
  return longest;
}

describe("hamburg-2026 replay", () => {
  it("covers the whole race and ends at the finish", () => {
    expect(samples[0].km).toBeLessThan(0.05);
    expect(samples.at(-1)!.km).toBeCloseTo(raceJson.distanceKm, 2);
    expect(samples.at(-1)!.t).toBeGreaterThan(6400);
  });

  it("never moves backwards and never faster than 8 m/s", () => {
    for (let i = 1; i < samples.length; i++) {
      const dkm = samples[i].km - samples[i - 1].km;
      expect(dkm).toBeGreaterThanOrEqual(0);
      expect((dkm * 1000) / (samples[i].t - samples[i - 1].t)).toBeLessThanOrEqual(8.01);
    }
  });

  it("never stands still for more than 10 s", () => {
    expect(longestStall(samples)).toBeLessThanOrEqual(10);
  });

  it("has heart rate and cadence in steps per minute", () => {
    const mid = sampleAt(samples, 3600);
    expect(mid.hr).toBeGreaterThan(120);
    expect(mid.cad).toBeGreaterThan(140);
  });
});

describe("projectOnCourse", () => {
  it("does not jump across an out-and-back section", () => {
    // Two points on the route around km 3, a few seconds apart: must stay near km 3.
    const i = course.km.findIndex((k) => k > 3);
    const out = projectOnCourse(course, { time: [0, 4], location: [course.route[0], course.route[1]] });
    expect(out[1].km).toBeLessThan(0.1);
    const near = projectOnCourse(course, { time: [0, 900, 904], location: [course.route[0], course.route[i - 1], course.route[i]] });
    expect(near[2].km).toBeLessThan(7.3); // capped by plausible speed, not the far side of the loop
  });

  it("runs through the turn at km 17.0 with a plausible pace", () => {
    // The GPS points from the replay. Out and back lie within a metre of each other at the turn,
    // so the projection must not take the way back before the runner gets there.
    const out = projectOnCourse(course, {
      time: replay.t,
      location: replay.lat.map((lat, i) => [lat, replay.lng[i]] as [number, number]),
      heart_rate: replay.hr,
      cadence: replay.cad.map((c) => c / 2),
      altitude: replay.alt,
    });
    expect(out.at(-1)!.km).toBeCloseTo(raceJson.distanceKm, 1);
    expect(longestStall(out)).toBeLessThanOrEqual(10);
    const turn = out.filter((s) => s.km > 16.7 && s.km < 17.3);
    expect(turn.length).toBeGreaterThan(30);
    // Dima ran about 3.4 m/s here. Over every 20 s the course km may not grow faster than 5 m/s.
    for (const a of turn) {
      const b = turn.find((s) => s.t >= a.t + 20);
      if (b) expect(((b.km - a.km) * 1000) / (b.t - a.t)).toBeLessThanOrEqual(5);
    }
  });

  it("interpolates between samples", () => {
    const a = sampleAt(samples, 1000);
    const b = sampleAt(samples, 1004);
    expect(b.km).toBeGreaterThanOrEqual(a.km);
  });
});
