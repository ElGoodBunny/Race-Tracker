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

export interface SceneData {
  origin: LatLng;
  /** [flat x,y ring..., height] per building. */
  buildings: { ring: number[]; h: number }[];
  parks: number[][];
  water: number[][];
  trees: number[];
}

export function overpassQuery(b: { s: number; w: number; n: number; e: number }): string {
  const bbox = `${b.s},${b.w},${b.n},${b.e}`;
  return `[out:json][timeout:120];
(
  way["building"](${bbox});
  relation["building"](${bbox});
  way["leisure"~"^(park|garden)$"](${bbox});
  way["landuse"~"^(grass|forest|meadow|recreation_ground|village_green)$"](${bbox});
  way["natural"="water"](${bbox});
  relation["natural"="water"](${bbox});
  way["waterway"="riverbank"](${bbox});
  node["natural"="tree"](${bbox});
);
out geom;`;
}

export function routeBounds(route: LatLng[], marginM: number) {
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

export function osmToScene(elements: OverpassElement[], route: LatLng[], corridorM: number): SceneData {
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
  const outerRings = (el: OverpassElement) =>
    el.type === "way" ? (el.geometry ? [el.geometry] : []) : (el.members ?? []).filter((m) => m.role === "outer" && m.geometry).map((m) => m.geometry!);

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
    for (const g of outerRings(el)) {
      if (g.length < 3) continue;
      const r = ring(g);
      if (t.building) {
        const [cx, cy] = centre(r);
        if (distToRoute(cx, cy) <= corridorM) scene.buildings.push({ ring: r, h: Math.round(buildingHeight(t) * 2) / 2 });
      } else if (t.natural === "water" || t.waterway === "riverbank") {
        scene.water.push(r); // water is kept whole, the Alster and Elbe are landmarks
      } else {
        const [cx, cy] = centre(r);
        if (distToRoute(cx, cy) <= corridorM * 1.5) scene.parks.push(r);
      }
    }
  }
  return scene;
}
