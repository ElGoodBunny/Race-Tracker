// Browser side of Status.astro (docs/tasks/027-claude-statuskarte.md). Same connection as spots and pinboard.
import { fmtClock, fmtDay } from "../lib/format";
import { watchRace } from "../lib/live/page";
import { raceEstimate, type RacePlan } from "../lib/live/spots";
import { statusView } from "../lib/live/status";
import { emptyState, type LiveState } from "../lib/live/supabase";
import { getSupabase } from "../lib/supabase";

/** The legacy card ticked every second, the countdown needs it. */
const TICK_MS = 1000;

export function startStatus(root: HTMLElement): void {
  const slug = root.dataset.slug!;
  const tz = root.dataset.tz || "Europe/Berlin";
  const plan = JSON.parse(root.dataset.plan!) as RacePlan;
  const $ = (id: string) => root.querySelector<HTMLElement>(`#${id}`)!;
  const clock = $("status-clock");
  const pill = $("status-pill");
  const phase = $("status-phase");
  const big = $("status-big");
  const unit = $("status-unit");
  const fill = $("status-fill");
  const stats = $("status-stats");
  const basis = $("status-basis");
  let state: LiveState = emptyState();

  function render() {
    const now = Date.now();
    const distanceKm = state.race?.distance_km || plan.distanceKm;
    const est = raceEstimate(state.race, state.checkpoints, plan, now);
    const v = statusView(est, { now, tz, targetSec: state.race?.target_sec || plan.targetSec, distanceKm, runner: state.race?.runner_name || "Dima" });
    clock.textContent = `${fmtDay(now, tz)} ${fmtClock(now, tz)}`;
    pill.className = `pill caption-4 ${v.tone}`.trim();
    phase.textContent = v.phaseText;
    big.textContent = v.big;
    unit.textContent = v.unit;
    fill.style.transform = `scaleX(${v.progress.toFixed(4)})`;
    stats.replaceChildren(
      ...v.stats.map(([k, val]) => {
        const div = document.createElement("div");
        const dt = document.createElement("dt");
        dt.textContent = k;
        const dd = document.createElement("dd");
        dd.textContent = val;
        div.append(dt, dd);
        return div;
      }),
    );
    const chip = document.createElement("span");
    chip.className = `chip ${v.chip.kind}`;
    chip.textContent = v.chip.text;
    const line = document.createElement("span");
    line.append(...v.basis.map((b) => (b.bold ? Object.assign(document.createElement("b"), { textContent: b.text }) : b.text)));
    basis.replaceChildren(chip, line);
  }

  render();
  const client = getSupabase();
  if (client) {
    watchRace(client, slug, (s) => {
      state = s;
      render();
    });
  }
  window.setInterval(render, TICK_MS);
}
