// Numbers for HUD and panel (step 12), from the measurements known so far. No three.js, no DOM.
// Everything is computed from telemetry points in race time; createStats prepares sums once, so a frame only searches.

import type { CourseData } from "../course";
import type { ReplaySample } from "../replay";

export interface RunStats {
  /** Seconds for every full km run by race time t: splits[0] is km 1. */
  splits(t: number): number[];
  /** Average and maximum pulse of the measurements up to t, null before the first one. */
  hr(t: number): { avg: number; max: number } | null;
  /** Pulse values of the measurements in the last windowS seconds up to t, oldest first. */
  hrTrail(t: number, windowS: number): number[];
}

export function createStats(points: readonly ReplaySample[]): RunStats {
  const pts = [...points].sort((a, b) => a.t - b.t);
  // Race time at which each full km was reached, interpolated between two measurements.
  // The start (0 s, 0 km) counts as the first one, so km stay numbered right when early measurements are missing.
  const crossings: number[] = [0];
  let a = { t: 0, km: 0 };
  for (const b of pts) {
    for (let k = crossings.length; k <= b.km; k++) {
      if (k <= a.km) continue;
      crossings.push(a.t + ((k - a.km) / (b.km - a.km)) * (b.t - a.t));
    }
    if (b.km >= a.km) a = b;
  }
  // Running sums over the pulse, so hr(t) is a search and not a loop.
  const sum: number[] = [];
  const count: number[] = [];
  const max: number[] = [];
  let s = 0;
  let n = 0;
  let m = -Infinity;
  for (const p of pts) {
    if (p.hr != null) {
      s += p.hr;
      n++;
      m = Math.max(m, p.hr);
    }
    sum.push(s);
    count.push(n);
    max.push(m);
  }
  /** Index of the last point at or before t, -1 if none. */
  const upTo = (t: number) => {
    let lo = -1;
    let hi = pts.length;
    while (hi - lo > 1) {
      const mid = (lo + hi) >> 1;
      if (pts[mid].t <= t) lo = mid;
      else hi = mid;
    }
    return lo;
  };

  return {
    splits(t) {
      const out: number[] = [];
      for (let k = 1; k < crossings.length && crossings[k] <= t; k++) out.push(crossings[k] - crossings[k - 1]);
      return out;
    },
    hr(t) {
      const i = upTo(t);
      if (i < 0 || count[i] === 0) return null;
      return { avg: sum[i] / count[i], max: max[i] };
    },
    hrTrail(t, windowS) {
      const out: number[] = [];
      for (let i = upTo(t); i >= 0 && pts[i].t > t - windowS; i--) if (pts[i].hr != null) out.push(pts[i].hr!);
      return out.reverse();
    },
  };
}

/** Finish time in race seconds at the average pace so far, null in the first km where the pace says little. */
export function finishForecast(t: number, km: number, distanceKm: number): number | null {
  return km < 1 ? null : (t / km) * distanceKm;
}

/**
 * Name of the last landmark the runner has passed, without "Start" and "Ziel" in front.
 * null when it lies more than withinKm behind: "hinter Sagrada Família" 13 km later would say nothing.
 */
export function passedLandmark(c: Pick<CourseData, "km" | "landmarks">, km: number, withinKm = 2): string | null {
  let best: { km: number; name: string } | null = null;
  for (const l of c.landmarks) {
    const at = c.km[l.idx];
    if (at <= km && km - at <= withinKm && (!best || at > best.km)) best = { km: at, name: l.name };
  }
  return best ? best.name.replace(/^Start |^Ziel /, "") : null;
}
