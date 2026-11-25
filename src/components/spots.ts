// Browser side of Spots.astro (docs/tasks/025-claude-spots.md). Everything users write goes out via textContent.
import type { CourseData } from "../lib/course";
import { landmarkNear } from "../lib/course";
import { fmtClock, fmtIn, fmtKm } from "../lib/format";
import { guestStore, watchRace } from "../lib/live/page";
import { addSpot, checkSpotKm, checkSpotName, deleteSpot, isMine, raceEstimate, spotEta, type RacePlan } from "../lib/live/spots";
import { emptyState, type LiveState, type SpotRow } from "../lib/live/supabase";
import { getSupabase } from "../lib/supabase";
import { fieldErr, guestPrompt } from "./guest-prompt";

const ICON_X = '<svg class="ico" viewBox="0 0 256 256" fill="currentColor" aria-hidden="true"><path d="M205.66,194.34a8,8,0,0,1-11.32,11.32L128,139.31,61.66,205.66a8,8,0,0,1-11.32-11.32L116.69,128,50.34,61.66A8,8,0,0,1,61.66,50.34L128,116.69l66.34-66.35a8,8,0,0,1,11.32,11.32L139.31,128Z"></path></svg>';
/** Same colours and order as the pins in 3D: by km, flag-1 to flag-6. */
const spotColor = (i: number) => `var(--flag-${(i % 6) + 1})`;
/** The legacy list refreshed its times every 15 s. */
const REFRESH_MS = 15_000;

export function startSpots(root: HTMLElement): void {
  const slug = root.dataset.slug!;
  const tz = root.dataset.tz || "Europe/Berlin";
  const plan = JSON.parse(root.dataset.plan!) as RacePlan;
  const landmarks = JSON.parse(root.dataset.landmarks!) as Pick<CourseData, "km" | "landmarks">;
  const $ = <T extends HTMLElement>(id: string) => root.querySelector<T>(`#${id}`)!;
  const mineView = $("mine-view");
  const form = $<HTMLFormElement>("spot-form");
  const nameInput = $<HTMLInputElement>("spot-name");
  const nameErr = $("spot-err");
  const kmInput = $<HTMLInputElement>("spot-km");
  const kmLabel = $("spot-km-label");
  const list = $("spot-list");
  const count = $("spot-count");
  const listErr = $("list-err");

  const text = (tag: string, cls: string, value: string) => {
    const node = document.createElement(tag);
    node.className = cls;
    node.textContent = value;
    return node;
  };
  const where = (km: number) => {
    const lm = landmarkNear(landmarks as CourseData, km);
    return `km ${fmtKm(km)}${lm ? ` · ${lm}` : ""}`;
  };

  const client = getSupabase();
  if (!client) {
    mineView.replaceChildren(text("p", "hint body-6", "Die Spots sind gerade nicht erreichbar."));
    return;
  }
  const db = client;
  const guests = guestStore(db);
  let state: LiveState = emptyState();
  let busy = false;

  /** Time and the line under it, like the legacy list: "vorbei" or the arrival, by plan before the start. */
  function when(km: number, now: number, est: ReturnType<typeof raceEstimate>) {
    const eta = spotEta(est, km);
    if (eta.passed) return { passed: true, big: "vorbei", small: est.phase === "pre" ? "" : "geschätzt" };
    if (eta.at == null) return { passed: false, big: "k. A.", small: "" };
    return { passed: false, big: fmtClock(eta.at, tz), small: est.phase === "pre" ? "nach Plan" : fmtIn(eta.at - now) };
  }

  function renderMine(mine: SpotRow[], now: number, est: ReturnType<typeof raceEstimate>) {
    if (state.status === "loading" && !state.spots.length) return mineView.replaceChildren(text("p", "hint body-6", "Spots laden."));
    if (!mine.length) return mineView.replaceChildren(text("p", "hint body-6", "Wo stehst du? Setz deinen Spot, dann siehst du hier, wann Dima bei dir ist."));
    // The next own spot ahead, after the last one passed the last.
    const s = mine.find((m) => !spotEta(est, m.km).passed) ?? mine[mine.length - 1];
    const w = when(s.km, now, est);
    const big = est.phase === "done" ? "Im Ziel" : w.passed ? "Vorbei" : w.big;
    const small = est.phase === "done" ? "" : w.passed ? "laut Schätzung" : w.small;
    const eta = text("p", "eta heading-3", big);
    if (small) eta.append(text("small", "", small));
    mineView.replaceChildren(text("p", "eyebrow body-6", `${s.name} · km ${fmtKm(s.km)}`), eta);
  }

  function render() {
    const now = Date.now();
    const me = guests.get()?.id ?? null;
    const est = raceEstimate(state.race, state.checkpoints, plan, now);
    const spots = state.spots;
    renderMine(spots.filter((s) => isMine(s, me)), now, est);
    count.textContent = spots.length ? `${spots.length} ${spots.length === 1 ? "Spot" : "Spots"}` : "";
    if (!spots.length) {
      const li = document.createElement("li");
      li.className = "empty-row";
      li.append(text("p", "empty body-6", state.status === "loading" ? "Spots laden." : "Noch niemand eingetragen. Wer an der Strecke steht, setzt hier seinen Spot und sieht, wann Dima vorbeikommt."));
      list.replaceChildren(li);
    } else {
      list.replaceChildren(
        ...spots.map((s, i) => {
          const mine = isMine(s, me);
          const w = when(s.km, now, est);
          const li = document.createElement("li");
          li.className = [mine && "mine", w.passed && "passed"].filter(Boolean).join(" ");
          const sw = document.createElement("span");
          sw.className = "sw";
          sw.style.background = spotColor(i);
          const mid = document.createElement("div");
          mid.append(text("div", "name title-3", s.name), text("div", "sub caption-5", `${where(s.km)} · ${mine ? "dein Spot" : `von ${s.author_name}`}`));
          const right = document.createElement("div");
          right.className = "right";
          const time = text("div", "when body-5", w.big);
          if (w.small) time.append(text("small", "caption-5", w.small));
          right.append(time);
          if (mine) {
            const x = document.createElement("button");
            x.type = "button";
            x.className = "x";
            x.innerHTML = ICON_X; // fixed icon, no user input
            x.setAttribute("aria-label", `Spot ${s.name} löschen`);
            x.title = "Spot löschen";
            x.onclick = async () => {
              x.disabled = true;
              const r = await deleteSpot(db, s.id);
              x.disabled = false;
              listErr.textContent = r.error ?? "";
              listErr.hidden = !r.error;
            };
            right.append(x);
          }
          li.append(sw, mid, right);
          return li;
        }),
      );
    }
  }

  const showKm = () => {
    const k = checkSpotKm(kmInput.value, plan.distanceKm);
    kmLabel.textContent = "km" in k ? where(k.km) : "";
  };

  function setBusy(on: boolean) {
    busy = on;
    root.querySelectorAll<HTMLButtonElement>("form button").forEach((b) => (b.disabled = on));
  }

  async function save(name: string, km: number) {
    if (busy) return;
    if (!guests.get()?.name) {
      prompt.open(() => save(name, km));
      return;
    }
    setBusy(true);
    const r = await addSpot(db, slug, name, km);
    setBusy(false);
    if (r.error) return fieldErr(nameInput, nameErr, r.error);
    nameInput.value = "";
  }

  const prompt = guestPrompt($<HTMLFormElement>("spot-guest"), db, setBusy);

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const name = checkSpotName(nameInput.value);
    if ("error" in name) {
      fieldErr(nameInput, nameErr, name.error);
      nameInput.focus();
      return;
    }
    const km = checkSpotKm(kmInput.value, plan.distanceKm);
    if ("error" in km) return fieldErr(nameInput, nameErr, km.error);
    fieldErr(nameInput, nameErr, "");
    save(name.name, km.km);
  });
  kmInput.addEventListener("input", showKm);

  showKm();
  form.hidden = false;
  guests.on(render);
  guests.load().catch(() => {});
  watchRace(db, slug, (s) => {
    state = s;
    render();
  });
  window.setInterval(render, REFRESH_MS);
}
