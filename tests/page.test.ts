// One Realtime connection and one guest per page (docs/tasks/025-claude-spots.md), against a fake Supabase client.
import { describe, expect, it } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { guestStore, watchRace } from "../src/lib/live/page";
import type { LiveState } from "../src/lib/live/supabase";

const SLUG = "barcelona-2027";

/** Channel and loads, enough of supabase-js for subscribeRace. subscribe() reports SUBSCRIBED at once. */
function fakeClient(opts: { session?: string | null; profiles?: Record<string, string> } = {}) {
  const calls = { channel: 0, removeChannel: 0, getSession: 0 };
  const empty = { data: [], error: null };
  const query = () => {
    const q = {
      eq: () => q,
      order: () => q,
      limit: () => Promise.resolve(empty),
      maybeSingle: () => Promise.resolve({ data: null, error: null }),
      then: (ok: (v: unknown) => unknown) => Promise.resolve(empty).then(ok),
    };
    return q;
  };
  const client = {
    channel() {
      calls.channel++;
      const ch = { on: () => ch, subscribe: (cb: (s: string) => void) => (cb("SUBSCRIBED"), ch) };
      return ch;
    },
    removeChannel() {
      calls.removeChannel++;
    },
    from(table: string) {
      return {
        select: () =>
          table === "profiles"
            ? { eq: (_c: string, id: string) => ({ maybeSingle: async () => ({ data: opts.profiles?.[id] ? { display_name: opts.profiles[id] } : null, error: null }) }) }
            : query(),
      };
    },
    auth: {
      async getSession() {
        calls.getSession++;
        return { data: { session: opts.session ? { user: { id: opts.session } } : null }, error: null };
      },
    },
  };
  return { client: client as unknown as SupabaseClient, calls };
}

const flush = () => new Promise((r) => setTimeout(r, 0));

describe("watchRace", () => {
  it("opens one channel for all watchers of a race", async () => {
    const { client, calls } = fakeClient();
    const a: LiveState[] = [];
    const b: LiveState[] = [];
    watchRace(client, SLUG, (s) => a.push(s));
    watchRace(client, SLUG, (s) => b.push(s));
    await flush();
    expect(calls.channel).toBe(1);
    expect(a.at(-1)?.status).toBe("live");
    expect(b.at(-1)?.status).toBe("live");
  });

  it("gives a late watcher the current state at once", async () => {
    const { client } = fakeClient();
    watchRace(client, SLUG, () => {});
    await flush();
    const late: LiveState[] = [];
    watchRace(client, SLUG, (s) => late.push(s));
    expect(late).toHaveLength(1);
    expect(late[0].status).toBe("live");
  });

  it("closes the channel when the last watcher stops, and opens a new one after", async () => {
    const { client, calls } = fakeClient();
    const stopA = watchRace(client, SLUG, () => {});
    const stopB = watchRace(client, SLUG, () => {});
    stopA();
    expect(calls.removeChannel).toBe(0);
    stopB();
    stopB();
    expect(calls.removeChannel).toBe(1);
    watchRace(client, SLUG, () => {});
    expect(calls.channel).toBe(2);
  });

  it("keeps races and clients apart", () => {
    const one = fakeClient();
    const two = fakeClient();
    watchRace(one.client, SLUG, () => {});
    watchRace(one.client, "hamburg-2026", () => {});
    watchRace(two.client, SLUG, () => {});
    expect(one.calls.channel).toBe(2);
    expect(two.calls.channel).toBe(1);
  });
});

describe("guestStore", () => {
  it("loads the guest once for the whole page", async () => {
    const { client, calls } = fakeClient({ session: "u1", profiles: { u1: "Alex" } });
    const [a, b] = await Promise.all([guestStore(client).load(), guestStore(client).load()]);
    expect(a).toEqual({ id: "u1", name: "Alex" });
    expect(b).toBe(a);
    expect(calls.getSession).toBe(1);
    expect(guestStore(client).get()).toBe(a);
  });

  it("tells every listener about a new guest", async () => {
    const { client } = fakeClient();
    const seen: (string | null)[] = [];
    const store = guestStore(client);
    const stop = store.on((g) => seen.push(g?.name ?? null));
    store.set({ id: "u2", name: "Sina" });
    stop();
    store.set({ id: "u2", name: "Sina B." });
    expect(seen).toEqual(["Sina"]);
    expect(guestStore(client).get()).toEqual({ id: "u2", name: "Sina B." });
  });

  it("does not let a late load overwrite a guest set in the meantime", async () => {
    const { client } = fakeClient({ session: null });
    const store = guestStore(client);
    const loading = store.load();
    store.set({ id: "u3", name: "Kim" });
    await loading;
    expect(store.get()).toEqual({ id: "u3", name: "Kim" });
  });
});
