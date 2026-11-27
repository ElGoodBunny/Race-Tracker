// Browser side of Seen.astro (docs/tasks/026-claude-gesehen.md). Same guest and same connection as pinboard and spots.
import { fmtKm } from "../lib/format";
import { guestStore, watchRace } from "../lib/live/page";
import { reportSeen, sightingKm } from "../lib/live/seen";
import { isMine, raceEstimate, type RacePlan } from "../lib/live/spots";
import { emptyState, type LiveState } from "../lib/live/supabase";
import { getSupabase } from "../lib/supabase";
import { guestPrompt } from "./guest-prompt";

/** The legacy page checked every 15 s whether the button shows. */
const REFRESH_MS = 15_000;

export function startSeen(root: HTMLElement): void {
  const client = getSupabase();
  if (!client) return;
  const db = client;
  const slug = root.dataset.slug!;
  const plan = JSON.parse(root.dataset.plan!) as RacePlan;
  const $ = <T extends HTMLElement>(id: string) => root.querySelector<T>(`#${id}`)!;
  const btn = $<HTMLButtonElement>("seen-btn");
  const hint = $("seen-hint");
  const err = $("seen-err");
  const guests = guestStore(db);
  let state: LiveState = emptyState();
  let busy = false;

  /** null while the button is hidden. Computed at the moment of the report, the name prompt can take a while. */
  function currentKm(): number | null {
    const me = guests.get()?.id ?? null;
    const est = raceEstimate(state.race, state.checkpoints, plan, Date.now());
    const mine = state.spots.filter((s) => isMine(s, me));
    return sightingKm(est, mine, state.race?.distance_km || plan.distanceKm);
  }

  function render() {
    root.hidden = state.status === "loading" || currentKm() == null;
  }

  function setBusy(on: boolean) {
    busy = on;
    root.querySelectorAll<HTMLButtonElement>("button").forEach((b) => (b.disabled = on));
  }

  function showErr(text: string) {
    err.textContent = text;
    err.hidden = !text;
  }

  async function report() {
    if (busy) return;
    if (!guests.get()?.name) {
      prompt.open(() => report());
      return;
    }
    const km = currentKm();
    if (km == null) return render();
    showErr("");
    setBusy(true);
    const r = await reportSeen(db, slug, km);
    setBusy(false);
    if (r.error) return showErr(r.error);
    hint.textContent = `Danke, Sichtung bei km ${fmtKm(km)} gespeichert.`;
  }

  const prompt = guestPrompt($<HTMLFormElement>("seen-guest"), db, setBusy);
  btn.addEventListener("click", () => report());

  guests.on(render);
  guests.load().catch(() => {});
  watchRace(db, slug, (s) => {
    state = s;
    render();
  });
  window.setInterval(render, REFRESH_MS);
}
