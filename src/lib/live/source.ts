// Where the runner's measurements come from (docs/decisions/2026-11-13-3d-konzept.md).
// The view only asks sampleAt(t) and does not know which source is behind it.
// Here: the replay source, a rescaled demo source and the mixed source with fallback on the estimate (step 13).

import { latLngAt, type CourseData } from "../course";
import { estimate, type Checkpoint, type RaceState } from "../estimate";
import { sampleAt, type ReplaySample } from "../replay";

/** measured: from a recording or telemetry. estimated: from the pace model, when no fresh measurement is there (step 13). */
export type Quality = "measured" | "estimated";

/** One measurement per frame: what HUD, camera and view get. Later sources may add optional fields (age of the data). */
export interface Sample extends ReplaySample {
  /** Seconds per km over the last PACE_WINDOW_S seconds, null while standing or right at the start. */
  pace: number | null;
  quality: Quality;
  /** Seconds since the latest measurement, mixed source only. Missing when there has been none yet. */
  age?: number;
}

export const PACE_WINDOW_S = 30;
/** Less than this in the pace window counts as standing. */
const STANDING_KM = 0.01;

export interface Source {
  /** Seconds from start to the last measurement. */
  readonly duration: number;
  /** Measurement at race time t (seconds since start), linear between neighbours. */
  sampleAt(t: number): Sample;
}

/** Columnar format of public/data/<slug>/replay.json, written by scripts/streams-to-replay.ts. */
export interface ReplayFile {
  t: number[];
  km: number[];
  lat: number[];
  lng: number[];
  hr: (number | null)[];
  cad: (number | null)[];
  alt: (number | null)[];
}

export function replaySource(file: ReplayFile): Source {
  return fromSamples(
    file.t.map((t, i) => ({
      t,
      km: file.km[i],
      lat: file.lat[i],
      lng: file.lng[i],
      hr: file.hr[i],
      cad: file.cad[i],
      alt: file.alt[i],
    })),
  );
}

function fromSamples(samples: ReplaySample[]): Source {
  const duration = samples[samples.length - 1].t;
  return {
    duration,
    sampleAt(t) {
      const s = sampleAt(samples, t);
      // Trailing window, like a live source that cannot look ahead.
      const before = sampleAt(samples, s.t - PACE_WINDOW_S);
      const km = s.km - before.km;
      const dt = s.t - before.t;
      return { ...s, pace: dt > 0 && km >= STANDING_KM ? dt / km : null, quality: "measured" };
    },
  };
}

/**
 * Demo: a recording from another race, put on this course by share of the distance.
 * The time is stretched by the same factor, so pace, pulse and cadence are the recorded ones at the same share of
 * the race and the runner moves at his real speed. The race time is therefore not a time that was ever run.
 * Position comes from the course, the altitude of the other city is dropped.
 */
export function rescaleSource(source: Source, recordedKm: number, course: Pick<CourseData, "route" | "km">): Source {
  const f = course.km[course.km.length - 1] / recordedKm;
  return {
    duration: source.duration * f,
    sampleAt(t) {
      const s = source.sampleAt(t / f);
      const km = s.km * f;
      const [lat, lng] = latLngAt(course as CourseData, km);
      return { ...s, t: s.t * f, km, lat, lng, alt: null };
    },
  };
}

/* ---------- mixed source (step 13) ---------- */

export interface MixOptions {
  /**
   * A measurement older than this (s) no longer counts as live, the sample turns "estimated". The architecture note proposes
   * 90 s, to be set after the LiveTrack measurement in phase 2b. The check "Rückfall ohne Sprung" cuts 60 s, so it needs less.
   */
  staleS: number;
  course: Pick<CourseData, "route" | "km">;
  /** Target time in seconds, the pace of the estimate before the first measurement. */
  targetSec: number;
}

/** Back from a gap the shown km goes over to the measured one within at least this distance (km), see mixedSource. */
const BLEND_MIN_KM = 0.05;
/** The estimate never reaches the finish by itself, like estimate() in estimate.ts. */
const FINISH_GAP_KM = 0.05;

interface Gap {
  /** Time of the last measurement before the gap (0 and real false before the first one), and of the first one after it. */
  from: number;
  to: number;
  real: boolean;
  startKm: number;
  /** Seconds per km, from estimate(). */
  pace: number;
  /** Shown minus measured km when the data returns, and the measured distance over which it fades out. */
  offset: number;
  blendKm: number;
  backKm: number;
}

/**
 * Telemetry while it is fresh, the estimate when it is not (docs/VISION.md, "Rückfall ohne Sprung").
 * points are the measurements known so far, in race time. A gap is a pause of more than staleS between two of them,
 * or the time after the last one. In a gap the km runs on from the last shown km with the pace of estimate(),
 * anchored on that km and on a measurement at least 2 km before. The sample says "measured" until the last measurement
 * is staleS old. When data returns, the difference between shown and measured km fades out over twice its size of
 * measured distance, so the km never goes back and never moves faster than 1.5 times the runner.
 * sampleAt(t) depends on t and points only. Without gaps it is exactly replaySource.
 */
export function mixedSource(points: readonly ReplaySample[], o: MixOptions): Source {
  const pts = [...points].sort((a, b) => a.t - b.t);
  const measured = pts.length ? fromSamples(pts) : null;
  const distanceKm = o.course.km[o.course.km.length - 1];
  const race: RaceState = { plannedStart: 0, actualStart: 0, finishedAt: null, targetSec: o.targetSec };
  const measuredKm = (t: number) => measured!.sampleAt(t).km;
  const gapKm = (g: Gap, t: number) => Math.min(distanceKm - FINISH_GAP_KM, Math.max(g.startKm, g.startKm + (t - g.from) / g.pace));
  const weight = (g: Gap, t: number) => Math.max(0, 1 - (measuredKm(t) - g.backKm) / g.blendKm);

  const gaps: Gap[] = [];
  /** Gap containing t (strictly after its start), else the last gap that ended at or before t. */
  function locate(t: number): { inGap?: Gap; after?: Gap } {
    for (let i = gaps.length - 1; i >= 0; i--) {
      const g = gaps[i];
      if (t > g.from && t < g.to) return { inGap: g };
      if (g.to <= t) return { after: g };
    }
    return {};
  }
  function shownKm(t: number): number {
    const { inGap, after } = locate(t);
    if (inGap) return gapKm(inGap, t);
    const m = measuredKm(t);
    return after ? m + after.offset * weight(after, t) : m;
  }
  function addGap(from: number, to: number, real: boolean) {
    const startKm = real ? shownKm(from) : 0;
    const anchors: Checkpoint[] = [];
    if (real) {
      const back = pts.filter((p) => p.t < from && p.km <= startKm - 2).at(-1);
      if (back) anchors.push({ km: back.km, netSec: back.t, at: null, src: "seen" });
      anchors.push({ km: startKm, netSec: from, at: null, src: "seen" });
    }
    const pace = estimate(race, anchors, distanceKm, from * 1000).pace;
    const g: Gap = { from, to, real, startKm, pace, offset: 0, blendKm: BLEND_MIN_KM, backKm: 0 };
    if (Number.isFinite(to)) {
      g.backKm = measuredKm(to);
      g.offset = gapKm(g, to) - g.backKm;
      g.blendKm = Math.max(BLEND_MIN_KM, 2 * Math.abs(g.offset));
    }
    gaps.push(g);
  }
  if (!pts.length || pts[0].t > 0) addGap(0, pts.length ? pts[0].t : Infinity, false);
  for (let i = 0; i + 1 < pts.length; i++) if (pts[i + 1].t - pts[i].t > o.staleS) addGap(pts[i].t, pts[i + 1].t, true);
  if (pts.length) addGap(pts[pts.length - 1].t, Infinity, true);

  /** Seconds since the latest measurement at or before t. */
  function age(t: number): number | undefined {
    let lo = -1;
    let hi = pts.length;
    while (hi - lo > 1) {
      const m = (lo + hi) >> 1;
      if (pts[m].t <= t) lo = m;
      else hi = m;
    }
    return lo < 0 ? undefined : t - pts[lo].t;
  }
  const onCourse = (km: number) => latLngAt(o.course as CourseData, km);

  return {
    duration: pts.length ? pts[pts.length - 1].t : 0,
    sampleAt(t) {
      const a = age(t);
      const { inGap, after } = locate(t);
      if (inGap) {
        const km = gapKm(inGap, t);
        const [lat, lng] = onCourse(km);
        const quality: Quality = inGap.real && a !== undefined && a <= o.staleS ? "measured" : "estimated";
        return { t, km, lat, lng, hr: null, cad: null, alt: null, pace: inGap.pace, quality, age: a };
      }
      const s = measured!.sampleAt(t);
      const w = after ? weight(after, t) : 0;
      if (w === 0) return { ...s, age: a };
      const km = s.km + after!.offset * w;
      const [lat, lng] = onCourse(km);
      return { ...s, km, lat, lng, age: a };
    },
  };
}
