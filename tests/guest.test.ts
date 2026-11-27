// Guest onboarding and pinboard writes (docs/tasks/024-claude-pinnwand-gast.md), against a fake Supabase client.
import { describe, expect, it } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { becomeGuest, checkBody, checkName, deleteMessage, feed, loadGuest, postMessage } from "../src/lib/live/guest";
import { emptyState, type CheckpointRow, type MessageRow } from "../src/lib/live/supabase";

const SLUG = "barcelona-2027";
type Row = Record<string, unknown>;

/** Session, profile table and write calls, just enough of supabase-js for the guest module. */
function fakeClient(opts: { session?: string | null; profiles?: Record<string, string>; signInError?: Row; writeError?: Row } = {}) {
  let session: string | null = opts.session ?? null;
  const profiles = { ...(opts.profiles ?? {}) };
  const calls: { op: string; table?: string; row?: unknown; arg?: unknown }[] = [];
  const result = (data: unknown = null) => Promise.resolve({ data, error: opts.writeError ?? null });
  const client = {
    auth: {
      async getSession() {
        calls.push({ op: "getSession" });
        return { data: { session: session ? { user: { id: session } } : null }, error: null };
      },
      async signInAnonymously(arg?: unknown) {
        calls.push({ op: "signInAnonymously", arg });
        if (opts.signInError) return { data: { session: null, user: null }, error: opts.signInError };
        session = "new-user";
        return { data: { session: { user: { id: session } }, user: { id: session } }, error: null };
      },
    },
    from(table: string) {
      return {
        select() {
          return {
            eq(_c: string, id: string) {
              return {
                async maybeSingle() {
                  calls.push({ op: "select", table, arg: id });
                  return { data: id in profiles ? { display_name: profiles[id] } : null, error: null };
                },
              };
            },
          };
        },
        upsert(row: Row) {
          calls.push({ op: "upsert", table, row });
          if (!opts.writeError) profiles[row.id as string] = row.display_name as string;
          return result();
        },
        insert(row: Row) {
          calls.push({ op: "insert", table, row });
          return result();
        },
        delete() {
          return {
            eq(_c: string, id: string) {
              calls.push({ op: "delete", table, arg: id });
              return result();
            },
          };
        },
      };
    },
  };
  return { client: client as unknown as SupabaseClient, calls, profiles };
}

describe("checkName", () => {
  it("trimmt und nimmt 1 bis 30 Zeichen wie der Check in der Datenbank", () => {
    expect(checkName("  Anna  ")).toEqual({ name: "Anna" });
    expect(checkName("x".repeat(30))).toEqual({ name: "x".repeat(30) });
  });
  it("leer oder zu lang ergibt einen Text fürs Feld", () => {
    expect(checkName("   ")).toEqual({ error: "Gib deinen Namen ein." });
    expect(checkName("x".repeat(31))).toEqual({ error: "Höchstens 30 Zeichen." });
  });
});

describe("checkBody", () => {
  it("trimmt, leer heißt nichts senden, über 200 Zeichen wird gekürzt wie im Legacy", () => {
    expect(checkBody("  Lauf!  ")).toBe("Lauf!");
    expect(checkBody("   ")).toBeNull();
    expect(checkBody("x".repeat(250))).toBe("x".repeat(200));
  });
});

describe("loadGuest", () => {
  it("meldet beim Lesen niemanden an", async () => {
    const { client, calls } = fakeClient();
    expect(await loadGuest(client)).toBeNull();
    expect(calls.some((c) => c.op === "signInAnonymously")).toBe(false);
  });
  it("angemeldet mit Profil: id und Name", async () => {
    const { client } = fakeClient({ session: "u1", profiles: { u1: "Anna" } });
    expect(await loadGuest(client)).toEqual({ id: "u1", name: "Anna" });
  });
  it("angemeldet ohne Profil (Abbruch zwischen Anmelden und Name): Name fehlt noch", async () => {
    const { client } = fakeClient({ session: "u1" });
    expect(await loadGuest(client)).toEqual({ id: "u1", name: null });
  });
});

describe("becomeGuest", () => {
  it("meldet erst beim ersten Schreiben anonym an, mit CAPTCHA-Token, und legt das Profil an", async () => {
    const { client, calls, profiles } = fakeClient();
    expect(await becomeGuest(client, "Anna", "tok")).toEqual({ guest: { id: "new-user", name: "Anna" } });
    expect(calls.find((c) => c.op === "signInAnonymously")?.arg).toEqual({ options: { captchaToken: "tok" } });
    expect(profiles["new-user"]).toBe("Anna");
  });
  it("bestehende Sitzung wird weiterverwendet, kein zweites Konto", async () => {
    const { client, calls } = fakeClient({ session: "u1" });
    expect(await becomeGuest(client, "Anna")).toEqual({ guest: { id: "u1", name: "Anna" } });
    expect(calls.some((c) => c.op === "signInAnonymously")).toBe(false);
    expect(calls.find((c) => c.op === "upsert")?.row).toEqual({ id: "u1", display_name: "Anna" });
  });
  it("Fehler beim Anmelden landet als Text, ohne Profil", async () => {
    const { client, calls } = fakeClient({ signInError: { code: "captcha_failed", message: "captcha protection: request disallowed" } });
    expect(await becomeGuest(client, "Anna")).toEqual({ error: "Die Prüfung gegen Bots hat nicht geklappt. Bitte nochmal versuchen." });
    expect(calls.some((c) => c.op === "upsert")).toBe(false);
  });
});

describe("Schreiben", () => {
  it("Nachricht geht nur mit race_slug und body raus, Autor setzt die Datenbank", async () => {
    const { client, calls } = fakeClient({ session: "u1" });
    expect(await postMessage(client, SLUG, "Lauf!")).toEqual({});
    expect(calls.find((c) => c.op === "insert")).toEqual({ op: "insert", table: "messages", row: { race_slug: SLUG, body: "Lauf!" } });
  });
  it("Rate Limit und fehlende Rechte ergeben die bekannten Texte", async () => {
    const rate = fakeClient({ session: "u1", writeError: { code: "P0001", message: "rate limit exceeded" } });
    expect(await postMessage(rate.client, SLUG, "x")).toEqual({ error: "Zu viele Aktionen auf einmal. Kurz warten." });
    const rls = fakeClient({ session: "u1", writeError: { code: "42501", message: "new row violates row-level security policy" } });
    expect(await deleteMessage(rls.client, "m1")).toEqual({ error: "Du hast hier nur Leserechte." });
  });
  it("Löschen nach id", async () => {
    const { client, calls } = fakeClient({ session: "u1" });
    expect(await deleteMessage(client, "m1")).toEqual({});
    expect(calls.find((c) => c.op === "delete")).toEqual({ op: "delete", table: "messages", arg: "m1" });
  });
});

describe("feed", () => {
  const msg = (id: string, at: string, by: string | null = "u1"): MessageRow => ({ id, race_slug: SLUG, body: `Hallo ${id}`, km: null, author_name: "Anna", created_by: by, created_at: at });
  const seen = (id: string, at: string, km: number): CheckpointRow => ({ id, race_slug: SLUG, km, src: "seen", net_sec: null, seen_at: at, author_name: "Ben", created_by: "u2", created_at: at });
  const official: CheckpointRow = { id: "o1", race_slug: SLUG, km: 10, src: "official", net_sec: 3000, seen_at: null, author_name: "Dima", created_by: "u0", created_at: "2027-03-14T09:00:00Z" };

  it("Nachrichten und Sichtungen, neueste zuerst, offizielle Splits nicht", () => {
    const state = { ...emptyState(), messages: [msg("m2", "2027-03-14T09:10:00Z"), msg("m1", "2027-03-14T09:00:00Z")], checkpoints: [seen("s1", "2027-03-14T09:05:00Z", 12.3), official] };
    const items = feed(state, "u1");
    expect(items.map((i) => i.id)).toEqual(["m2", "s1", "m1"]);
    expect(items[1]).toMatchObject({ kind: "seen", name: "Ben", text: "Gesehen bei km 12,3", mine: false });
    expect(items[0]).toMatchObject({ kind: "msg", name: "Anna", text: "Hallo m2", mine: true });
  });
  it("ohne Anmeldung ist nichts eigenes", () => {
    const state = { ...emptyState(), messages: [msg("m1", "2027-03-14T09:00:00Z")] };
    expect(feed(state, null)[0].mine).toBe(false);
  });
});
