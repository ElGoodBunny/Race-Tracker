// Browser side of the pinboard (docs/tasks/024-claude-pinnwand-gast.md). Everything users write goes out via textContent.
import { getSupabase } from "../lib/supabase";
import { emptyState, type LiveState } from "../lib/live/supabase";
import { QUICK, checkBody, deleteMessage, feed, postMessage } from "../lib/live/guest";
import { deleteSighting } from "../lib/live/seen";
import { guestStore, watchRace } from "../lib/live/page";
import { fmtClock, fmtDay } from "../lib/format";
import { fieldErr, guestPrompt } from "./guest-prompt";

const ICON_X = '<svg class="ico" viewBox="0 0 256 256" fill="currentColor" aria-hidden="true"><path d="M205.66,194.34a8,8,0,0,1-11.32,11.32L128,139.31,61.66,205.66a8,8,0,0,1-11.32-11.32L116.69,128,50.34,61.66A8,8,0,0,1,61.66,50.34L128,116.69l66.34-66.35a8,8,0,0,1,11.32,11.32L139.31,128Z"></path></svg>';

export function startPinboard(root: HTMLElement): void {
  const slug = root.dataset.slug!;
  const tz = root.dataset.tz || "Europe/Berlin";
  const $ = <T extends HTMLElement>(id: string) => root.querySelector<T>(`#${id}`)!;
  const board = $("board");
  const msgForm = $<HTMLFormElement>("msg-form");
  const msgText = $<HTMLInputElement>("msg-text");
  const msgErr = $("msg-err");
  const quick = $("quick");
  const hint = $("board-hint");

  const client = getSupabase();
  if (!client) {
    empty("Die Pinnwand ist gerade nicht erreichbar.");
    return;
  }
  const db = client;
  const guests = guestStore(db);

  let state: LiveState = emptyState();
  let busy = false;

  function empty(text: string) {
    const p = document.createElement("p");
    p.className = "empty body-5";
    p.textContent = text;
    board.replaceChildren(p);
  }

  function render() {
    const items = feed(state, guests.get()?.id ?? null);
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
        if (m.mine) {
          const x = document.createElement("button");
          x.type = "button";
          x.className = "x";
          x.innerHTML = ICON_X; // fixed icon, no user input
          const label = m.kind === "seen" ? "Sichtung löschen" : "Nachricht löschen";
          x.setAttribute("aria-label", label);
          x.title = label;
          x.onclick = async () => {
            const r = await (m.kind === "seen" ? deleteSighting(db, m.id) : deleteMessage(db, m.id));
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

  const prompt = guestPrompt($<HTMLFormElement>("board-guest"), db, setBusy);

  function setBusy(on: boolean) {
    busy = on;
    root.querySelectorAll<HTMLButtonElement>("form button, #quick button").forEach((b) => (b.disabled = on));
  }

  async function send(raw: string) {
    if (busy) return;
    const body = checkBody(raw);
    if (!body) return;
    fieldErr(msgText, msgErr, "");
    if (!guests.get()?.name) {
      prompt.open(() => send(body));
      return;
    }
    setBusy(true);
    const r = await postMessage(db, slug, body);
    setBusy(false);
    if (r.error) return fieldErr(msgText, msgErr, r.error);
    if (msgText.value.trim() === body || checkBody(msgText.value) === body) msgText.value = "";
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

  msgForm.hidden = false;
  quick.hidden = false;
  guests.on(render);
  guests.load().catch(() => {});
  watchRace(db, slug, (s) => {
    state = s;
    render();
  });
}
