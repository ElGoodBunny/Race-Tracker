import { describe, expect, it } from "vitest";
import raceJson from "../src/content/races/hamburg-2026.json";
import replay from "../public/data/hamburg-2026/replay.json";
import type { CourseData } from "../src/lib/course";
import { projectOnCourse, sampleAt, type ReplaySample } from "../src/lib/replay";

const course = raceJson.course as unknown as CourseData;
const samples: ReplaySample[] = replay.t.map((t, i) => ({
  t, km: replay.km[i], lat: replay.lat[i], lng: replay.lng[i], hr: replay.hr[i], cad: replay.cad[i], alt: replay.alt[i],
}));

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

  it("interpolates between samples", () => {
    const a = sampleAt(samples, 1000);
    const b = sampleAt(samples, 1004);
    expect(b.km).toBeGreaterThanOrEqual(a.km);
  });
});
