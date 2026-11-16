import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { haversineKm, type LatLng } from "../src/lib/course";
import { nearestIndex, parseGpx, snapToRoute, trackToCourse } from "../src/lib/track";

const gpx = readFileSync("tests/fixtures/mini.gpx", "utf8");
const track = parseGpx(gpx);
const length = (pts: LatLng[]) => pts.slice(1).reduce((s, p, i) => s + haversineKm(pts[i], p), 0);

describe("parseGpx", () => {
  it("reads every track point in order, whatever the attribute order, without elevation", () => {
    expect(track).toEqual([
      [41.38, 2.17],
      [41.381, 2.17003],
      [41.382, 2.17],
      [41.382, 2.171],
      [41.382, 2.172],
    ]);
  });

  it("also reads route points", () => {
    expect(parseGpx('<gpx><rte><rtept lat="1.5" lon="2.5"/><rtept lat="1.6" lon="2.6"></rtept></rte></gpx>')).toEqual([
      [1.5, 2.5],
      [1.6, 2.6],
    ]);
  });
});

describe("trackToCourse", () => {
  it("drops points within the tolerance and keeps corners and both ends", () => {
    expect(trackToCourse(track, 4, 1).route).toEqual([
      [41.38, 2.17],
      [41.382, 2.17],
      [41.382, 2.172],
    ]);
    expect(trackToCourse(track, 2, 1).route).toHaveLength(4); // point 1 stays, point 3 lies exactly on the line
  });

  it("measures the length on the full track, so dropped bends still count, and ends exactly at the official distance", () => {
    const c = trackToCourse(track, 4, 0.4);
    expect(c.rawKm).toBeCloseTo(length(track), 9);
    expect(c.rawKm).toBeGreaterThan(length(c.route));
    expect(c.scale).toBeCloseTo(0.4 / length(track), 9);
    expect(c.km[0]).toBe(0);
    expect(c.km.at(-1)).toBe(0.4);
    expect(c.km[1]).toBeCloseTo(length(track.slice(0, 3)) * c.scale, 3);
  });

  it("rounds to 6 decimals", () => {
    expect(trackToCourse([[41.1234567, 2.7654321], [41.2, 2.8]], 0, 1).route).toEqual([[41.123457, 2.765432], [41.2, 2.8]]);
  });
});

describe("snapToRoute", () => {
  const c = trackToCourse(track, 4, 0.4);

  it("puts a new route point where a landmark is closest to a long segment", () => {
    // Beside the middle of the first segment, 20 m west of it.
    const s = snapToRoute(c.route, c.km, [41.381, 2.16976], 0);
    expect(s.idx).toBe(1);
    expect(s.route).toHaveLength(4);
    expect(s.route[1][0]).toBeCloseTo(41.381, 5);
    expect(s.route[1][1]).toBeCloseTo(2.17, 5);
    expect(s.km[1]).toBeCloseTo(c.km[1] / 2, 2);
    expect(s.offM).toBeCloseTo(20, 0);
  });

  it("uses an existing point when the landmark is right at it, and only searches from `from` on", () => {
    const s = snapToRoute(c.route, c.km, [41.382, 2.17], 0);
    expect(s.idx).toBe(1);
    expect(s.route).toBe(c.route);
    const later = snapToRoute(c.route, c.km, [41.38, 2.17], 1);
    expect(later.idx).toBe(1);
  });

  it("keeps the route length and rising km when a point is put in", () => {
    const s = snapToRoute(c.route, c.km, [41.382, 2.17107], 0);
    expect(s.route).toHaveLength(c.route.length + 1);
    expect(length(s.route)).toBeCloseTo(length(c.route), 5);
    expect(s.km.at(-1)).toBe(c.km.at(-1));
    for (let i = 1; i < s.km.length; i++) expect(s.km[i]).toBeGreaterThan(s.km[i - 1]);
  });
});

describe("nearestIndex", () => {
  it("finds the closest route point at or after a start index", () => {
    expect(nearestIndex(track, [41.3819, 2.1701])).toBe(2);
    expect(nearestIndex(track, [41.38, 2.17], 3)).toBe(3);
  });
});
