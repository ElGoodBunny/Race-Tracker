// The one conversion from lat/lng to local metres (docs/decisions/2026-11-13-3d-konzept.md).
// osm.ts, the route and the landmarks all use it, so buildings and route line up.
// x points east, y points north, in metres from the origin. The 3D view maps y to -z.

import type { CourseData, LatLng } from "../course";

const R = 6371000;

/** Runner direction is averaged over this many metres before and after the position. */
export const HEADING_M = 40;

export interface Local {
  origin: LatLng;
  toXY(lat: number, lng: number): [number, number];
}

/** Equirectangular projection around `origin`. Keep the arithmetic as is: scene.json depends on it bit for bit. */
export function makeLocal(origin: LatLng): Local {
  const kx = (Math.cos((origin[0] * Math.PI) / 180) * Math.PI * R) / 180;
  const ky = (Math.PI * R) / 180;
  return { origin, toXY: (lat, lng) => [(lng - origin[1]) * kx, (lat - origin[0]) * ky] };
}

export interface TrackPoint {
  x: number;
  y: number;
  /** Unit direction of travel. */
  dx: number;
  dy: number;
}

export interface Track {
  /** Route points in metres. */
  xy: [number, number][];
  at(km: number): TrackPoint;
}

/** The course in metres, parametrised by course km like latLngAt. */
export function makeTrack(course: Pick<CourseData, "route" | "km">, local: Local): Track {
  const xy = course.route.map(([lat, lng]) => local.toXY(lat, lng));
  const km = course.km;
  const last = km[km.length - 1];

  const pos = (k: number): [number, number] => {
    k = Math.max(0, Math.min(last, k));
    let lo = 0;
    let hi = km.length - 1;
    while (hi - lo > 1) {
      const m = (lo + hi) >> 1;
      if (km[m] <= k) lo = m;
      else hi = m;
    }
    const f = (k - km[lo]) / (km[hi] - km[lo] || 1);
    return [xy[lo][0] + f * (xy[hi][0] - xy[lo][0]), xy[lo][1] + f * (xy[hi][1] - xy[lo][1])];
  };

  const at = (k: number): TrackPoint => {
    k = Math.max(0, Math.min(last, k));
    const [x, y] = pos(k);
    const w = HEADING_M / 1000;
    let [ax, ay] = pos(k - w);
    let [bx, by] = pos(k + w);
    // Right on a hairpin both ends can meet. Fall back to the stretch ahead, at the finish to the one behind.
    if (Math.hypot(bx - ax, by - ay) < 1) [ax, ay, bx, by] = k < last ? [x, y, ...pos(k + w)] : [...pos(k - w), x, y];
    const len = Math.hypot(bx - ax, by - ay) || 1;
    return { x, y, dx: (bx - ax) / len, dy: (by - ay) / len };
  };

  return { xy, at };
}
