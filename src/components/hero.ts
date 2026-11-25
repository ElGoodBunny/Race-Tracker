// Phase and main action of the hero (docs/tasks/029-claude-hero.md), from the same estimate as the status card.
import { watchRace } from "../lib/live/page";
import { raceEstimate, type RacePlan } from "../lib/live/spots";
import { heroAction, statusView } from "../lib/live/status";
import { emptyState, type LiveState } from "../lib/live/supabase";
import { getSupabase } from "../lib/supabase";

/** The countdown in the pill changes every second, like the status card. */
const TICK_MS = 1000;

export function startHero(root: HTMLElement): void {
  const slug = root.dataset.slug!;
  const tz = root.dataset.tz || "Europe/Berlin";
  const plan = JSON.parse(root.dataset.plan!) as RacePlan;
  const pill = root.querySelector<HTMLElement>(".pill")!;
  const phase = root.querySelector<HTMLElement>("#hero-phase")!;
  const cta = root.querySelector<HTMLAnchorElement>("#hero-cta")!;
  const label = root.querySelector<HTMLElement>("#hero-cta-label")!;
  const proof = root.querySelector<HTMLElement>("#hero-proof")!;
  const bib = root.querySelector<HTMLElement>("#hero-bib")!;
  let state: LiveState = emptyState();

  function render() {
    const now = Date.now();
    const est = raceEstimate(state.race, state.checkpoints, plan, now);
    const v = statusView(est, { now, tz, targetSec: state.race?.target_sec || plan.targetSec, distanceKm: state.race?.distance_km || plan.distanceKm, runner: state.race?.runner_name || "Dima" });
    pill.className = `pill caption-4 ${v.tone}`.trim();
    phase.textContent = v.phaseText;
    const a = heroAction(est.phase);
    cta.href = a.href;
    label.textContent = a.label;
    // At the finish the time is real, not estimated.
    proof.hidden = est.phase === "done";
    // The bib from the settings (docs/tasks/032-claude-einstellungen.md) wins over the content file.
    if (state.race?.bib) {
      bib.querySelector("dd")!.textContent = state.race.bib;
      bib.hidden = false;
    }
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
