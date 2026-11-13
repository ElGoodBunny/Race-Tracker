// From a recorded or planned track to course data: read GPX, simplify, cumulative km on the official distance, snap landmarks.
// Used by scripts/new-race.ts (GPX) and scripts/course-from-track.ts (Strava streams).

import { haversineKm, type LatLng } from "./course.ts";
import { makeLocal } from "./view3d/world.ts";

/** Track or route points of a GPX file in order, as [lat, lng]. Elevation is ignored. */
export function parseGpx(xml: string): LatLng[] {
  const out: LatLng[] = [];
  for (const m of xml.matchAll(/<(?:trkpt|rtept)\b([^>]*)>/g)) {
    const lat = /\blat="([^"]+)"/.exec(m[1]);
    const lon = /\blon="([^"]+)"/.exec(m[1]);
    if (lat && lon) out.push([Number(lat[1]), Number(lon[1])]);
  }
  return out;
}

/** Indices kept by Douglas-Peucker in local metres: points more than `tolM` off the simplified line. */
function simplify(track: LatLng[], tolM: number): number[] {
  const local = makeLocal(track[0]);
  const xy = track.map(([lat, lng]) => local.toXY(lat, lng));
  const keep = new Uint8Array(track.length);
  keep[0] = keep[track.length - 1] = 1;
  const stack: [number, number][] = [[0, track.length - 1]];
  while (stack.length) {
    const [a, b] = stack.pop()!;
    const [ax, ay] = xy[a];
    const [bx, by] = xy[b];
    const len = Math.hypot(bx - ax, by - ay) || 1;
    let far = -1;
    let dmax = tolM;
    for (let i = a + 1; i < b; i++) {
      const d = Math.abs((bx - ax) * (ay - xy[i][1]) - (ax - xy[i][0]) * (by - ay)) / len;
      if (d > dmax) {
        dmax = d;
        far = i;
      }
    }
    if (far > 0) {
      keep[far] = 1;
      stack.push([a, far], [far, b]);
    }
  }
  return track.map((_, i) => i).filter((i) => keep[i]);
}

const round6 = (p: LatLng): LatLng => [+p[0].toFixed(6), +p[1].toFixed(6)];
const round3 = (v: number) => Math.round(v * 1000) / 1000;

/**
 * Simplified route with cumulative km. The length is measured on the full track, so bends that the
 * simplification cuts still count, then scaled so the finish is exactly the official distance.
 * Points rounded to 6 decimals, km to 3.
 */
export function trackToCourse(track: LatLng[], tolM: number, distanceKm: number) {
  const raw = [0];
  for (let i = 1; i < track.length; i++) raw.push(raw[i - 1] + haversineKm(track[i - 1], track[i]));
  const rawKm = raw[raw.length - 1];
  const scale = distanceKm / rawKm;
  const keep = simplify(track, tolM);
  return { route: keep.map((i) => round6(track[i])), km: keep.map((i) => round3(raw[i] * scale)), rawKm, scale };
}

/**
 * Snap a landmark to the route, searching segments from index `from` on. Where it is closest to the
 * middle of a segment, a new route point is put there, so the landmark gets its exact km.
 */
export function snapToRoute(route: LatLng[], km: number[], p: LatLng, from: number) {
  const local = makeLocal(p);
  let best = { d: Infinity, s: from + 1, t: 0, len: 0 };
  for (let s = Math.max(1, from + 1); s < route.length; s++) {
    const [ax, ay] = local.toXY(...route[s - 1]);
    const [bx, by] = local.toXY(...route[s]);
    const dx = bx - ax;
    const dy = by - ay;
    const len2 = dx * dx + dy * dy || 1;
    const t = Math.max(0, Math.min(1, (-ax * dx - ay * dy) / len2));
    const d = Math.hypot(ax + t * dx, ay + t * dy);
    if (d < best.d) best = { d, s, t, len: Math.sqrt(len2) };
  }
  const { s, t, len, d } = best;
  if (t * len < 1) return { route, km, idx: s - 1, offM: d };
  if ((1 - t) * len < 1) return { route, km, idx: s, offM: d };
  const a = route[s - 1];
  const b = route[s];
  const point = round6([a[0] + t * (b[0] - a[0]), a[1] + t * (b[1] - a[1])]);
  return {
    route: [...route.slice(0, s), point, ...route.slice(s)],
    km: [...km.slice(0, s), round3(km[s - 1] + t * (km[s] - km[s - 1])), ...km.slice(s)],
    idx: s,
    offM: d,
  };
}

/** Index of the route point closest to `p`, searching from index `from` on. */
export function nearestIndex(route: LatLng[], p: LatLng, from = 0): number {
  let best = { d: Infinity, i: from };
  for (let i = from; i < route.length; i++) {
    const d = haversineKm(p, route[i]);
    if (d < best.d) best = { d, i };
  }
  return best.i;
}
