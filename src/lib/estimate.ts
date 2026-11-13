// Position estimate, ported 1:1 from estimate() in legacy/hamburg-2026.html.
// Abweichungen vom Legacy: Renndistanz und Konfiguration sind Parameter statt Globals,
// und die Stale-Grenze skaliert mit der Distanz (Barcelona 2027).
// All times in epoch milliseconds, durations in seconds.

export type CheckpointSource = "official" | "seen";

export interface Checkpoint {
  id?: string;
  km: number;
  /** Net time since start in seconds (official splits). */
  netSec: number | null;
  /** Wall clock time in ms (sightings). */
  at: number | null;
  src: CheckpointSource;
}

export interface RaceState {
  plannedStart: number;
  actualStart: number | null;
  finishedAt: number | null;
  targetSec: number;
}

interface Anchor {
  km: number;
  t: number;
  src: CheckpointSource;
  id?: string;
  drop?: boolean;
}

export type Phase = "pre" | "run" | "arriving" | "stale" | "done";

export interface Estimate {
  phase: Phase;
  km: number;
  t0: number;
  /** Seconds per km. */
  pace: number;
  finishAt: number;
  netSec: number;
  last: Anchor | null;
  kept: Anchor[];
  eta: (km: number) => number | null;
  untilMs?: number;
  elapsedSec?: number;
}

const MIN_PACE = 160; // 2:40 /km
const MAX_PACE = 600; // 10:00 /km
// Without any checkpoint the estimate turns stale once even the slowest pace would have reached
// the finish, but never earlier than 4.5 h (the old fixed value). Half marathon 4.5 h, marathon 7.03 h.
const MIN_STALE_AFTER_MS = 4.5 * 3600 * 1000;

export function estimate(state: RaceState, checkpoints: Checkpoint[], distanceKm: number, t: number): Estimate {
  const t0 = state.actualStart ?? state.plannedStart;
  const target = (state.targetSec || 6000) / distanceKm;

  const anchors: Anchor[] = checkpoints
    .map((c) => ({ km: +c.km, t: c.netSec != null ? t0 + c.netSec * 1000 : (c.at as number), src: c.src, id: c.id }))
    .filter((a) => a.km > 0 && a.km <= distanceKm + 0.01 && a.t > t0 && a.t <= t + 60_000)
    .sort((a, b) => a.t - b.t);

  // Keep a monotonic chain. A later anchor with a lower km replaces earlier ones,
  // unless an official split would be overridden by a sighting.
  const kept: Anchor[] = [];
  for (const a of anchors) {
    while (kept.length && kept[kept.length - 1].km >= a.km) {
      const prev = kept[kept.length - 1];
      if (prev.src === "official" && a.src !== "official") {
        a.drop = true;
        break;
      }
      kept.pop();
    }
    if (!a.drop) kept.push(a);
  }

  const last = kept[kept.length - 1] ?? null;
  let pace = target;
  if (last && last.km >= 1) {
    const overall = (last.t - t0) / 1000 / last.km;
    const prev = kept.length > 1 ? kept[kept.length - 2] : { km: 0, t: t0 };
    const segKm = last.km - prev.km;
    const seg = segKm >= 2 ? (last.t - prev.t) / 1000 / segKm : overall;
    pace = 0.6 * seg + 0.4 * overall;
  }
  pace = Math.max(MIN_PACE, Math.min(MAX_PACE, pace));

  const fin = kept.find((a) => a.km >= distanceKm - 0.01);
  const base = last ? { km: last.km, t: last.t } : { km: 0, t: t0 };
  const eta = (km: number) => (km <= base.km ? null : base.t + (km - base.km) * pace * 1000);

  if (state.finishedAt || fin) {
    const ft = fin ? fin.t : (state.finishedAt as number);
    return { phase: "done", km: distanceKm, t0, pace: (ft - t0) / 1000 / distanceKm, finishAt: ft, netSec: (ft - t0) / 1000, last, kept, eta: () => null };
  }
  if (t < t0) {
    return { phase: "pre", km: 0, t0, pace: target, finishAt: t0 + state.targetSec * 1000, netSec: state.targetSec, last: null, kept, eta: (km) => t0 + km * target * 1000, untilMs: t0 - t };
  }

  let km = base.km + (t - base.t) / 1000 / pace;
  const finishAt = base.t + (distanceKm - base.km) * pace * 1000;
  let phase: Phase = "run";
  if (km >= distanceKm - 0.05) {
    km = distanceKm - 0.05;
    phase = "arriving";
  }
  const staleAfterMs = Math.max(MIN_STALE_AFTER_MS, distanceKm * MAX_PACE * 1000);
  if (t - t0 > staleAfterMs && !last) phase = "stale";
  return { phase, km, t0, pace, finishAt, netSec: (finishAt - t0) / 1000, last, kept, eta, elapsedSec: (t - t0) / 1000 };
}

/** Estimated wall clock time at which the runner passed km k, interpolated between anchors. */
export function estPassTime(est: Estimate, k: number): number {
  const pts = [{ km: 0, t: est.t0 }, ...est.kept];
  for (let i = 1; i < pts.length; i++) {
    if (k <= pts[i].km) {
      const a = pts[i - 1];
      const b = pts[i];
      return a.t + ((k - a.km) / (b.km - a.km)) * (b.t - a.t);
    }
  }
  const l = pts[pts.length - 1];
  return l.t + (k - l.km) * est.pace * 1000;
}
