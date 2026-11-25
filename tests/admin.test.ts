// Settings and split entry (docs/tasks/032-claude-einstellungen.md): form checks, race time zone, split km,
// roles, writes and the magic link. Fake Supabase client, the rights themselves are covered in tests/rls.test.ts.
import { describe, expect, it } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  checkLiveTrack,
  checkSettings,
  checkSplit,
  deleteSplit,
  isoToLocal,
  liveTrackStatus,
  localToIso,
  loadRole,
  officialSplits,
  saveSettings,
  sendMagicLink,
  setLiveTrack,
  setRaceTimes,
  setSplit,
  splitKm,
} from "../src/lib/live/admin";
import type { CheckpointRow } from "../src/lib/live/supabase";

const SLUG = "barcelona-2027";
type Row = Record<string, unknown>;
type Res = { data?: unknown; error?: Row | null };

/** Records every call. rpc answers come from `rpc` by function name, table writes from `write`. */
function fakeClient(opts: { rpc?: Record<string, Res>; write?: Res; otp?: Res } = {}) {
  const calls: { op: string; name: string; arg?: unknown; filter?: unknown }[] = [];
  const done = (r: Res | undefined) => Promise.resolve({ data: r?.data ?? null, error: r?.error ?? null });
  const client = {
    rpc(name: string, arg: unknown) {
      calls.push({ op: "rpc", name, arg });
      return done(opts.rpc?.[name]);
    },
    from(table: string) {
      return {
        update(row: Row) {
          return {
            eq(_c: string, v: string) {
              return {
                select() {
                  calls.push({ op: "update", name: table, arg: row, filter: v });
                  return done(opts.write);
                },
              };
            },
          };
        },
        delete() {
          return {
            eq(_c: string, id: string) {
              calls.push({ op: "delete", name: table, arg: id });
              return done(opts.write);
            },
          };
        },
      };
    },
    auth: {
      signInWithOtp(arg: unknown) {
        calls.push({ op: "otp", name: "signInWithOtp", arg });
        return done(opts.otp);
      },
    },
  };
  return { client: client as unknown as SupabaseClient, calls };
}

describe("race time zone", () => {
  it("reads a datetime-local value in the race time zone", () => {
    expect(localToIso("2027-03-14T08:30", "Europe/Madrid")).toBe("2027-03-14T07:30:00.000Z");
    expect(localToIso("2026-06-28T09:00", "Europe/Berlin")).toBe("2026-06-28T07:00:00.000Z");
  });
  it("writes it back the same way", () => {
    expect(isoToLocal("2027-03-14T07:30:00.000Z", "Europe/Madrid")).toBe("2027-03-14T08:30");
    expect(isoToLocal("2026-06-28T07:00:00+00:00", "Europe/Berlin")).toBe("2026-06-28T09:00");
  });
  it("rejects what is not a date", () => {
    expect(localToIso("", "Europe/Madrid")).toBeNull();
    expect(localToIso("morgen früh", "Europe/Madrid")).toBeNull();
  });
});

describe("checkSettings", () => {
  const ok = { runner: " Dima ", bib: " 1234 ", block: "", start: "2027-03-14T08:30", target: "3:15:00" };
  it("builds the races row, empty bib and block become null", () => {
    expect(checkSettings(ok, "Europe/Madrid")).toEqual({
      row: { runner_name: "Dima", bib: "1234", start_block: null, planned_start: "2027-03-14T07:30:00.000Z", target_sec: 11700 },
    });
  });
  it("puts each error at its field, with the limits of the database", () => {
    const r = checkSettings({ runner: "", bib: "x".repeat(13), block: "y".repeat(13), start: "", target: "12:00:00" }, "Europe/Madrid");
    expect(r).toEqual({
      errors: {
        runner: "Gib einen Namen ein.",
        bib: "Höchstens 12 Zeichen.",
        block: "Höchstens 12 Zeichen.",
        start: "Gib die geplante Startzeit ein.",
        target: "Zielzeit als h:mm:ss, zwischen 0:10:00 und 10:00:00.",
      },
    });
  });
  it("accepts a marathon target the legacy page refused", () => {
    expect("row" in checkSettings({ ...ok, target: "4:30:00" }, "Europe/Madrid")).toBe(true);
  });
});

describe("checkLiveTrack", () => {
  it("accepts a link from livetrack.garmin.com", () => {
    expect(checkLiveTrack(" https://livetrack.garmin.com/session/abc/token/XYZ ")).toEqual({ url: "https://livetrack.garmin.com/session/abc/token/XYZ" });
  });
  it("refuses other hosts before the database does", () => {
    const error = "Nur Links von livetrack.garmin.com.";
    expect(checkLiveTrack("http://livetrack.garmin.com/session/a")).toEqual({ error });
    expect(checkLiveTrack("https://livetrack.garmin.com.evil.example/x")).toEqual({ error });
    expect(checkLiveTrack("https://user@livetrack.garmin.com/x")).toEqual({ error });
    expect(checkLiveTrack("")).toEqual({ error: "Füg den Link aus der Garmin-Mail ein." });
  });
});

describe("split entry", () => {
  it("cuts the km to three places so the finish stays inside the race", () => {
    expect(splitKm(21.0975)).toBe(21.097);
    expect(splitKm(42.195)).toBe(42.195);
    expect(splitKm(10)).toBe(10);
  });
  it("takes mm:ss or h:mm:ss", () => {
    expect(checkSplit("10", "52:30")).toEqual({ km: 10, netSec: 3150 });
    expect(checkSplit("21.0975", "1:41:07")).toEqual({ km: 21.097, netSec: 6067 });
    expect(checkSplit("10", "52")).toEqual({ error: "Zeit als mm:ss oder h:mm:ss." });
    expect(checkSplit("", "52:30")).toEqual({ error: "Wähl einen Punkt." });
  });
  it("lists official splits by km, sightings stay out", () => {
    const cp = (id: string, km: number, src: "official" | "seen"): CheckpointRow =>
      ({ id, race_slug: SLUG, km, src, net_sec: src === "official" ? 60 * km * 5 : null, seen_at: null, created_by: "u", created_at: "", author_name: "" }) as CheckpointRow;
    expect(officialSplits([cp("b", 10, "official"), cp("s", 7, "seen"), cp("a", 5, "official")]).map((c) => c.id)).toEqual(["a", "b"]);
  });
});

describe("loadRole", () => {
  it("asks both functions, signed in only", async () => {
    const { client, calls } = fakeClient({ rpc: { is_admin: { data: false }, is_crew: { data: true } } });
    expect(await loadRole(client, SLUG)).toEqual({ admin: false, crew: true });
    expect(calls.map((c) => [c.name, c.arg])).toEqual([["is_admin", undefined], ["is_crew", { slug: SLUG }]]);
  });
  it("counts an error as no role", async () => {
    const { client } = fakeClient({ rpc: { is_admin: { error: { code: "42501", message: "permission denied" } } } });
    expect(await loadRole(client, SLUG)).toEqual({ admin: false, crew: false });
  });
});

describe("writes", () => {
  it("updates the race row and treats zero rows as read only", async () => {
    const row = { runner_name: "Dima", bib: null, start_block: null, planned_start: "2027-03-14T07:30:00.000Z", target_sec: 11700 };
    const ok = fakeClient({ write: { data: [{ slug: SLUG }] } });
    expect(await saveSettings(ok.client, SLUG, row)).toEqual({});
    expect(ok.calls[0]).toEqual({ op: "update", name: "races", arg: row, filter: SLUG });
    const none = fakeClient({ write: { data: [] } });
    expect(await saveSettings(none.client, SLUG, row)).toEqual({ error: "Du hast hier nur Leserechte." });
  });
  it("sets start and finish together", async () => {
    const { client, calls } = fakeClient();
    expect(await setRaceTimes(client, SLUG, "2027-03-14T07:31:00.000Z", null)).toEqual({});
    expect(calls[0]).toEqual({ op: "rpc", name: "set_race_times", arg: { slug: SLUG, start_at: "2027-03-14T07:31:00.000Z", finish_at: null } });
  });
  it("sets and deletes official splits", async () => {
    const { client, calls } = fakeClient();
    expect(await setSplit(client, SLUG, 21.097, 6067)).toEqual({});
    expect(await deleteSplit(client, "id-1")).toEqual({});
    expect(calls).toEqual([
      { op: "rpc", name: "set_official_split", arg: { slug: SLUG, split_km: 21.097, split_net_sec: 6067 } },
      { op: "delete", name: "checkpoints", arg: "id-1" },
    ]);
  });
  it("passes refusals on as text", async () => {
    const { client } = fakeClient({ rpc: { set_livetrack_link: { error: { code: "22023", message: "livetrack link not allowed" } } } });
    expect(await setLiveTrack(client, SLUG, "https://livetrack.garmin.com/x")).toEqual({ error: "Nur Links von livetrack.garmin.com." });
  });
  it("reads only whether a link is set", async () => {
    const { client } = fakeClient({ rpc: { livetrack_link_status: { data: [{ is_set: true, updated_at: "2027-03-13T18:00:00+00:00" }] } } });
    expect(await liveTrackStatus(client, SLUG)).toEqual({ isSet: true, at: Date.parse("2027-03-13T18:00:00Z") });
    const empty = fakeClient({ rpc: { livetrack_link_status: { data: [{ is_set: false, updated_at: null }] } } });
    expect(await liveTrackStatus(empty.client, SLUG)).toEqual({ isSet: false, at: null });
  });
});

describe("sendMagicLink", () => {
  it("never creates an account and comes back to this page", async () => {
    const { client, calls } = fakeClient();
    expect(await sendMagicLink(client, " dima@example.com ", "https://example.com/barcelona-2027#einstellungen")).toEqual({});
    expect(calls[0].arg).toEqual({ email: "dima@example.com", options: { shouldCreateUser: false, emailRedirectTo: "https://example.com/barcelona-2027#einstellungen" } });
  });
  it("says the same for unknown addresses", async () => {
    const { client } = fakeClient({ otp: { error: { code: "otp_disabled", message: "Signups not allowed for otp" } } });
    expect(await sendMagicLink(client, "fremd@example.com", "https://example.com/")).toEqual({});
  });
  it("checks the address at the field", async () => {
    const { client, calls } = fakeClient();
    expect(await sendMagicLink(client, "dima", "https://example.com/")).toEqual({ error: "Gib eine E-Mail-Adresse ein." });
    expect(calls).toEqual([]);
  });
});
