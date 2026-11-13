// Scene geometry as plain number arrays (docs/decisions/2026-11-13-3d-konzept.md, step 4).
// Input is SceneData, scene.json after unpackScene (x east, y north, metres). Output is in three.js axes via toThree from world.ts,
// so the view can hand the arrays straight to a BufferGeometry.
// Only the triangulation comes from three.js.

import { ShapeUtils, Vector2 } from "three";
import { toThree } from "./world";

export const TILE_M = 400;

export interface Mesh {
  /** x, y, z per vertex. */
  positions: Float32Array;
  /** Three vertex indices per triangle, counter-clockwise seen from the front. */
  indices: Uint32Array;
}

export interface Polygon {
  /** Closed ring, flat [x, y, ...], last point repeats the first. */
  ring: number[];
  holes?: number[][];
}

export interface Building extends Polygon {
  h: number;
}

export interface Tile<T> {
  ix: number;
  iy: number;
  buildings: T[];
}

/** Ring without its closing point, as Vector2 for the triangulation. */
function points(ring: number[]): Vector2[] {
  const out: Vector2[] = [];
  for (let i = 0; i + 1 < ring.length - 2; i += 2) out.push(new Vector2(ring[i], ring[i + 1]));
  return out;
}

/** Outer ring counter-clockwise, holes clockwise (seen from above, north up). */
function oriented(p: Polygon): Vector2[][] {
  const outer = points(p.ring);
  if (ShapeUtils.isClockWise(outer)) outer.reverse();
  const holes = (p.holes ?? []).map(points);
  for (const h of holes) if (!ShapeUtils.isClockWise(h)) h.reverse();
  return [outer, ...holes];
}

/** Roof or ground triangles on the given vertices, each turned to face up. */
function cover(rings: Vector2[][], base: number, out: number[]) {
  const all = rings.flat();
  for (const [a, b, c] of ShapeUtils.triangulateShape(rings[0], rings.slice(1))) {
    const pa = all[a];
    const pb = all[b];
    const pc = all[c];
    const ccw = (pb.x - pa.x) * (pc.y - pa.y) - (pb.y - pa.y) * (pc.x - pa.x) > 0;
    out.push(base + a, base + (ccw ? b : c), base + (ccw ? c : b));
  }
}

class Builder {
  pos: number[] = [];
  idx: number[] = [];
  vertex(p: Vector2, y: number) {
    this.pos.push(...toThree(p.x, p.y, y));
  }
  mesh(): Mesh {
    return { positions: new Float32Array(this.pos), indices: new Uint32Array(this.idx) };
  }
}

/**
 * Buildings as one mesh: walls with 2 triangles per edge and a flat roof.
 * Walls and roof share the corners, edges come from flatShading in the material.
 */
export function buildingMesh(buildings: Building[]): Mesh {
  const m = new Builder();
  for (const b of buildings) {
    const rings = oriented(b);
    const n = rings.reduce((s, r) => s + r.length, 0);
    if (rings[0].length < 3) continue;
    const top = m.pos.length / 3;
    const bottom = top + n;
    for (const r of rings) for (const p of r) m.vertex(p, b.h);
    for (const r of rings) for (const p of r) m.vertex(p, 0);
    cover(rings, top, m.idx);
    // Walls face to the right of the ring direction: out of the building, into a courtyard.
    let start = 0;
    for (const r of rings) {
      for (let i = 0; i < r.length; i++) {
        const a = start + i;
        const c = start + ((i + 1) % r.length);
        m.idx.push(bottom + a, bottom + c, top + c, bottom + a, top + c, top + a);
      }
      start += r.length;
    }
  }
  return m.mesh();
}

/** Flat areas (water, parks) on the ground, facing up, holes left open. */
export function areaMesh(polygons: Polygon[]): Mesh {
  const m = new Builder();
  for (const p of polygons) {
    const rings = oriented(p);
    if (rings[0].length < 3) continue;
    const base = m.pos.length / 3;
    for (const r of rings) for (const q of r) m.vertex(q, 0);
    cover(rings, base, m.idx);
  }
  return m.mesh();
}

/** Buildings grouped into square tiles by the centre of their outer ring, sorted by tile. */
export function groupTiles<T extends Polygon>(buildings: T[], size = TILE_M): Tile<T>[] {
  const tiles = new Map<string, Tile<T>>();
  for (const b of buildings) {
    const r = b.ring;
    const k = r.length / 2 - 1; // without the closing point
    let x = 0;
    let y = 0;
    for (let i = 0; i < r.length - 2; i += 2) {
      x += r[i];
      y += r[i + 1];
    }
    const ix = Math.floor(x / k / size);
    const iy = Math.floor(y / k / size);
    const key = `${ix},${iy}`;
    let t = tiles.get(key);
    if (!t) tiles.set(key, (t = { ix, iy, buildings: [] }));
    t.buildings.push(b);
  }
  return [...tiles.values()].sort((a, b) => a.ix - b.ix || a.iy - b.iy);
}

/* ---------- course ribbon (step 7) ---------- */

/** One cross-section of the ribbon at a route point. */
export interface RibbonSection {
  x: number;
  y: number;
  /** Unit vector to the left of the direction of travel, and how far the edge is pushed out along it at a bend (1 on a straight). */
  nx: number;
  ny: number;
  miter: number;
  km: number;
  /** Metres along the ribbon, for the texture that flows along the course. */
  m: number;
}

const MITER_MAX = 2;

/** Cross-sections at the route points. At a bend the edges meet in a mitre, capped so a hairpin does not grow a spike. */
export function ribbonSections(xy: readonly (readonly [number, number])[], km: readonly number[]): RibbonSection[] {
  const left = (a: readonly [number, number], b: readonly [number, number]): [number, number] | null => {
    const dx = b[0] - a[0];
    const dy = b[1] - a[1];
    const len = Math.hypot(dx, dy);
    return len < 1e-6 ? null : [-dy / len, dx / len];
  };
  const out: RibbonSection[] = [];
  let m = 0;
  for (let i = 0; i < xy.length; i++) {
    if (i) m += Math.hypot(xy[i][0] - xy[i - 1][0], xy[i][1] - xy[i - 1][1]);
    const before = i ? left(xy[i - 1], xy[i]) : null;
    const after = i < xy.length - 1 ? left(xy[i], xy[i + 1]) : null;
    const a = before ?? after ?? [0, 1];
    const b = after ?? before ?? [0, 1];
    let nx = a[0] + b[0];
    let ny = a[1] + b[1];
    const len = Math.hypot(nx, ny);
    let miter = 1;
    if (len < 1e-3) {
      // Straight back the way it came: no mitre possible, keep the side of the way in.
      [nx, ny] = a;
    } else {
      nx /= len;
      ny /= len;
      miter = Math.min(MITER_MAX, 1 / Math.max(1e-6, nx * a[0] + ny * a[1]));
    }
    out.push({ x: xy[i][0], y: xy[i][1], nx, ny, miter, km: km[i], m });
  }
  return out;
}

/** Left and right vertex per section, flat on the ground, in three.js axes. Cheap enough to call when the width changes. */
export function ribbonPositions(sections: readonly RibbonSection[], width: number, out: Float32Array = new Float32Array(sections.length * 6)): Float32Array {
  const h = width / 2;
  sections.forEach((s, i) => {
    out.set(toThree(s.x + s.nx * s.miter * h, s.y + s.ny * s.miter * h), i * 6);
    out.set(toThree(s.x - s.nx * s.miter * h, s.y - s.ny * s.miter * h), i * 6 + 3);
  });
  return out;
}

/** u runs across the ribbon from 0 to 1, v along it, one unit per `patternM` metres. */
export function ribbonUVs(sections: readonly RibbonSection[], patternM: number): Float32Array {
  const out = new Float32Array(sections.length * 4);
  sections.forEach((s, i) => out.set([0, s.m / patternM, 1, s.m / patternM], i * 4));
  return out;
}

/** Two triangles per stretch between neighbouring sections, facing up. Six indices per stretch, in course order. */
export function ribbonIndices(sectionCount: number): Uint32Array {
  const out = new Uint32Array(Math.max(0, sectionCount - 1) * 6);
  for (let i = 0; i + 1 < sectionCount; i++) {
    const l0 = 2 * i;
    out.set([l0, l0 + 1, l0 + 3, l0, l0 + 3, l0 + 2], i * 6);
  }
  return out;
}

/**
 * Where the run part ends: `whole` stretches lie completely behind the runner (draw 6 × whole indices in the strong colour),
 * the tip is the piece from the last section behind him to his position, as 4 vertices and their uv like the rest.
 */
export function ribbonSplit(sections: readonly RibbonSection[], km: number, at: { x: number; y: number }, width: number, patternM: number) {
  let i = 0;
  while (i + 1 < sections.length && sections[i + 1].km <= km) i++;
  const s = sections[i];
  const h = width / 2;
  const dx = at.x - s.x;
  const dy = at.y - s.y;
  const len = Math.hypot(dx, dy);
  // Side of the stretch the runner is on. Right at a section there is no stretch yet, take the section's own side.
  const [nx, ny] = len < 1e-6 ? [s.nx, s.ny] : [-dy / len, dx / len];
  const v0 = s.m / patternM;
  const v1 = (s.m + len) / patternM;
  return {
    whole: i,
    positions: new Float32Array([
      ...toThree(s.x + s.nx * s.miter * h, s.y + s.ny * s.miter * h),
      ...toThree(s.x - s.nx * s.miter * h, s.y - s.ny * s.miter * h),
      ...toThree(at.x + nx * h, at.y + ny * h),
      ...toThree(at.x - nx * h, at.y - ny * h),
    ]),
    uvs: new Float32Array([0, v0, 1, v0, 0, v1, 1, v1]),
  };
}
