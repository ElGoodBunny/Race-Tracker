import { describe, expect, it } from "vitest";
import raceJson from "../src/content/races/hamburg-2026.json";
import type { CourseData } from "../src/lib/course";
import { ribbonIndices, ribbonPositions, ribbonSections, ribbonSplit, ribbonUVs } from "../src/lib/view3d/geometry";
import { makeLocal, makeTrack } from "../src/lib/view3d/world";

const course = raceJson.course as unknown as CourseData;
const track = makeTrack(course, makeLocal(course.route[0]));
const sections = ribbonSections(track.xy, course.km);

// Straight east, a right angle to the north, then straight back south on the same line (a hairpin).
const xy: [number, number][] = [[0, 0], [100, 0], [100, 50], [100, 0]];
const simple = ribbonSections(xy, [0, 0.1, 0.15, 0.2]);

describe("ribbonSections", () => {
  it("has one section per route point with the metres along the course", () => {
    expect(sections).toHaveLength(course.route.length);
    expect(simple.map((s) => s.m)).toEqual([0, 100, 150, 200]);
    expect(simple.map((s) => s.km)).toEqual([0, 0.1, 0.15, 0.2]);
  });

  it("points left of the direction of travel and mitres a right angle", () => {
    expect([simple[0].nx, simple[0].ny]).toEqual([-0, 1]); // heading east, left is north
    expect(simple[1].miter).toBeCloseTo(Math.SQRT2, 9);
    expect(simple[1].nx).toBeCloseTo(-Math.SQRT1_2, 9);
    expect(simple[1].ny).toBeCloseTo(Math.SQRT1_2, 9);
  });

  it("caps the mitre, so a hairpin grows no spike", () => {
    expect(simple[2].miter).toBe(1);
    for (const s of sections) {
      expect(s.miter).toBeGreaterThanOrEqual(1 - 1e-9);
      expect(s.miter).toBeLessThanOrEqual(2);
      expect(Math.hypot(s.nx, s.ny)).toBeCloseTo(1, 9);
    }
  });
});

describe("ribbon arrays", () => {
  it("gives two vertices per section on the ground, `width` apart on a straight", () => {
    const pos = ribbonPositions(simple, 12);
    expect(pos).toHaveLength(simple.length * 6);
    // First section: x east, y up, north is -z. Left edge 6 m north, right edge 6 m south.
    expect([...pos.slice(0, 6)]).toEqual([0, 0, -6, 0, 0, 6]);
    for (let i = 1; i < pos.length; i += 3) expect(pos[i]).toBe(0);
  });

  it("has two triangles per stretch, in course order", () => {
    const idx = ribbonIndices(simple.length);
    expect(idx).toHaveLength(18);
    expect([...idx.slice(0, 6)]).toEqual([0, 1, 3, 0, 3, 2]);
    expect(Math.max(...idx)).toBe(simple.length * 2 - 1);
    expect(ribbonIndices(sections.length)).toHaveLength((course.route.length - 1) * 6);
  });

  it("runs the texture along the course, one unit per pattern length", () => {
    const uv = ribbonUVs(simple, 25);
    expect([...uv]).toEqual([0, 0, 1, 0, 0, 4, 1, 4, 0, 6, 1, 6, 0, 8, 1, 8]);
  });
});

describe("ribbonSplit", () => {
  it("at km 12 the run part ends under the runner (checkpoint of step 7)", () => {
    const p = track.at(12);
    const split = ribbonSplit(sections, 12, p, 12, 25);
    // All whole stretches lie behind km 12, the next section is ahead.
    expect(sections[split.whole].km).toBeLessThanOrEqual(12);
    expect(sections[split.whole + 1].km).toBeGreaterThan(12);
    // The tip ends exactly at the runner: the middle of its last two vertices is his position.
    const [lx, , lz, rx, , rz] = split.positions.slice(6);
    expect((lx + rx) / 2).toBeCloseTo(p.x, 3);
    expect(-(lz + rz) / 2).toBeCloseTo(p.y, 3);
    expect(Math.hypot(lx - rx, lz - rz)).toBeCloseTo(12, 3);
    // And it starts at the last section behind him, with the same vertices as the ribbon there.
    expect([...split.positions.slice(0, 6)]).toEqual([...ribbonPositions(sections, 12).slice(split.whole * 6, split.whole * 6 + 6)]);
  });

  it("continues the texture from the last section to the runner", () => {
    const split = ribbonSplit(simple, 0.05, { x: 50, y: 0 }, 12, 25);
    expect(split.whole).toBe(0);
    expect([...split.uvs]).toEqual([0, 0, 1, 0, 0, 2, 1, 2]);
  });

  it("covers nothing at the start and everything at the finish", () => {
    expect(ribbonSplit(simple, 0, { x: 0, y: 0 }, 12, 25).whole).toBe(0);
    const end = ribbonSplit(simple, 0.2, { x: 100, y: 0 }, 12, 25);
    expect(end.whole).toBe(simple.length - 1);
  });
});
