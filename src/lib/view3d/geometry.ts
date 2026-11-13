// Scene geometry as plain number arrays (docs/decisions/2026-11-13-3d-konzept.md, step 4).
// Input is scene.json (x east, y north, metres). Output is in three.js axes via toThree from world.ts,
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
