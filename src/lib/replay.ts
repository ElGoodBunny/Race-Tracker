// Turns recorded activity streams (Strava, FIT, later live telemetry) into samples on the course.
// GPS distance is always a bit longer than the official course, so every sample is projected
// onto the route to get the course km the rest of the app works with.

import type { CourseData, LatLng } from "./course";
import { makeLocal } from "./view3d/world.ts";

export interface ReplaySample {
  /** Seconds since start. */
  t: number;
  /** Course km (projected, monotonic). */
  km: number;
  lat: number;
  lng: number;
  hr: number | null;
  /** Steps per minute. */
  cad: number | null;
  alt: number | null;
}

export interface StreamInput {
  time: number[];
  location: LatLng[];
  heart_rate?: number[];
  /** Strava run cadence is per leg, multiply by 2 for steps per minute. */
  cadence?: number[];
  altitude?: number[];
}

const MAX_SPEED = 8; // m/s
const BACKTRACK_KM = 0.2;

/**
 * Project every sample onto the route. The search window follows the previous match,
 * so out-and-back sections and crossings resolve to the right side of the course.
 */
export function projectOnCourse(course: CourseData, input: StreamInput, cadenceIsPerLeg = true): ReplaySample[] {
  const local = makeLocal(course.route[0]);
  const xy = (p: LatLng) => local.toXY(p[0], p[1]);
  const pts = course.route.map(xy);
  const out: ReplaySample[] = [];
  let seg = 1;
  let lastKm = 0;

  for (let i = 0; i < input.time.length; i++) {
    const [x, y] = xy(input.location[i]);
    // Nobody runs faster than 8 m/s, so a match further ahead is the other side of a loop.
    const dt = i ? input.time[i] - input.time[i - 1] : 0;
    const maxKm = i === 0 ? Infinity : lastKm + (dt * MAX_SPEED) / 1000;
    let best = { d: Infinity, km: lastKm, seg };
    const from = Math.max(1, seg - 2);
    const to = Math.min(pts.length - 1, seg + 12);
    for (let s = from; s <= to; s++) {
      const a = pts[s - 1];
      const b = pts[s];
      const dx = b[0] - a[0];
      const dy = b[1] - a[1];
      const len = dx * dx + dy * dy || 1;
      const t = Math.max(0, Math.min(1, ((x - a[0]) * dx + (y - a[1]) * dy) / len));
      const d = Math.hypot(x - (a[0] + t * dx), y - (a[1] + t * dy));
      const km = Math.min(maxKm, course.km[s - 1] + t * (course.km[s] - course.km[s - 1]));
      if (km < lastKm - BACKTRACK_KM) continue;
      if (d < best.d) best = { d, km, seg: s };
    }
    seg = best.seg;
    lastKm = Math.max(lastKm, best.km);
    const cad = input.cadence?.[i];
    out.push({
      t: input.time[i],
      km: Math.round(lastKm * 1000) / 1000,
      lat: input.location[i][0],
      lng: input.location[i][1],
      hr: input.heart_rate?.[i] ?? null,
      cad: cad == null ? null : cadenceIsPerLeg ? cad * 2 : cad,
      alt: input.altitude?.[i] ?? null,
    });
  }
  return out;
}

/** Sample at time t (seconds since start), linear between neighbours. */
export function sampleAt(samples: ReplaySample[], t: number): ReplaySample {
  if (t <= samples[0].t) return samples[0];
  const last = samples[samples.length - 1];
  if (t >= last.t) return last;
  let lo = 0;
  let hi = samples.length - 1;
  while (hi - lo > 1) {
    const m = (lo + hi) >> 1;
    if (samples[m].t <= t) lo = m;
    else hi = m;
  }
  const a = samples[lo];
  const b = samples[hi];
  const f = (t - a.t) / (b.t - a.t || 1);
  const mix = (p: number | null, q: number | null) => (p == null || q == null ? (p ?? q) : p + f * (q - p));
  return {
    t,
    km: a.km + f * (b.km - a.km),
    lat: a.lat + f * (b.lat - a.lat),
    lng: a.lng + f * (b.lng - a.lng),
    hr: mix(a.hr, b.hr),
    cad: mix(a.cad, b.cad),
    alt: mix(a.alt, b.alt),
  };
}
