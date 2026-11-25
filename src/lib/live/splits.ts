// Split table (docs/tasks/028-claude-zwischenzeiten.md), ported from renderSplits() in legacy/hamburg-2026.html.
// The legacy rows were fixed for Hamburg (5, 10, 15, turn, 20, finish), here they come from distance and turn.
import { estPassTime, type Estimate } from "../estimate";
import { fmtClock, fmtDur, fmtPace } from "../format";

export interface SplitPoint {
  km: number;
  name: string;
}
export interface SplitRow {
  name: string;
  /** Net time since the start mat, "·" when unknown. */
  time: string;
  clock: string;
  /** Pace on the segment since the row before. */
  pace: string;
  src: { kind: "official" | "seen" | "plan"; text: string } | null;
}

/** A legacy split counted as official when it was this close to the point. */
const MATCH_KM = 0.06;

/** Every 5 km before the finish, the turn if there is one, and the finish. */
export function splitPoints(distanceKm: number, turnKm?: number): SplitPoint[] {
  const pts: SplitPoint[] = [];
  for (let k = 5; k < distanceKm - 0.5; k += 5) pts.push({ km: k, name: `${k} km` });
  if (turnKm && turnKm > 0 && turnKm < distanceKm) pts.push({ km: turnKm, name: "Wende" });
  pts.sort((a, b) => a.km - b.km);
  pts.push({ km: distanceKm, name: "Ziel" });
  return pts;
}

export function splitRows(est: Estimate, points: SplitPoint[], tz: string): SplitRow[] {
  const finishKm = points[points.length - 1]?.km;
  let prevKm = 0;
  let prevT = est.t0;
  return points.map(({ km, name }) => {
    const a = est.kept.find((x) => Math.abs(x.km - km) < MATCH_KM && x.src === "official");
    let at: number | null;
    let src: SplitRow["src"];
    if (a) {
      at = a.t;
      src = { kind: "official", text: "offiziell" };
    } else if (est.phase === "done" && km === finishKm) {
      at = est.finishAt;
      src = { kind: "official", text: "Ziel" };
    } else if (km <= est.km && est.phase !== "pre") {
      at = estPassTime(est, km);
      src = { kind: "seen", text: "geschätzt" };
    } else {
      at = est.eta(km);
      src = est.phase === "pre" ? { kind: "plan", text: "Plan" } : { kind: "plan", text: "Prognose" };
    }
    if (at == null) return { name, time: "·", clock: "·", pace: "·", src: null };
    const pace = (at - prevT) / 1000 / (km - prevKm);
    prevKm = km;
    prevT = at;
    return { name, time: fmtDur((at - est.t0) / 1000), clock: fmtClock(at, tz), pace: fmtPace(pace), src };
  });
}
