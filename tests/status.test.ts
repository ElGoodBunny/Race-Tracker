// Status card (docs/tasks/027-claude-statuskarte.md): what it says in each phase, texts as in legacy/hamburg-2026.html.
import { describe, expect, it } from "vitest";
import { estimate, type Checkpoint } from "../src/lib/estimate";
import { heroAction, statusView } from "../src/lib/live/status";

const START = Date.parse("2027-03-14T07:30:00Z"); // 8:30 in Barcelona
const DIST = 42.195;
const TARGET = 13500; // 3:45:00
const opts = { tz: "Europe/Madrid", targetSec: TARGET, distanceKm: DIST, runner: "Dima" };
const est = (t: number, cps: Checkpoint[] = [], finishedAt: number | null = null) =>
  estimate({ plannedStart: START, actualStart: null, finishedAt, targetSec: TARGET }, cps, DIST, t);
const text = (v: ReturnType<typeof statusView>) => v.basis.map((b) => b.text).join("");

describe("statusView", () => {
  it("days before the start: days to go, the plan and the planned finish", () => {
    const v = statusView(est(START - (3 * 86400 + 5 * 3600) * 1000), { ...opts, now: START - (3 * 86400 + 5 * 3600) * 1000 });
    expect(v).toMatchObject({ tone: "", phaseText: "Start in 3 T 5 Std", big: "3", unit: "Tage", progress: 0 });
    expect(v.stats).toEqual([["Start", "08:30"], ["Pace (Plan)", "5:20 /km"], ["Ziel ca.", "12:15"]]);
    expect(v.chip).toEqual({ kind: "plan", text: "Plan" });
    expect(text(v)).toBe("Zielzeit 3:45:00. Am Renntag läuft die Schätzung ab der Startmatte.");
    expect(v.basis.find((b) => b.bold)?.text).toBe("3:45:00");
  });
  it("one day before the start says Tag, not Tage", () => {
    const t = START - 86400_000 - 60_000;
    expect(statusView(est(t), { ...opts, now: t })).toMatchObject({ big: "1", unit: "Tag" });
  });
  it("on race day: a countdown", () => {
    const t = START - (1 * 3600 + 2 * 60 + 3) * 1000;
    expect(statusView(est(t), { ...opts, now: t })).toMatchObject({ phaseText: "Start in 1:02:03", big: "1:02:03", unit: "bis Start" });
    const u = START - 65_000;
    expect(statusView(est(u), { ...opts, now: u })).toMatchObject({ big: "1:05", unit: "bis Start" });
  });
  it("running without a confirmation: km, time, pace, forecast from the target", () => {
    const t = START + 3600_000;
    const v = statusView(est(t), { ...opts, now: t });
    expect(v).toMatchObject({ tone: "live", phaseText: "Live · geschätzt", unit: "km" });
    expect(v.big).toBe("11,3");
    expect(v.stats).toEqual([["Laufzeit", "1:00:00"], ["Pace", "5:20 /km"], ["Ziel ca.", "12:15"]]);
    expect(v.chip.kind).toBe("plan");
    expect(text(v)).toBe("Noch keine Bestätigung von der Strecke, geschätzt aus der Zielzeit 3:45:00.");
    expect(v.progress).toBeCloseTo(11.25 / DIST, 2);
  });
  it("running after a sighting: when and where it was confirmed, and the forecast", () => {
    const t = START + 3600_000;
    const v = statusView(est(t, [{ km: 10, netSec: null, at: t - 12 * 60_000, src: "seen" }]), { ...opts, now: t });
    expect(v.chip).toEqual({ kind: "seen", text: "Sichtung" });
    expect(text(v)).toMatch(/^Zuletzt bestätigt bei km 10,0, vor 12 min\. Prognose \d:\d\d:\d\d\.$/);
    expect(v.basis.find((b) => b.bold)?.text).toBe("km 10,0");
  });
  it("an official split is named as such", () => {
    const t = START + 3600_000;
    const v = statusView(est(t, [{ km: 10, netSec: 3000, at: null, src: "official" }]), { ...opts, now: t });
    expect(v.chip).toEqual({ kind: "official", text: "Offizieller Split" });
  });
  it("close to the finish and without any data", () => {
    const late = START + (3 * 3600 + 44 * 60 + 50) * 1000;
    expect(statusView(est(late), { ...opts, now: late }).phaseText).toBe("Gleich im Ziel");
    const stale = START + 8 * 3600_000;
    expect(statusView(est(stale), { ...opts, now: stale })).toMatchObject({ tone: "", phaseText: "Keine Daten" });
  });
  it("at the finish: net time, finish clock, average pace, distance", () => {
    const fin = START + (3 * 3600 + 40 * 60) * 1000;
    const v = statusView(est(fin + 1, [], fin), { ...opts, now: fin + 1 });
    expect(v).toMatchObject({ tone: "done", phaseText: "Im Ziel", big: "3:40:00", unit: "netto", progress: 1 });
    expect(v.stats).toEqual([["Zieleinlauf", "12:10"], ["Ø Pace", "5:13 /km"], ["Distanz", "42,2 km"]]);
    expect(v.chip).toEqual({ kind: "official", text: "Ziel" });
    expect(text(v)).toBe("Geschafft. Glückwunsch an Dima.");
  });
});

describe("heroAction", () => {
  it("one main action per phase, as in the legacy page", () => {
    expect(heroAction("pre")).toEqual({ label: "Spot setzen", href: "#spots" });
    expect(heroAction("run")).toEqual({ label: "Live verfolgen", href: "#live" });
    expect(heroAction("arriving")).toEqual({ label: "Live verfolgen", href: "#live" });
    expect(heroAction("done")).toEqual({ label: "Zeiten ansehen", href: "#ergebnis" });
  });
  it("without data the legacy page fell back to the action before the start", () => {
    expect(heroAction("stale")).toEqual({ label: "Spot setzen", href: "#spots" });
  });
});
