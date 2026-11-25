// Browser side of the pinboard (docs/tasks/024-claude-pinnwand-gast.md). Everything users write goes out via textContent.
import { getSupabase } from "../lib/supabase";
import { subscribeRace, emptyState, type LiveState } from "../lib/live/supabase";
import { QUICK, becomeGuest, checkBody, checkName, deleteMessage, feed, loadGuest, postMessage, type Guest } from "../lib/live/guest";
import { fmtClock, fmtDay } from "../lib/format";

const ICON_X = '<svg class="ico" viewBox="0 0 256 256" fill="currentColor" aria-hidden="true"><path d="M205.66,194.34a8,8,0,0,1-11.32,11.32L128,139.31,61.66,205.66a8,8,0,0,1-11.32-11.32L116.69,128,50.34,61.66A8,8,0,0,1,61.66,50.34L128,116.69l66.34-66.35a8,8,0,0,1,11.32,11.32L139.31,128Z"></path></svg>';
const TURNSTILE_SRC = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";

interface Turnstile {
  render(el: HTMLElement, opts: Record<string, unknown>): string;
  reset(id: string): void;
}
declare global {
  interface Window {
    turnstile?: Turnstile;
  }
}

/** The Turnstile script comes from Cloudflare and is loaded only when someone writes for the first time (docs/decisions/2026-11-25-turnstile.md). */
let turnstileLoad: Promise<Turnstile> | null = null;
function loadTurnstile(): Promise<Turnstile> {
  turnstileLoad ??= new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = TURNSTILE_SRC;
    s.async = true;
    s.onload = () => (window.turnstile ? resolve(window.turnstile) : reject(new Error("turnstile missing")));
    s.onerror = () => {
      turnstileLoad = null;
      reject(new Error("turnstile failed"));
    };
    document.head.append(s);
  });
  return turnstileLoad;
}

export function startPinboard(root: HTMLElement): void {
  const slug = root.dataset.slug!;
  const tz = root.dataset.tz || "Europe/Berlin";
  const $ = <T extends HTMLElement>(id: string) => root.querySelector<T>(`#${id}`)!;
  const board = $("board");
  const msgForm = $<HTMLFormElement>("msg-form");
  const msgText = $<HTMLInputElement>("msg-text");
  const msgErr = $("msg-err");
  const quick = $("quick");
  const nameForm = $<HTMLFormElement>("name-form");
  const nameInput = $<HTMLInputElement>("guest-name");
  const nameErr = $("name-err");
  const captchaBox = $("captcha");
  const hint = $("board-hint");

  const client = getSupabase();
  if (!client) {
    empty("Die Pinnwand ist gerade nicht erreichbar.");
    return;
  }
  const db = client;
  const siteKey = import.meta.env.PUBLIC_TURNSTILE_SITE_KEY as string | undefined;

  let state: LiveState = emptyState();
  let guest: Guest | null = null;
  let pending: string | null = null;
  let captchaId: string | null = null;
  let captchaToken: string | undefined;
  let busy = false;

  function empty(text: string) {
    const p = document.createElement("p");
    p.className = "empty body-5";
    p.textContent = text;
    board.replaceChildren(p);
  }

  function fieldErr(input: HTMLInputElement, box: HTMLElement, text: string) {
    box.textContent = text;
    box.hidden = !text;
    input.setAttribute("aria-invalid", text ? "true" : "false");
  }

  function render() {
    const items = feed(state, guest?.id ?? null);
    if (state.status === "loading" && !items.length) return empty("Pinnwand lädt.");
    if (!items.length) return empty("Noch ruhig hier. Schreib Dima was Motivierendes.");
    board.replaceChildren(
      ...items.map((m) => {
        const d = document.createElement("div");
        d.className = `msg body-5${m.kind === "seen" ? " seen" : ""}`;
        const h = document.createElement("div");
        h.className = "h";
        const b = document.createElement("b");
        b.textContent = m.mine ? "Du" : m.name;
        const sp = document.createElement("span");
        sp.className = "caption-5";
        sp.textContent = `${fmtDay(m.at, tz)} ${fmtClock(m.at, tz)}`;
        h.append(b, sp);
        if (m.mine && m.kind === "msg") {
          const x = document.createElement("button");
          x.type = "button";
          x.className = "x";
          x.innerHTML = ICON_X; // fixed icon, no user input
          x.setAttribute("aria-label", "Nachricht löschen");
          x.title = "Nachricht löschen";
          x.onclick = async () => {
            const r = await deleteMessage(db, m.id);
            fieldErr(msgText, msgErr, r.error ?? "");
          };
          h.append(x);
        }
        const t = document.createElement("div");
        t.className = "t";
        t.textContent = m.text;
        d.append(h, t);
        return d;
      }),
    );
    hint.hidden = state.status !== "offline";
    hint.textContent = "Keine Verbindung. Neue Nachrichten erscheinen, sobald du wieder Netz hast.";
  }

  function setBusy(on: boolean) {
    busy = on;
    root.querySelectorAll<HTMLButtonElement>("form button, #quick button").forEach((b) => (b.disabled = on));
  }

  async function send(raw: string) {
    if (busy) return;
    const body = checkBody(raw);
    if (!body) return;
    fieldErr(msgText, msgErr, "");
    if (!guest?.name) {
      pending = body;
      openNameForm();
      return;
    }
    setBusy(true);
    const r = await postMessage(db, slug, body);
    setBusy(false);
    if (r.error) return fieldErr(msgText, msgErr, r.error);
    if (msgText.value.trim() === body || checkBody(msgText.value) === body) msgText.value = "";
  }

  function openNameForm() {
    nameForm.hidden = false;
    nameInput.focus();
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
          // The code says why (https://developers.cloudflare.com/turnstile/troubleshooting/client-side-errors/error-codes/).
          "error-callback": (code: string) => {
            captchaToken = undefined;
            fieldErr(nameInput, nameErr, `Die Prüfung gegen Bots hat nicht geklappt (Code ${code}). Lad die Seite neu und versuch es nochmal.`);
            return true;
          },
        });
      })
      .catch(() => fieldErr(nameInput, nameErr, "Die Prüfung gegen Bots lädt nicht. Prüf deine Verbindung."));
  }

  function closeNameForm() {
    nameForm.hidden = true;
    pending = null;
    fieldErr(nameInput, nameErr, "");
  }

  msgForm.addEventListener("submit", (e) => {
    e.preventDefault();
    send(msgText.value);
  });

  for (const q of QUICK) {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "btn small button-sm";
    b.textContent = q;
    b.onclick = () => send(q);
    quick.append(b);
  }

  nameForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (busy) return;
    const checked = checkName(nameInput.value);
    if ("error" in checked) {
      fieldErr(nameInput, nameErr, checked.error);
      nameInput.focus();
      return;
    }
    // Only a new sign-in needs the token, a guest who just lacks the name already has a session.
    if (!guest && captchaId && !captchaToken) {
      fieldErr(nameInput, nameErr, "Bestätig kurz unten, dass du kein Bot bist.");
      return;
    }
    fieldErr(nameInput, nameErr, "");
    setBusy(true);
    const r = await becomeGuest(db, checked.name, captchaToken);
    setBusy(false);
    if ("error" in r) {
      // A token is good for one sign-in only.
      if (captchaId && window.turnstile) window.turnstile.reset(captchaId);
      captchaToken = undefined;
      fieldErr(nameInput, nameErr, r.error);
      return;
    }
    guest = r.guest;
    const body = pending;
    closeNameForm();
    render();
    if (body) await send(body);
  });

  $("name-cancel").addEventListener("click", closeNameForm);

  msgForm.hidden = false;
  quick.hidden = false;
  loadGuest(db)
    .then((g) => {
      guest = g;
      if (g?.name) nameInput.value = g.name;
      render();
    })
    .catch(() => {});
  subscribeRace(db, slug, (s) => {
    state = s;
    render();
  });
}
