// Where the runner's measurements come from (docs/decisions/2026-11-13-3d-konzept.md).
// The view only asks sampleAt(t) and does not know which source is behind it.
// Here: the replay source and a rescaled demo source. Estimate and mixed source with fallback follow in step 13.

import { latLngAt, type CourseData } from "../course";
import { sampleAt, type ReplaySample } from "../replay";

/** measured: from a recording or telemetry. estimated: from the pace model, when no fresh measurement is there (step 13). */
export type Quality = "measured" | "estimated";

/** One measurement per frame: what HUD, camera and view get. Later sources may add optional fields (age of the data). */
export interface Sample extends ReplaySample {
  /** Seconds per km over the last PACE_WINDOW_S seconds, null while standing or right at the start. */
  pace: number | null;
  quality: Quality;
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
  const samples: ReplaySample[] = file.t.map((t, i) => ({
    t,
    km: file.km[i],
    lat: file.lat[i],
    lng: file.lng[i],
    hr: file.hr[i],
    cad: file.cad[i],
    alt: file.alt[i],
  }));
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
