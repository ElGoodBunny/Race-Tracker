// Status card "Wo ist Dima?" (docs/tasks/027-claude-statuskarte.md). Texts and order from renderStatus() in
// legacy/hamburg-2026.html. Pure, so every phase is tested. The page sets everything with textContent.
import type { Estimate, Phase } from "../estimate";
import { fmtAgo, fmtClock, fmtDur, fmtKm, fmtPace } from "../format";

export interface StatusView {
  /** "live" blinks, "done" is green, "" is neutral. */
  tone: "live" | "done" | "";
  phaseText: string;
  big: string;
  unit: string;
  stats: [label: string, value: string][];
  chip: { kind: "plan" | "official" | "seen"; text: string };
  /** One sentence, bold parts marked. */
  basis: { text: string; bold?: boolean }[];
  /** Share of the distance, 0 to 1. */
  progress: number;
}

interface Options {
  now: number;
  tz: string;
  targetSec: number;
  distanceKm: number;
  runner: string;
}

const pad = (n: number) => String(n).padStart(2, "0");

export function statusView(est: Estimate, { now, tz, targetSec, distanceKm, runner }: Options): StatusView {
  const clock = (ms: number) => fmtClock(ms, tz);
  const pace = (s: number) => `${fmtPace(s)} /km`;

  if (est.phase === "pre") {
    const u = Math.max(0, est.untilMs ?? est.t0 - now);
    const d = Math.floor(u / 86400000);
    const h = Math.floor((u % 86400000) / 3600000);
    const m = Math.floor((u % 3600000) / 60000);
    const s = Math.floor((u % 60000) / 1000);
    const countdown = h ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`;
    return {
      tone: "",
      phaseText: d > 0 ? `Start in ${d} T ${h} Std` : `Start in ${countdown}`,
      big: d > 0 ? String(d) : countdown,
      unit: d > 0 ? (d === 1 ? "Tag" : "Tage") : "bis Start",
      stats: [["Start", clock(est.t0)], ["Pace (Plan)", pace(est.pace)], ["Ziel ca.", clock(est.finishAt)]],
      chip: { kind: "plan", text: "Plan" },
      basis: [{ text: "Zielzeit " }, { text: fmtDur(targetSec), bold: true }, { text: ". Am Renntag läuft die Schätzung ab der Startmatte." }],
      progress: 0,
    };
  }

  if (est.phase === "done") {
    return {
      tone: "done",
      phaseText: "Im Ziel",
      big: fmtDur(est.netSec),
      unit: "netto",
      stats: [["Zieleinlauf", clock(est.finishAt)], ["Ø Pace", pace(est.pace)], ["Distanz", `${fmtKm(distanceKm)} km`]],
      chip: { kind: "official", text: "Ziel" },
      basis: [{ text: `Geschafft. Glückwunsch an ${runner}.` }],
      progress: 1,
    };
  }

  const last = est.last;
  return {
    tone: est.phase === "stale" ? "" : "live",
    phaseText: est.phase === "arriving" ? "Gleich im Ziel" : est.phase === "stale" ? "Keine Daten" : "Live · geschätzt",
    big: fmtKm(est.km),
    unit: "km",
    stats: [["Laufzeit", fmtDur(est.elapsedSec ?? 0)], ["Pace", pace(est.pace)], ["Ziel ca.", clock(est.finishAt)]],
    chip: last ? (last.src === "official" ? { kind: "official", text: "Offizieller Split" } : { kind: "seen", text: "Sichtung" }) : { kind: "plan", text: "Plan" },
    basis: last
      ? [{ text: "Zuletzt bestätigt bei " }, { text: `km ${fmtKm(last.km)}`, bold: true }, { text: `, ${fmtAgo(now - last.t)}. Prognose ${fmtDur(est.netSec)}.` }]
      : [{ text: `Noch keine Bestätigung von der Strecke, geschätzt aus der Zielzeit ${fmtDur(targetSec)}.` }],
    progress: Math.min(1, Math.max(0, est.km / distanceKm)),
  };
}

/** Main action of the hero (docs/tasks/029-claude-hero.md). The legacy page knew only before, live and done, "stale" counted as before. */
export function heroAction(phase: Phase): { label: string; href: string } {
  if (phase === "run" || phase === "arriving") return { label: "Live verfolgen", href: "#live" };
  if (phase === "done") return { label: "Zeiten ansehen", href: "#ergebnis" };
  return { label: "Spot setzen", href: "#spots" };
}
