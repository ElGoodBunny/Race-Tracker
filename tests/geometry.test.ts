import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import type { SceneData } from "../src/lib/osm";
import { TILE_M, areaMesh, buildingMesh, groupTiles, type Mesh } from "../src/lib/view3d/geometry";

const scene: SceneData = JSON.parse(readFileSync("public/data/hamburg-2026/scene.json", "utf8"));

// Closed rings like in scene.json (last point repeats the first), x east, y north.
const square = (x: number, y: number, s: number) => [x, y, x + s, y, x + s, y + s, x, y + s, x, y];
const squareCw = (x: number, y: number, s: number) => [x, y, x, y + s, x + s, y + s, x + s, y, x, y];

const tris = (m: Mesh) => m.indices.length / 3;
const vertex = (m: Mesh, i: number) => [m.positions[3 * i], m.positions[3 * i + 1], m.positions[3 * i + 2]];
/** Unnormalised normal of triangle t in three.js axes (x east, y up, z south). */
function normal(m: Mesh, t: number) {
  const [a, b, c] = [0, 1, 2].map((k) => vertex(m, m.indices[3 * t + k]));
  const u = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
  const v = [c[0] - a[0], c[1] - a[1], c[2] - a[2]];
  return [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]];
}
const centroid = (m: Mesh, t: number) => {
  const p = [0, 1, 2].map((k) => vertex(m, m.indices[3 * t + k]));
  return [0, 1, 2].map((d) => (p[0][d] + p[1][d] + p[2][d]) / 3);
};
/** Roof triangles are the ones lying flat at height h. */
const roofTris = (m: Mesh, h: number) =>
  Array.from({ length: tris(m) }, (_, t) => t).filter((t) => [0, 1, 2].every((k) => vertex(m, m.indices[3 * t + k])[1] === h));
function flatArea(m: Mesh, ts: number[]) {
  let a = 0;
  for (const t of ts) a += Math.hypot(...normal(m, t)) / 2;
  return a;
}

describe("buildingMesh", () => {
  it("makes 2 triangles per wall and n minus 2 for the roof of a known outline", () => {
    // L shape with 6 corners: 12 wall triangles, 4 roof triangles.
    const l = [0, 0, 20, 0, 20, 10, 10, 10, 10, 20, 0, 20, 0, 0];
    const m = buildingMesh([{ ring: l, h: 14 }]);
    expect(tris(m)).toBe(16);
    expect(m.positions.length / 3).toBe(12); // walls and roof share the corners, top and bottom
  });

  it("puts the roof at the building height and the walls on the ground", () => {
    const m = buildingMesh([{ ring: square(0, 0, 10), h: 17.5 }]);
    const ys = Array.from({ length: m.positions.length / 3 }, (_, i) => vertex(m, i)[1]);
    expect(Math.min(...ys)).toBe(0);
    expect(Math.max(...ys)).toBe(17.5);
  });

  it("maps north to minus z", () => {
    const m = buildingMesh([{ ring: square(100, 200, 10), h: 10 }]);
    const zs = Array.from({ length: m.positions.length / 3 }, (_, i) => vertex(m, i)[2]);
    expect(Math.min(...zs)).toBe(-210);
    expect(Math.max(...zs)).toBe(-200);
  });

  it("faces roofs up and walls outwards, whatever the ring direction", () => {
    for (const ring of [square(0, 0, 10), squareCw(0, 0, 10)]) {
      const m = buildingMesh([{ ring, h: 10 }]);
      const roof = roofTris(m, 10);
      expect(roof).toHaveLength(2);
      for (const t of roof) expect(normal(m, t)[1]).toBeGreaterThan(0);
      for (let t = 0; t < tris(m); t++) {
        if (roof.includes(t)) continue;
        const n = normal(m, t);
        const c = centroid(m, t);
        // Outwards: the normal points away from the centre of the square (5, 5 in x and z = -5).
        expect(n[0] * (c[0] - 5) + n[2] * (c[2] + 5)).toBeGreaterThan(0);
      }
    }
  });

  it("keeps the courtyard open and faces its walls into the courtyard", () => {
    const m = buildingMesh([{ ring: square(0, 0, 30), h: 12, holes: [square(10, 10, 10)] }]);
    expect(tris(m)).toBe(16 + 8); // 8 walls of 2 triangles, roof 8 + 2 * 1 - 2
    const roof = roofTris(m, 12);
    expect(flatArea(m, roof)).toBeCloseTo(900 - 100, 6);
    // No roof triangle covers the middle of the courtyard (15, 15).
    for (const t of roof) {
      const [a, b, c] = [0, 1, 2].map((k) => vertex(m, m.indices[3 * t + k])).map((p) => [p[0], -p[2]]);
      const side = (p: number[], q: number[]) => (q[0] - p[0]) * (15 - p[1]) - (q[1] - p[1]) * (15 - p[0]);
      const s = [side(a, b), side(b, c), side(c, a)];
      expect(s.every((v) => v > 0) || s.every((v) => v < 0)).toBe(false);
    }
    // Courtyard walls face the courtyard centre (15, 15), outer walls face away from it.
    for (let t = 0; t < tris(m); t++) {
      if (roof.includes(t)) continue;
      const n = normal(m, t);
      const c = centroid(m, t);
      const towards = n[0] * (15 - c[0]) + n[2] * (-15 - c[2]);
      const inner = c[0] > 9 && c[0] < 21 && -c[2] > 9 && -c[2] < 21;
      expect(inner ? towards > 0 : towards < 0).toBe(true);
    }
  });
});

describe("areaMesh", () => {
  it("lays water flat on the ground, facing up, with the island left out", () => {
    const m = areaMesh([{ ring: squareCw(0, 0, 100), holes: [square(40, 40, 20)] }]);
    const ys = Array.from({ length: m.positions.length / 3 }, (_, i) => vertex(m, i)[1]);
    expect(Math.max(...ys.map(Math.abs))).toBe(0);
    const all = Array.from({ length: tris(m) }, (_, t) => t);
    for (const t of all) expect(normal(m, t)[1]).toBeGreaterThan(0);
    expect(flatArea(m, all)).toBeCloseTo(10000 - 400, 6);
  });
});

describe("groupTiles", () => {
  it("puts every building into exactly one 400 m tile by its centre, also west and south of the start", () => {
    const bs = [
      { ring: square(10, 10, 10), h: 10 },
      { ring: square(390, 10, 20), h: 10 }, // centre at 400: next tile
      { ring: square(-30, -30, 10), h: 10 },
    ];
    const tiles = groupTiles(bs);
    expect(TILE_M).toBe(400);
    expect(tiles.map((t) => [t.ix, t.iy, t.buildings.length])).toEqual([
      [-1, -1, 1],
      [0, 0, 1],
      [1, 0, 1],
    ]);
  });
});

describe("hamburg-2026 scene", () => {
  const tiles = groupTiles(scene.buildings);
  const meshes = tiles.map((t) => buildingMesh(t.buildings));
  let points = 0;
  let holes = 0;
  for (const b of scene.buildings) for (const r of [b.ring, ...(b.holes ?? [])]) points += r.length / 2 - 1;
  for (const b of scene.buildings) holes += b.holes?.length ?? 0;
  const B = scene.buildings.length;

  it("keeps every building in exactly one tile", () => {
    expect(tiles.reduce((n, t) => n + t.buildings.length, 0)).toBe(B);
  });

  it("has 2 wall triangles per corner and at most n minus 2 plus 2 per courtyard for the roofs", () => {
    const total = meshes.reduce((n, m) => n + tris(m), 0);
    const max = 2 * points + points + 2 * holes - 2 * B;
    expect(total).toBeLessThanOrEqual(max);
    expect(total).toBeGreaterThan(0.99 * max);
    // Checkpoint B estimated about 350,000 but counted the closing point of every ring twice.
    expect(total).toBeGreaterThan(300_000);
    expect(total).toBeLessThan(320_000);
  });

  it("gives every building a roof as large as its outline minus its courtyards", () => {
    let missing = 0;
    for (const b of scene.buildings) {
      const m = buildingMesh([b]);
      const area = (r: number[]) => {
        let a = 0;
        for (let i = 0; i + 3 < r.length; i += 2) a += r[i] * r[i + 3] - r[i + 2] * r[i + 1];
        return Math.abs(a / 2);
      };
      const want = area(b.ring) - (b.holes ?? []).reduce((s, h) => s + area(h), 0);
      if (Math.abs(flatArea(m, roofTris(m, b.h)) - want) > 0.01 * want + 0.5) missing++;
    }
    expect(missing).toBe(0);
  });
});
