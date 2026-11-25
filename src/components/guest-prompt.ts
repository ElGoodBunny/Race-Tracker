// Browser side of GuestPrompt.astro: asks for the name on the first write and signs in anonymously with Turnstile
// (docs/tasks/024-claude-pinnwand-gast.md). Pinboard and spots each have one, the guest is shared through guestStore.
import type { SupabaseClient } from "@supabase/supabase-js";
import { becomeGuest, checkName, type Guest } from "../lib/live/guest";
import { guestStore } from "../lib/live/page";

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
export function loadTurnstile(): Promise<Turnstile> {
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

/** Shows an error under a field and marks it, or clears both. */
export function fieldErr(input: HTMLInputElement, box: HTMLElement, text: string) {
  box.textContent = text;
  box.hidden = !text;
  input.setAttribute("aria-invalid", text ? "true" : "false");
}

export interface GuestPrompt {
  /** Opens the form. `then` runs once the guest has a name. */
  open(then: (g: Guest) => void): void;
  close(): void;
}

/**
 * Wires one GuestPrompt.astro form. `setBusy` locks the buttons of the section while the sign-in runs.
 * The token is asked for only on a new sign-in: a guest who has a session but no name gets no second account.
 */
export function guestPrompt(form: HTMLFormElement, db: SupabaseClient, setBusy: (on: boolean) => void): GuestPrompt {
  const input = form.querySelector<HTMLInputElement>(".guest-name")!;
  const err = form.querySelector<HTMLElement>(".name-err")!;
  const captchaBox = form.querySelector<HTMLElement>(".captcha")!;
  const store = guestStore(db);
  const siteKey = import.meta.env.PUBLIC_TURNSTILE_SITE_KEY as string | undefined;
  let captchaId: string | null = null;
  let captchaToken: string | undefined;
  let next: ((g: Guest) => void) | null = null;
  let busy = false;

  store.on((g) => {
    if (g?.name && !input.value) input.value = g.name;
  });

  function close() {
    form.hidden = true;
    next = null;
    fieldErr(input, err, "");
  }

  function open(then: (g: Guest) => void) {
    next = then;
    form.hidden = false;
    const name = store.get()?.name;
    if (name && !input.value) input.value = name;
    input.focus();
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
            fieldErr(input, err, `Die Prüfung gegen Bots hat nicht geklappt (Code ${code}). Lad die Seite neu und versuch es nochmal.`);
            return true;
          },
        });
      })
      .catch(() => fieldErr(input, err, "Die Prüfung gegen Bots lädt nicht. Prüf deine Verbindung."));
  }

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (busy) return;
    const checked = checkName(input.value);
    if ("error" in checked) {
      fieldErr(input, err, checked.error);
      input.focus();
      return;
    }
    if (!store.get() && captchaId && !captchaToken) {
      fieldErr(input, err, "Bestätig kurz unten, dass du kein Bot bist.");
      return;
    }
    fieldErr(input, err, "");
    busy = true;
    setBusy(true);
    const r = await becomeGuest(db, checked.name, captchaToken);
    busy = false;
    setBusy(false);
    if ("error" in r) {
      // A token is good for one sign-in only.
      if (captchaId && window.turnstile) window.turnstile.reset(captchaId);
      captchaToken = undefined;
      fieldErr(input, err, r.error);
      return;
    }
    const then = next;
    store.set(r.guest);
    close();
    then?.(r.guest);
  });

  form.querySelector(".name-cancel")!.addEventListener("click", close);
  return { open, close };
}
