// Where the runner's measurements come from (docs/decisions/2026-11-13-3d-konzept.md).
// The view only asks sampleAt(t) and does not know which source is behind it.
// Step 3 has the replay source. Estimate and mixed source with fallback follow in step 13.

import { sampleAt, type ReplaySample } from "../replay";

export type Sample = ReplaySample;

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
  const samples: Sample[] = file.t.map((t, i) => ({
    t,
    km: file.km[i],
    lat: file.lat[i],
    lng: file.lng[i],
    hr: file.hr[i],
    cad: file.cad[i],
    alt: file.alt[i],
  }));
  return {
    duration: samples[samples.length - 1].t,
    sampleAt: (t) => sampleAt(samples, t),
  };
}
