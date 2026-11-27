// Phase and main action of the hero (docs/tasks/029-claude-hero.md), from the same estimate as the status card.
import { watchRace } from "../lib/live/page";
import { raceEstimate, type RacePlan } from "../lib/live/spots";
import { finalText, heroAction, statusView } from "../lib/live/status";
import { emptyState, type LiveState } from "../lib/live/supabase";
import { getSupabase } from "../lib/supabase";
import { fmtDur } from "../lib/format";

/** The countdown in the pill changes every second, like the status card. */
const TICK_MS = 1000;

export function startHero(root: HTMLElement): void {
  const slug = root.dataset.slug!;
  const tz = root.dataset.tz || "Europe/Berlin";
  const plan = JSON.parse(root.dataset.plan!) as RacePlan;
  const pill = root.querySelector<HTMLElement>(".pill")!;
  const phase = root.querySelector<HTMLElement>("#hero-phase")!;
  // The same main action in the nav, the hero and the closing section (docs/tasks/033-claude-navigation.md).
  const ctas = [...document.querySelectorAll<HTMLAnchorElement>("[data-cta]")];
  const labels = [...document.querySelectorAll<HTMLElement>("[data-cta-label]")];
  const finalTitle = document.querySelector<HTMLElement>("[data-final-title]");
  const finalSub = document.querySelector<HTMLElement>("[data-final-sub]");
  const proof = root.querySelector<HTMLElement>("#hero-proof")!;
  const bib = root.querySelector<HTMLElement>("#hero-bib")!;
  // Only before a result: with a net time from the content file the hero shows that instead.
  const target = root.querySelector<HTMLElement>("#hero-target");
  let state: LiveState = emptyState();

  function render() {
    const now = Date.now();
    const est = raceEstimate(state.race, state.checkpoints, plan, now);
    const v = statusView(est, { now, tz, targetSec: state.race?.target_sec || plan.targetSec, distanceKm: state.race?.distance_km || plan.distanceKm, runner: state.race?.runner_name || "Dima" });
    pill.className = `pill caption-4 ${v.tone}`.trim();
    phase.textContent = v.phaseText;
    const a = heroAction(est.phase);
    for (const c of ctas) c.href = a.href;
    for (const l of labels) l.textContent = a.label;
    const f = finalText(est.phase);
    if (finalTitle) finalTitle.textContent = f.title;
    if (finalSub) finalSub.textContent = f.sub;
    // At the finish the time is real, not estimated.
    proof.hidden = est.phase === "done";
    // The bib from the settings (docs/tasks/032-claude-einstellungen.md) wins over the content file.
    if (state.race?.bib) {
      bib.querySelector("dd")!.textContent = state.race.bib;
      bib.hidden = false;
    }
    if (target && state.race?.target_sec) target.textContent = fmtDur(state.race.target_sec);
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
