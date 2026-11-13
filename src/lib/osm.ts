// OpenStreetMap to compact 3D scene data (buildings with heights, parks, water, trees).
// Geometry is stored in local metres around the start, x east, y north, rounded to 0.5 m,
// so the 3D scene needs no projection and the file stays small. Data © OpenStreetMap contributors, ODbL.

import type { LatLng } from "./course";

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
export type OsmCategory = "buildings" | "parks" | "water" | "trees";

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
  const kx = (Math.cos((origin[0] * Math.PI) / 180) * Math.PI * 6371000) / 180;
  const ky = (Math.PI * 6371000) / 180;
  const q = (v: number) => Math.round(v * 2) / 2;
  const toXY = (lat: number, lon: number): [number, number] => [q((lon - origin[1]) * kx), q((lat - origin[0]) * ky)];
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
    if (el.type === "way") return el.geometry ? [{ outer: el.geometry, holes: [] }] : [];
    const outer = joinRings(role(el, "outer"));
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
  for (const el of elements) {
    const t = el.tags ?? {};
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
  return scene;
}
