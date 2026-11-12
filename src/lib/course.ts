// Course geometry, ported from legacy/hamburg-2026.html (posAt, nearestKm, landmarkNear, proj).
// Pure functions on a course object so they work for every race and in tests.

export type LatLng = [number, number];

export interface Landmark {
  name: string;
  idx: number;
  label?: string;
}

export interface CourseData {
  route: LatLng[];
  km: number[];
  landmarks: Landmark[];
  bounds: { w: number; e: number; n: number; s: number };
}

/** Great-circle distance in km. */
export function haversineKm(a: LatLng, b: LatLng): number {
  const r = Math.PI / 180;
  const d1 = (b[0] - a[0]) * r;
  const d2 = (b[1] - a[1]) * r;
  const s = Math.sin(d1 / 2) ** 2 + Math.cos(a[0] * r) * Math.cos(b[0] * r) * Math.sin(d2 / 2) ** 2;
  return 6371 * 2 * Math.asin(Math.sqrt(s));
}

/** Position on the route at a given km, linear between route points. */
export function latLngAt(c: CourseData, km: number): LatLng {
  const last = c.km[c.km.length - 1];
  const k = Math.max(0, Math.min(last, km));
  for (let i = 1; i < c.km.length; i++) {
    if (k <= c.km[i]) {
      const f = (k - c.km[i - 1]) / (c.km[i] - c.km[i - 1] || 1);
      const a = c.route[i - 1];
      const b = c.route[i];
      return [a[0] + f * (b[0] - a[0]), a[1] + f * (b[1] - a[1])];
    }
  }
  return c.route[c.route.length - 1];
}

/** Projection into an SVG viewBox of width `vbw`, height follows the bounds' aspect ratio. */
export function makeProjection(bounds: CourseData["bounds"], vbw = 1000) {
  const midLat = (bounds.n + bounds.s) / 2;
  const cosLat = Math.cos((midLat * Math.PI) / 180);
  const vbh = Math.round((vbw * (bounds.n - bounds.s)) / ((bounds.e - bounds.w) * cosLat));
  const project = (p: LatLng): [number, number] => [
    ((p[1] - bounds.w) / (bounds.e - bounds.w)) * vbw,
    ((bounds.n - p[0]) / (bounds.n - bounds.s)) * vbh,
  ];
  return { vbw, vbh, project };
}

/** Closest km on the route to a projected point (used for tap-to-place spots). */
export function nearestKm(c: CourseData, pts: [number, number][], x: number, y: number) {
  let best: { d: number; km: number } | null = null;
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1];
    const b = pts[i];
    const dx = b[0] - a[0];
    const dy = b[1] - a[1];
    const len = dx * dx + dy * dy || 1;
    const t = Math.max(0, Math.min(1, ((x - a[0]) * dx + (y - a[1]) * dy) / len));
    const d = Math.hypot(x - (a[0] + t * dx), y - (a[1] + t * dy));
    if (!best || d < best.d) best = { d, km: c.km[i - 1] + t * (c.km[i] - c.km[i - 1]) };
  }
  return best;
}

/** Name of the landmark within 0.5 km, without "Start " / "Ziel " prefix. */
export function landmarkNear(c: CourseData, km: number): string | null {
  let best: { d: number; l: Landmark } | null = null;
  for (const l of c.landmarks) {
    const d = Math.abs(c.km[l.idx] - km);
    if (!best || d < best.d) best = { d, l };
  }
  return best && best.d < 0.5 ? best.l.name.replace(/^Start |^Ziel /, "") : null;
}
