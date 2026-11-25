// Browser side of Settings.astro (docs/tasks/032-claude-einstellungen.md). Everything users write goes out via textContent.
import type { Session } from "@supabase/supabase-js";
import { fmtClock, fmtDay, fmtDur } from "../lib/format";
import {
  checkLiveTrack,
  checkSettings,
  checkSplit,
  deleteSplit,
  isoToLocal,
  liveTrackStatus,
  loadRole,
  officialSplits,
  saveSettings,
  sendMagicLink,
  setLiveTrack,
  setRaceTimes,
  setSplit,
  type Role,
  type SettingsInput,
} from "../lib/live/admin";
import { loadGuest } from "../lib/live/guest";
import { guestStore, watchRace } from "../lib/live/page";
import { emptyState, type LiveState } from "../lib/live/supabase";
import { getSupabase } from "../lib/supabase";
import { fieldErr, loadTurnstile } from "./guest-prompt";

const ICON_X = '<svg class="ico" viewBox="0 0 256 256" fill="currentColor" aria-hidden="true"><path d="M205.66,194.34a8,8,0,0,1-11.32,11.32L128,139.31,61.66,205.66a8,8,0,0,1-11.32-11.32L116.69,128,50.34,61.66A8,8,0,0,1,61.66,50.34L128,116.69l66.34-66.35a8,8,0,0,1,11.32,11.32L139.31,128Z"></path></svg>';
const HASH = "#einstellungen";
/** The reset asks twice, like the legacy button. */
const ARM_MS = 4000;
/** Same tolerance as splitRows: a split this close to a point belongs to it. */
const MATCH_KM = 0.06;

interface Defaults {
  plannedStart: string;
  targetSec: number;
  bib: string;
  block: string;
}

export function startSettings(root: HTMLElement): void {
  const client = getSupabase();
  // Without a backend there is nothing to sign in to. The footer link then leads nowhere visible, which is fine.
  if (!client) return;
  const db = client;
  const slug = root.dataset.slug!;
  const tz = root.dataset.tz || "Europe/Berlin";
  const defaults = JSON.parse(root.dataset.defaults!) as Defaults;
  const $ = <T extends HTMLElement>(id: string) => root.querySelector<T>(`#${id}`)!;

  const loginForm = $<HTMLFormElement>("login-form");
  const mail = $<HTMLInputElement>("login-mail");
  const loginErr = $("login-err");
  const loginHint = $("login-hint");
  const captchaBox = $("login-captcha");
  const signedIn = $("signed-in");
  const who = $("who");
  const runBlock = $("run-block");
  const goBtn = $<HTMLButtonElement>("go-btn");
  const finBtn = $<HTMLButtonElement>("fin-btn");
  const resetBtn = $<HTMLButtonElement>("reset-btn");
  const runHint = $("run-hint");
  const splitBlock = $("split-block");
  const splitForm = $<HTMLFormElement>("split-form");
  const splitKmSel = $<HTMLSelectElement>("split-km");
  const splitTime = $<HTMLInputElement>("split-time");
  const splitErr = $("split-err");
  const cpList = $("cp-list");
  const cfgBlock = $("cfg-block");
  const cfgForm = $<HTMLFormElement>("cfg-form");
  const cfgHint = $("cfg-hint");
  const ltForm = $<HTMLFormElement>("lt-form");
  const ltUrl = $<HTMLInputElement>("lt-url");
  const ltErr = $("lt-err");
  const ltStatus = $("lt-status");
  const cfgFields: Record<keyof SettingsInput, HTMLInputElement> = {
    runner: $("cfg-runner"),
    bib: $("cfg-bib"),
    block: $("cfg-block"),
    start: $("cfg-start"),
    target: $("cfg-target"),
  };
  const points = [...splitKmSel.options].map((o) => ({ km: Number(o.value), name: o.textContent ?? "" }));

  let state: LiveState = emptyState();
  let role: Role | null = null;
  let busy = false;
  let cfgDirty = false;
  // Coming back from the mail link: the token is in the hash until supabase-js has read it.
  const fromLink = /access_token=|type=magiclink/.test(location.hash);

  function show(focus = false) {
    root.hidden = false;
    if (focus) root.scrollIntoView({ block: "start" });
  }

  // ---------- sign-in ----------

  const siteKey = import.meta.env.PUBLIC_TURNSTILE_SITE_KEY as string | undefined;
  let captchaId: string | null = null;
  let captchaToken: string | undefined;

  function mountCaptcha() {
    if (!siteKey || captchaId) return;
    loadTurnstile()
      .then((ts) => {
        if (captchaId) return;
        captchaId = ts.render(captchaBox, {
          sitekey: siteKey,
          language: "de",
          theme: "auto",
          appearance: "interaction-only",
          callback: (token: string) => (captchaToken = token),
          "expired-callback": () => (captchaToken = undefined),
          "error-callback": (code: string) => {
            captchaToken = undefined;
            fieldErr(mail, loginErr, `Die Prüfung gegen Bots hat nicht geklappt (Code ${code}). Lad die Seite neu und versuch es nochmal.`);
            return true;
          },
        });
      })
      .catch(() => fieldErr(mail, loginErr, "Die Prüfung gegen Bots lädt nicht. Prüf deine Verbindung."));
  }

  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (busy) return;
    if (captchaId && !captchaToken) {
      fieldErr(mail, loginErr, "Bestätig kurz unten, dass du kein Bot bist.");
      return;
    }
    busy = true;
    fieldErr(mail, loginErr, "");
    loginHint.hidden = true;
    const r = await sendMagicLink(db, mail.value, `${location.origin}${location.pathname}${HASH}`, captchaToken);
    busy = false;
    // A token is good for one sign-in only.
    if (captchaId && window.turnstile) window.turnstile.reset(captchaId);
    captchaToken = undefined;
    if (r.error) {
      fieldErr(mail, loginErr, r.error);
      mail.focus();
      return;
    }
    loginHint.textContent = "Wenn die Adresse freigeschaltet ist, kommt gleich eine Mail mit dem Link.";
    loginHint.hidden = false;
  });

  $("logout").addEventListener("click", async () => {
    await db.auth.signOut();
    // Pinboard and spots hold the signed-in user too, a fresh page is the clean way back to guest.
    location.reload();
  });

  async function onSession(session: Session | null) {
    const user = session?.user;
    if (!user || user.is_anonymous) {
      role = null;
      signedIn.hidden = true;
      loginForm.hidden = false;
      if (!root.hidden) mountCaptcha();
      return;
    }
    show(fromLink);
    loginForm.hidden = true;
    signedIn.hidden = false;
    role = await loadRole(db, slug);
    // Pinboard and spots show the same person.
    loadGuest(db).then((g) => g && guestStore(db).set(g));
    const email = user.email ?? "";
    who.textContent = role.admin
      ? `Angemeldet als ${email}, Admin.`
      : role.crew
        ? `Angemeldet als ${email}, Crew.`
        : `Angemeldet als ${email}. Diese Adresse darf bei diesem Rennen nichts ändern.`;
    const can = role.admin || role.crew;
    runBlock.hidden = !can;
    splitBlock.hidden = !can;
    cfgBlock.hidden = !role.admin;
    if (role.admin) refreshLiveTrack();
    render();
  }

  function openFromHash() {
    if (location.hash !== HASH) return;
    show();
    if (!loginForm.hidden) {
      mountCaptcha();
      mail.focus();
    }
  }
  window.addEventListener("hashchange", openFromHash);

  db.auth.getSession().then(({ data }) => {
    onSession(data.session);
    openFromHash();
  });
  // supabase-js warns against awaiting its own calls inside this callback, so the work runs a tick later.
  db.auth.onAuthStateChange((event, session) => {
    if (event === "SIGNED_IN" || event === "SIGNED_OUT" || event === "USER_UPDATED") setTimeout(() => onSession(session), 0);
  });

  // ---------- start, finish, reset ----------

  function setBusy(on: boolean) {
    busy = on;
    render();
  }

  async function run(start: string | null, finish: string | null, done: string) {
    if (busy) return;
    setBusy(true);
    const r = await setRaceTimes(db, slug, start, finish);
    setBusy(false);
    runHint.textContent = r.error ?? done;
  }

  goBtn.addEventListener("click", () => run(new Date().toISOString(), null, "Startzeit gesetzt. Viel Erfolg."));
  finBtn.addEventListener("click", () => run(state.race?.actual_start ?? null, new Date().toISOString(), "Im Ziel eingetragen."));
  let armTimer = 0;
  resetBtn.addEventListener("click", () => {
    if (resetBtn.dataset.armed) {
      delete resetBtn.dataset.armed;
      window.clearTimeout(armTimer);
      resetBtn.textContent = "Start und Ziel zurücksetzen";
      run(null, null, "Zurückgesetzt.");
      return;
    }
    resetBtn.dataset.armed = "1";
    resetBtn.textContent = "Wirklich zurücksetzen?";
    armTimer = window.setTimeout(() => {
      delete resetBtn.dataset.armed;
      resetBtn.textContent = "Start und Ziel zurücksetzen";
    }, ARM_MS);
  });

  // ---------- official splits ----------

  splitForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (busy) return;
    const checked = checkSplit(splitKmSel.value, splitTime.value);
    if ("error" in checked) {
      fieldErr(splitTime, splitErr, checked.error);
      splitTime.focus();
      return;
    }
    setBusy(true);
    const r = await setSplit(db, slug, checked.km, checked.netSec);
    setBusy(false);
    fieldErr(splitTime, splitErr, r.error ?? "");
    if (!r.error) splitTime.value = "";
  });

  function renderSplits() {
    const rows = officialSplits(state.checkpoints);
    if (!rows.length) {
      const li = document.createElement("li");
      li.className = "none";
      li.textContent = "Noch keine offiziellen Zeiten eingetragen.";
      cpList.replaceChildren(li);
      return;
    }
    cpList.replaceChildren(
      ...rows.map((c) => {
        const li = document.createElement("li");
        const name = document.createElement("span");
        name.textContent = points.find((p) => Math.abs(p.km - c.km) < MATCH_KM)?.name ?? `km ${c.km}`;
        const time = document.createElement("span");
        time.className = "mono";
        time.textContent = c.net_sec ? fmtDur(c.net_sec) : "·";
        const x = document.createElement("button");
        x.type = "button";
        x.className = "x";
        x.innerHTML = ICON_X; // fixed icon, no user input
        x.setAttribute("aria-label", `Zeit bei ${name.textContent} löschen`);
        x.title = "Löschen";
        x.disabled = busy;
        x.onclick = async () => {
          setBusy(true);
          const r = await deleteSplit(db, c.id);
          setBusy(false);
          fieldErr(splitTime, splitErr, r.error ?? "");
        };
        li.append(name, time, x);
        return li;
      }),
    );
  }

  // ---------- race settings, admin only ----------

  function fillCfg() {
    if (cfgDirty) return;
    const r = state.race;
    cfgFields.runner.value = r?.runner_name || "Dima";
    cfgFields.bib.value = r?.bib ?? defaults.bib;
    cfgFields.block.value = r?.start_block ?? defaults.block;
    cfgFields.start.value = isoToLocal(r?.planned_start ?? defaults.plannedStart, tz);
    cfgFields.target.value = fmtDur(r?.target_sec || defaults.targetSec);
  }

  cfgForm.addEventListener("input", () => (cfgDirty = true));
  cfgForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (busy) return;
    const input = Object.fromEntries(Object.entries(cfgFields).map(([k, el]) => [k, el.value])) as unknown as SettingsInput;
    const checked = checkSettings(input, tz);
    const errors = "errors" in checked ? checked.errors : {};
    for (const [k, el] of Object.entries(cfgFields)) fieldErr(el, $(`${el.id}-err`), errors[k as keyof SettingsInput] ?? "");
    cfgHint.textContent = "";
    if ("errors" in checked) {
      const first = Object.keys(checked.errors)[0] as keyof SettingsInput;
      cfgFields[first].focus();
      return;
    }
    setBusy(true);
    const r = await saveSettings(db, slug, checked.row);
    setBusy(false);
    if (r.error) {
      cfgHint.textContent = r.error;
      return;
    }
    cfgDirty = false;
    cfgHint.textContent = "Gespeichert.";
  });

  async function refreshLiveTrack() {
    const s = await liveTrackStatus(db, slug);
    ltStatus.textContent = !s
      ? "Ob ein Link hinterlegt ist, lässt sich gerade nicht abrufen."
      : s.isSet && s.at
        ? `Link hinterlegt seit ${fmtDay(s.at, tz)}, ${fmtClock(s.at, tz)} Uhr. Er wird nirgends angezeigt.`
        : "Noch kein Link hinterlegt.";
  }

  ltForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (busy) return;
    const checked = checkLiveTrack(ltUrl.value);
    if ("error" in checked) {
      fieldErr(ltUrl, ltErr, checked.error);
      ltUrl.focus();
      return;
    }
    setBusy(true);
    const r = await setLiveTrack(db, slug, checked.url);
    setBusy(false);
    fieldErr(ltUrl, ltErr, r.error ?? "");
    if (r.error) return;
    // The link never stays on screen.
    ltUrl.value = "";
    refreshLiveTrack();
  });

  // ---------- state ----------

  function render() {
    const race = state.race;
    // set_race_times writes both values: without the loaded row "Im Ziel" would clear the start.
    goBtn.disabled = busy || !race;
    finBtn.disabled = busy || !race?.actual_start || !!race.finished_at;
    resetBtn.disabled = busy || !race || (!race.actual_start && !race.finished_at);
    for (const b of root.querySelectorAll<HTMLButtonElement>("form button[type=submit]")) b.disabled = busy;
    renderSplits();
    if (role?.admin) fillCfg();
  }

  watchRace(db, slug, (s) => {
    state = s;
    render();
  });
  render();
}
