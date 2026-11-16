// OpenStreetMap to compact 3D scene data (buildings with heights, parks, water, trees; the coastline becomes sea in water).
// Geometry is in local metres around the start, x east, y north, rounded to 0.5 m, so the 3D scene
// needs no projection. On disk it is packed (PackedScene, packScene, unpackScene below). Data © OpenStreetMap contributors, ODbL.

import type { LatLng } from "./course";
import { makeLocal } from "./view3d/world.ts";

export interface OverpassElement {
  type: "node" | "way" | "relation";
  id: number;
  tags?: Record<string, string>;
  lat?: number;
  lon?: number;
  geometry?: { lat: number; lon: number }[];
  members?: { type: string; role: string; geometry?: { lat: number; lon: number }[] }[];
}

/** Rings are flat [x, y, x, y, ...] lists, closed like OSM ways (last point repeats the first). */
export interface SceneData {
  origin: LatLng;
  /** holes: courtyards, left out when there are none. */
  buildings: { ring: number[]; h: number; holes?: number[][] }[];
  parks: number[][];
  /** holes: islands, left out when there are none. */
  water: { ring: number[]; holes?: number[][] }[];
  trees: number[];
}

type GeoPoint = { lat: number; lon: number };

/** Holes smaller than this (m²) are dropped: light wells and tiny islets only cost triangles. */
const MIN_HOLE_M2 = 30;

const samePoint = (a: GeoPoint, b: GeoPoint) => a.lat === b.lat && a.lon === b.lon;

/**
 * Joins the ways of a multipolygon into closed rings. OSM splits long outlines into several ways
 * that share their end nodes, in any order and direction. Overpass returns identical coordinates
 * for shared nodes, so exact equality is enough. Segments that never close are counted in open.
 */
export function joinRings(segments: GeoPoint[][]): { rings: GeoPoint[][]; open: number } {
  const pool = segments.filter((s) => s.length >= 2).map((s) => s.slice());
  const rings: GeoPoint[][] = [];
  let open = 0;
  while (pool.length) {
    const ring = pool.shift()!;
    for (;;) {
      const last = ring[ring.length - 1];
      if (ring.length >= 4 && samePoint(ring[0], last)) {
        rings.push(ring);
        break;
      }
      const i = pool.findIndex((s) => samePoint(s[0], last) || samePoint(s[s.length - 1], last));
      if (i < 0) {
        open++;
        break;
      }
      const next = pool.splice(i, 1)[0];
      if (!samePoint(next[0], last)) next.reverse();
      ring.push(...next.slice(1));
    }
  }
  return { rings, open };
}

function containsPoint(ring: GeoPoint[], p: GeoPoint): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const a = ring[i];
    const b = ring[j];
    if (a.lat > p.lat !== b.lat > p.lat && p.lon < ((b.lon - a.lon) * (p.lat - a.lat)) / (b.lat - a.lat) + a.lon) inside = !inside;
  }
  return inside;
}

export type Bounds = { s: number; w: number; n: number; e: number };
export type OsmCategory = "buildings" | "parks" | "water" | "trees" | "coastline";

/** One query per category, so no single request runs into the public servers' timeout. */
export function overpassQueries(b: Bounds): { category: OsmCategory; query: string }[] {
  const bbox = `${b.s},${b.w},${b.n},${b.e}`;
  const q = (body: string) => `[out:json][timeout:180];
(
${body}
);
out geom;`;
  return [
    { category: "buildings", query: q(`  way["building"](${bbox});
  relation["building"](${bbox});`) },
    { category: "parks", query: q(`  way["leisure"~"^(park|garden)$"](${bbox});
  way["landuse"~"^(grass|forest|meadow|recreation_ground|village_green)$"](${bbox});`) },
    { category: "water", query: q(`  way["natural"="water"](${bbox});
  relation["natural"="water"](${bbox});
  way["waterway"="riverbank"](${bbox});`) },
    { category: "trees", query: q(`  node["natural"="tree"](${bbox});`) },
    { category: "coastline", query: q(`  way["natural"="coastline"](${bbox});`) },
  ];
}

/** 2 x 2 tiles, fallback when a category times out on the whole box. */
export function splitBounds(b: Bounds): Bounds[] {
  const lat = (b.s + b.n) / 2;
  const lng = (b.w + b.e) / 2;
  return [
    { s: b.s, w: b.w, n: lat, e: lng },
    { s: b.s, w: lng, n: lat, e: b.e },
    { s: lat, w: b.w, n: b.n, e: lng },
    { s: lat, w: lng, n: b.n, e: b.e },
  ];
}

/** Separate queries and tiles return some elements twice. */
export function dedupeElements(elements: OverpassElement[]): OverpassElement[] {
  const seen = new Set<string>();
  return elements.filter((el) => {
    const key = `${el.type}/${el.id}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/** Overpass answers a timeout with HTTP 200, partial data and a remark. */
export function overpassTimedOut(json: { remark?: string }): boolean {
  return /timed out|runtime error/i.test(json.remark ?? "");
}

export function routeBounds(route: LatLng[], marginM: number): Bounds {
  const lat0 = route[0][0];
  const dLat = marginM / 111320;
  const dLng = marginM / (111320 * Math.cos((lat0 * Math.PI) / 180));
  return {
    s: Math.min(...route.map((p) => p[0])) - dLat,
    n: Math.max(...route.map((p) => p[0])) + dLat,
    w: Math.min(...route.map((p) => p[1])) - dLng,
    e: Math.max(...route.map((p) => p[1])) + dLng,
  };
}

export function buildingHeight(tags: Record<string, string> = {}): number {
  const h = parseFloat(tags.height ?? "");
  if (Number.isFinite(h) && h > 0) return Math.min(h, 250);
  const lv = parseFloat(tags["building:levels"] ?? "");
  if (Number.isFinite(lv) && lv > 0) return Math.min(lv * 3.2 + 1.5, 250);
  const kind = tags.building ?? "yes";
  if (["house", "detached", "semidetached_house", "garage", "shed", "kiosk"].includes(kind)) return 7;
  if (["church", "cathedral"].includes(kind)) return 30;
  return 14; // typical Hamburg Altbau block
}

/** warn receives one line per dropped open ring or orphaned hole, so a broken outline never vanishes silently. */
export function osmToScene(elements: OverpassElement[], route: LatLng[], corridorM: number, warn: (msg: string) => void = () => {}): SceneData {
  const origin = route[0];
  const local = makeLocal(origin);
  const q = (v: number) => Math.round(v * 2) / 2;
  const toXY = (lat: number, lon: number): [number, number] => {
    const [x, y] = local.toXY(lat, lon);
    return [q(x), q(y)];
  };
  const routeXY = route.map((p) => toXY(p[0], p[1]));

  const distToRoute = (x: number, y: number) => {
    let d = Infinity;
    for (let i = 1; i < routeXY.length; i++) {
      const [ax, ay] = routeXY[i - 1];
      const [bx, by] = routeXY[i];
      const dx = bx - ax;
      const dy = by - ay;
      const len = dx * dx + dy * dy || 1;
      const t = Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / len));
      d = Math.min(d, Math.hypot(x - (ax + t * dx), y - (ay + t * dy)));
    }
    return d;
  };
  const ring = (g: { lat: number; lon: number }[]) => g.flatMap((p) => toXY(p.lat, p.lon));
  const centre = (r: number[]) => {
    let x = 0;
    let y = 0;
    for (let i = 0; i < r.length; i += 2) { x += r[i]; y += r[i + 1]; }
    return [x / (r.length / 2), y / (r.length / 2)];
  };
  const area = (r: number[]) => {
    let a = 0;
    for (let i = 0; i + 3 < r.length; i += 2) a += r[i] * r[i + 3] - r[i + 2] * r[i + 1];
    return Math.abs(a / 2);
  };
  const role = (el: OverpassElement, name: string) => (el.members ?? []).filter((m) => m.role === name && m.geometry).map((m) => m.geometry!);

  /** Outer rings of a way or multipolygon, each with the holes that lie inside it. */
  const polygons = (el: OverpassElement): { outer: GeoPoint[]; holes: number[][] }[] => {
    if (el.type === "way") {
      const g = el.geometry;
      if (!g) return [];
      if (g.length < 4 || !samePoint(g[0], g[g.length - 1])) {
        warn(`way ${el.id}: open ring dropped`);
        return [];
      }
      return [{ outer: g, holes: [] }];
    }
    // A building relation without outer members: parts without a role are its outline (relation 20197870).
    let outerParts = role(el, "outer");
    if (!outerParts.length && el.tags?.building) outerParts = role(el, "");
    if (!outerParts.length) {
      warn(`relation ${el.id}: no outer ring, dropped`);
      return [];
    }
    const outer = joinRings(outerParts);
    const inner = joinRings(role(el, "inner"));
    if (outer.open) warn(`relation ${el.id}: ${outer.open} open outer ring(s) dropped`);
    if (inner.open) warn(`relation ${el.id}: ${inner.open} open inner ring(s) dropped`);
    const result = outer.rings.map((o) => ({ outer: o, holes: [] as number[][] }));
    for (const h of inner.rings) {
      const home = result.find((r) => containsPoint(r.outer, h[0]));
      if (!home) {
        warn(`relation ${el.id}: hole outside every outer ring dropped`);
        continue;
      }
      const r = ring(h);
      if (area(r) >= MIN_HOLE_M2) home.holes.push(r);
    }
    return result;
  };
  const withHoles = <T extends object>(base: T, holes: number[][]): T & { holes?: number[][] } => (holes.length ? { ...base, holes } : base);

  const scene: SceneData = { origin, buildings: [], parks: [], water: [], trees: [] };
  const coast: { id: number; g: GeoPoint[] }[] = [];
  for (const el of elements) {
    const t = el.tags ?? {};
    if (t.natural === "coastline") {
      if (el.type === "way" && el.geometry) coast.push({ id: el.id, g: el.geometry });
      continue;
    }
    if (el.type === "node") {
      if (t.natural === "tree" && el.lat != null && el.lon != null) {
        const [x, y] = toXY(el.lat, el.lon);
        if (distToRoute(x, y) <= corridorM) scene.trees.push(x, y);
      }
      continue;
    }
    for (const { outer: g, holes } of polygons(el)) {
      if (g.length < 3) continue;
      const r = ring(g);
      if (t.building) {
        const [cx, cy] = centre(r);
        if (distToRoute(cx, cy) <= corridorM) scene.buildings.push(withHoles({ ring: r, h: Math.round(buildingHeight(t) * 2) / 2 }, holes));
      } else if (t.natural === "water" || t.waterway === "riverbank") {
        scene.water.push(withHoles({ ring: r }, holes)); // water is kept whole, the Alster and Elbe are landmarks
      } else {
        const [cx, cy] = centre(r);
        if (distToRoute(cx, cy) <= corridorM * 1.5) scene.parks.push(r);
      }
    }
  }
  if (coast.length) {
    const b = routeBounds(route, corridorM);
    const [x0, y0] = local.toXY(b.s, b.w);
    const [x1, y1] = local.toXY(b.n, b.e);
    const sea = seaAreas(coast, { x0, y0, x1, y1 }, (p) => local.toXY(p.lat, p.lon), warn);
    scene.water.push(...sea.map((w) => withHoles({ ring: w.ring.map(q) }, w.holes.map((h) => h.map(q)).filter((h) => area(h) >= MIN_HOLE_M2))));
  }
  return scene;
}

type Box = { x0: number; y0: number; x1: number; y1: number };

/** Joins coastline ways head to tail. OSM keeps the direction of the coast (land on the left), so ways are never reversed. */
function chainCoast(ways: { id: number; g: GeoPoint[] }[]): { ids: number[]; g: GeoPoint[] }[] {
  const pool = ways.filter((w) => w.g.length >= 2).map((w) => ({ ids: [w.id], g: w.g.slice() }));
  const chains: { ids: number[]; g: GeoPoint[] }[] = [];
  while (pool.length) {
    const c = pool.shift()!;
    for (;;) {
      if (c.g.length >= 4 && samePoint(c.g[0], c.g[c.g.length - 1])) break;
      const i = pool.findIndex((s) => samePoint(s.g[0], c.g[c.g.length - 1]));
      if (i >= 0) {
        const next = pool.splice(i, 1)[0];
        c.g.push(...next.g.slice(1));
        c.ids.push(...next.ids);
        continue;
      }
      const j = pool.findIndex((s) => samePoint(s.g[s.g.length - 1], c.g[0]));
      if (j < 0) break;
      const prev = pool.splice(j, 1)[0];
      c.g.unshift(...prev.g.slice(0, -1));
      c.ids.unshift(...prev.ids);
    }
    chains.push(c);
  }
  return chains;
}

/**
 * The sea as water areas. OSM draws the coast as lines (natural=coastline) with the land on the left.
 * The lines are joined, clipped to the download box and closed along the box edge, so the sea stays on the right.
 * A coast ring inside the box is an island. A coast that ends inside the box cannot be closed and is reported.
 */
function seaAreas(ways: { id: number; g: GeoPoint[] }[], box: Box, toXY: (p: GeoPoint) => [number, number], warn: (msg: string) => void) {
  const { x0, y0, x1, y1 } = box;
  const W = x1 - x0;
  const H = y1 - y0;
  const P = 2 * W + 2 * H;
  const inBox = ([x, y]: [number, number]) => x > x0 && x < x1 && y > y0 && y < y1;
  // Position on the box edge, clockwise from the north-west corner (x east, y north).
  const edgePos = ([x, y]: [number, number]) => {
    const d = [y1 - y, x1 - x, y - y0, x - x0].map(Math.abs);
    const e = d.indexOf(Math.min(...d));
    return [x - x0, W + (y1 - y), W + H + (x1 - x), 2 * W + H + (y - y0)][e];
  };
  const corners: { pos: number; p: [number, number] }[] = [
    { pos: 0, p: [x0, y1] },
    { pos: W, p: [x1, y1] },
    { pos: W + H, p: [x1, y0] },
    { pos: 2 * W + H, p: [x0, y0] },
  ];

  // Liang-Barsky: the part of a-b inside the box as [t0, t1], or null.
  const clip = ([ax, ay]: [number, number], [bx, by]: [number, number]): [number, number] | null => {
    let t0 = 0;
    let t1 = 1;
    const dx = bx - ax;
    const dy = by - ay;
    for (const [p, qv] of [[-dx, ax - x0], [dx, x1 - ax], [-dy, ay - y0], [dy, y1 - ay]]) {
      if (p === 0) {
        if (qv < 0) return null;
        continue;
      }
      const r = qv / p;
      if (p < 0) t0 = Math.max(t0, r);
      else t1 = Math.min(t1, r);
      if (t0 > t1) return null;
    }
    return [t0, t1];
  };

  const runs: [number, number][][] = [];
  const islands: [number, number][][] = [];
  for (const c of chainCoast(ways)) {
    let pts = c.g.map(toXY);
    const closed = samePoint(c.g[0], c.g[c.g.length - 1]);
    if (closed && pts.every(inBox)) {
      islands.push(pts);
      continue;
    }
    if (!closed) {
      if (inBox(pts[0]) || inBox(pts[pts.length - 1])) {
        warn(`coastline way ${c.ids.join(", ")}: ends inside the box, dropped`);
        continue;
      }
    } else {
      // Start a ring that crosses the box at a point outside, so no run wraps around the start.
      const k = pts.findIndex((p) => !inBox(p));
      pts = [...pts.slice(k, -1), ...pts.slice(0, k + 1)];
    }
    let run: [number, number][] | null = null;
    for (let i = 1; i < pts.length; i++) {
      const a = pts[i - 1];
      const b = pts[i];
      const t = clip(a, b);
      if (!t) continue;
      const at = (s: number): [number, number] => [a[0] + s * (b[0] - a[0]), a[1] + s * (b[1] - a[1])];
      if (!run || t[0] > 0) run = [at(t[0])];
      run.push(at(t[1]));
      if (t[1] < 1) {
        if (run.length >= 2) runs.push(run);
        run = null;
      }
    }
  }

  // Walk: along a coast run to where it leaves the box, then clockwise along the edge to the next run that enters.
  const sea: { ring: number[]; holes: number[][] }[] = [];
  const used = new Set<number>();
  const entry = runs.map((r) => edgePos(r[0]));
  const exit = runs.map((r) => edgePos(r[r.length - 1]));
  for (let first = 0; first < runs.length; first++) {
    if (used.has(first)) continue;
    used.add(first);
    const ring: [number, number][] = [...runs[first]];
    let cur = first;
    for (let guard = 0; guard <= runs.length; guard++) {
      const from = exit[cur];
      const ahead = (pos: number) => (pos - from + P) % P;
      let next = -1;
      for (let i = 0; i < runs.length; i++) {
        if ((used.has(i) && i !== first) || (next >= 0 && ahead(entry[i]) >= ahead(entry[next]))) continue;
        next = i;
      }
      for (const c of corners.filter((c) => ahead(c.pos) > 0 && ahead(c.pos) < ahead(entry[next])).sort((a, b) => ahead(a.pos) - ahead(b.pos))) ring.push(c.p);
      if (next === first) break;
      used.add(next);
      ring.push(...runs[next]);
      cur = next;
    }
    ring.push(ring[0]);
    sea.push({ ring: ring.flat(), holes: [] });
  }

  for (const isl of islands) {
    const home = sea.find((s) => insideXY(s.ring, isl[0]));
    if (home) home.holes.push(isl.flat());
    else warn("coastline: island outside the sea dropped");
  }
  return sea;
}

function insideXY(r: number[], [x, y]: [number, number]): boolean {
  let hit = false;
  for (let i = 0, j = r.length - 2; i < r.length; j = i, i += 2) {
    if (r[i + 1] > y !== r[j + 1] > y && x < ((r[j] - r[i]) * (y - r[i + 1])) / (r[j + 1] - r[i + 1]) + r[i]) hit = !hit;
  }
  return hit;
}

/**
 * scene.json on disk: like SceneData, but every ring is a list of integer differences in 0.5 m units
 * (first point from 0, then from the previous point), without the closing point. Trees go to trees.json.
 * Same geometry, about half the size and far better to gzip.
 */
export interface PackedScene {
  format: 2;
  origin: LatLng;
  buildings: { ring: number[]; h: number; holes?: number[][] }[];
  parks: number[][];
  water: { ring: number[]; holes?: number[][] }[];
}

function packRing(r: number[]): number[] {
  const n = r.length;
  if (n < 8 || r[0] !== r[n - 2] || r[1] !== r[n - 1]) throw new Error("packScene: ring is not closed");
  const out: number[] = [];
  let px = 0;
  let py = 0;
  for (let i = 0; i < n - 2; i += 2) {
    const x = r[i] * 2;
    const y = r[i + 1] * 2;
    if (!Number.isInteger(x) || !Number.isInteger(y)) throw new Error("packScene: point off the 0.5 m grid");
    out.push(x - px, y - py);
    px = x;
    py = y;
  }
  return out;
}

function unpackRing(d: number[]): number[] {
  const out: number[] = [];
  let x = 0;
  let y = 0;
  for (let i = 0; i < d.length; i += 2) {
    x += d[i];
    y += d[i + 1];
    out.push(x / 2, y / 2);
  }
  out.push(out[0], out[1]);
  return out;
}

const mapHoles = <T extends { holes?: number[][] }>(p: T, f: (r: number[]) => number[]) => (p.holes ? { holes: p.holes.map(f) } : {});

export function packScene(s: SceneData): { scene: PackedScene; trees: number[] } {
  return {
    scene: {
      format: 2,
      origin: s.origin,
      buildings: s.buildings.map((b) => ({ ring: packRing(b.ring), h: b.h, ...mapHoles(b, packRing) })),
      parks: s.parks.map(packRing),
      water: s.water.map((w) => ({ ring: packRing(w.ring), ...mapHoles(w, packRing) })),
    },
    trees: s.trees,
  };
}

export function unpackScene(p: PackedScene, trees: number[] = []): SceneData {
  return {
    origin: p.origin,
    buildings: p.buildings.map((b) => ({ ring: unpackRing(b.ring), h: b.h, ...mapHoles(b, unpackRing) })),
    parks: p.parks.map(unpackRing),
    water: p.water.map((w) => ({ ring: unpackRing(w.ring), ...mapHoles(w, unpackRing) })),
    trees,
  };
}
