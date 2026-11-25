// Browser side of Splits.astro (docs/tasks/028-claude-zwischenzeiten.md). Same connection as the rest of the page.
import { watchRace } from "../lib/live/page";
import { splitRows, type SplitPoint } from "../lib/live/splits";
import { raceEstimate, type RacePlan } from "../lib/live/spots";
import { emptyState, type LiveState } from "../lib/live/supabase";
import { getSupabase } from "../lib/supabase";

/** The legacy table refreshed every 15 s. */
const REFRESH_MS = 15_000;

export function startSplits(root: HTMLElement): void {
  const slug = root.dataset.slug!;
  const tz = root.dataset.tz || "Europe/Berlin";
  const plan = JSON.parse(root.dataset.plan!) as RacePlan;
  const points = JSON.parse(root.dataset.points!) as SplitPoint[];
  const body = root.querySelector<HTMLElement>("#split-body")!;
  let state: LiveState = emptyState();

  const cell = (value: string, cls = "") => {
    const td = document.createElement("td");
    if (cls) td.className = cls;
    td.textContent = value;
    return td;
  };

  function render() {
    const est = raceEstimate(state.race, state.checkpoints, plan, Date.now());
    body.replaceChildren(
      ...splitRows(est, points, tz).map((r) => {
        const tr = document.createElement("tr");
        const src = document.createElement("td");
        if (r.src) {
          const chip = document.createElement("span");
          chip.className = `chip ${r.src.kind}`;
          chip.textContent = r.src.text;
          src.append(chip);
        }
        tr.append(cell(r.name), cell(r.time, "num"), cell(r.clock, "num"), cell(r.pace, "num"), src);
        return tr;
      }),
    );
  }

  render();
  const client = getSupabase();
  if (client) {
    watchRace(client, slug, (s) => {
      state = s;
      render();
    });
  }
  window.setInterval(render, REFRESH_MS);
}
