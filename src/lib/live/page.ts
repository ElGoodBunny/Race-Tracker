// What the parts of one page share (docs/tasks/025-claude-spots.md): one Realtime connection per race and one guest.
// Pinboard, spots and the 3D view each watch the same state instead of opening their own channel.
import type { SupabaseClient } from "@supabase/supabase-js";
import { loadGuest, type Guest } from "./guest";
import { subscribeRace, type LiveState } from "./supabase";

interface Watch {
  state: LiveState | null;
  listeners: Set<(s: LiveState) => void>;
  stop: () => void;
}
const watches = new WeakMap<SupabaseClient, Map<string, Watch>>();

/**
 * Follows a race like subscribeRace, but all watchers on the page share one channel.
 * A watcher that comes later gets the last state at once. The channel closes with the last watcher.
 * Returns the function that stops this watcher.
 */
export function watchRace(client: SupabaseClient, slug: string, cb: (s: LiveState) => void): () => void {
  const byRace = watches.get(client) ?? new Map<string, Watch>();
  watches.set(client, byRace);
  const listener = (s: LiveState) => cb(s);
  const known = byRace.get(slug);
  if (known) {
    known.listeners.add(listener);
    if (known.state) cb(known.state);
  }
  const watch: Watch = known ?? { state: null, listeners: new Set([listener]), stop: () => {} };
  if (!known) {
    byRace.set(slug, watch);
    watch.stop = subscribeRace(client, slug, (s) => {
      watch.state = s;
      for (const l of [...watch.listeners]) l(s);
    });
  }
  return () => {
    if (!watch.listeners.delete(listener) || watch.listeners.size) return;
    watch.stop();
    byRace.delete(slug);
  };
}

export interface GuestStore {
  get(): Guest | null;
  /** The guest of an existing session, loaded once per page. Never signs in. */
  load(): Promise<Guest | null>;
  /** After a sign-in or a saved name. */
  set(g: Guest): void;
  on(cb: (g: Guest | null) => void): () => void;
}
const guests = new WeakMap<SupabaseClient, GuestStore>();

/** The guest of the page, the same for pinboard and spots: whoever signs in at one is signed in at the other. */
export function guestStore(client: SupabaseClient): GuestStore {
  const known = guests.get(client);
  if (known) return known;
  let guest: Guest | null = null;
  let touched = false;
  let loading: Promise<Guest | null> | null = null;
  const listeners = new Set<(g: Guest | null) => void>();
  const store: GuestStore = {
    get: () => guest,
    load() {
      loading ??= loadGuest(client).then((g) => {
        // A sign-in while loading wins over the session read before it.
        if (touched) return guest;
        guest = g;
        for (const l of [...listeners]) l(guest);
        return guest;
      });
      return loading;
    },
    set(g) {
      touched = true;
      guest = g;
      for (const l of [...listeners]) l(guest);
    },
    on(cb) {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
  };
  guests.set(client, store);
  return store;
}
