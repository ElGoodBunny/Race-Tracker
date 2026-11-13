import { describe, expect, it } from "vitest";
import raceJson from "../src/content/races/hamburg-2026.json";
import { latLngAt, type CourseData } from "../src/lib/course";
import { HEADING_M, makeLocal, makeTrack } from "../src/lib/view3d/world";

const race = raceJson;
const c = race.course as unknown as CourseData;
const local = makeLocal(c.route[0]);
const track = makeTrack(c, local);
const last = c.km[c.km.length - 1];

describe("makeLocal", () => {
  it("puts the origin at 0/0, x east and y north", () => {
    const [lat, lng] = c.route[0];
    expect(local.toXY(lat, lng)).toEqual([0, 0]);
    const [ex, ey] = local.toXY(lat, lng + 0.01);
    expect(ex).toBeGreaterThan(600);
    expect(ey).toBe(0);
    const [nx, ny] = local.toXY(lat + 0.01, lng);
    expect(nx).toBe(0);
    expect(ny).toBeCloseTo(1112, 0);
  });
});

describe("makeTrack", () => {
  it("starts at 0/0", () => {
    const p = track.at(0);
    expect(p.x).toBe(0);
    expect(p.y).toBe(0);
  });

  it("stays within 1 m of latLngAt every 10 m along the course", () => {
    let worst = 0;
    for (let km = 0; km <= last; km += 0.01) {
      const [lat, lng] = latLngAt(c, km);
      const [x, y] = local.toXY(lat, lng);
      const p = track.at(km);
      worst = Math.max(worst, Math.hypot(p.x - x, p.y - y));
    }
    expect(worst).toBeLessThanOrEqual(1);
  });

  it("clamps to start and finish", () => {
    expect(track.at(-1)).toEqual(track.at(0));
    expect(track.at(999)).toEqual(track.at(last));
  });

  it("gives a unit direction everywhere, also at the ends and on the turn", () => {
    for (const km of [0, 0.001, race.turnKm, last - 0.001, last, ...Array.from({ length: 212 }, (_, i) => i / 10)]) {
      const p = track.at(km);
      expect(Math.hypot(p.dx, p.dy)).toBeCloseTo(1, 6);
    }
  });

  it("turns the direction around at the turn", () => {
    const before = track.at(race.turnKm - 2 * (HEADING_M / 1000));
    const after = track.at(race.turnKm + 2 * (HEADING_M / 1000));
    expect(before.dx * after.dx + before.dy * after.dy).toBeLessThan(-0.9);
  });

  it("keeps a direction on an exact out and back", () => {
    // 0.2 km north and the same way back, so at the tip both ends of the window coincide.
    const o: [number, number] = [53.5, 10];
    const tip: [number, number] = [53.5 + 0.2 / 111.195, 10];
    const t = makeTrack({ route: [o, tip, o], km: [0, 0.2, 0.4] }, makeLocal(o));
    const p = t.at(0.2);
    expect(p.dy).toBeCloseTo(-1, 6); // the stretch ahead
    expect(t.at(0.1).dy).toBeCloseTo(1, 6);
    expect(t.at(0.3).dy).toBeCloseTo(-1, 6);
  });

  it("points along the course on a straight stretch", () => {
    const p = track.at(5);
    const a = track.at(4.99);
    const b = track.at(5.01);
    const len = Math.hypot(b.x - a.x, b.y - a.y);
    expect(p.dx * ((b.x - a.x) / len) + p.dy * ((b.y - a.y) / len)).toBeGreaterThan(0.9);
  });
});
