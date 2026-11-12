import { describe, expect, it } from "vitest";
import raceJson from "../src/content/races/hamburg-2026.json";
import { haversineKm, landmarkNear, latLngAt, makeProjection, nearestKm, type CourseData } from "../src/lib/course";

const race = raceJson;
const c = race.course as unknown as CourseData;

describe("hamburg-2026 course data", () => {
  it("has one cumulative km value per route point, strictly increasing", () => {
    expect(c.km).toHaveLength(c.route.length);
    for (let i = 1; i < c.km.length; i++) expect(c.km[i]).toBeGreaterThanOrEqual(c.km[i - 1]);
    expect(c.km.at(-1)).toBeCloseTo(race.distanceKm, 2);
  });

  it("stays within 3 % of the measured route length", () => {
    let sum = 0;
    for (let i = 1; i < c.route.length; i++) sum += haversineKm(c.route[i - 1], c.route[i]);
    expect(Math.abs(sum - race.distanceKm) / race.distanceKm).toBeLessThan(0.03);
  });
});

describe("course helpers", () => {
  it("latLngAt returns start and finish at the ends", () => {
    expect(latLngAt(c, -1)).toEqual(c.route[0]);
    expect(latLngAt(c, 999)).toEqual(c.route.at(-1));
  });

  it("nearestKm finds the km of a route point", () => {
    const { project } = makeProjection(c.bounds);
    const pts = c.route.map(project);
    const i = c.landmarks.find((l) => l.name === "Landungsbrücken")!.idx;
    const hit = nearestKm(c, pts, pts[i][0], pts[i][1]);
    expect(hit?.km).toBeCloseTo(c.km[i], 3);
  });

  it("landmarkNear names Landungsbrücken and strips the Ziel prefix", () => {
    const lb = c.landmarks.find((l) => l.name === "Landungsbrücken")!.idx;
    expect(landmarkNear(c, c.km[lb])).toBe("Landungsbrücken");
    expect(landmarkNear(c, c.km.at(-1)!)).toBe("Messe");
  });
});
