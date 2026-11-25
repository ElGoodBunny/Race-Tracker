// Settings and split entry for Dima and the crew (docs/tasks/032-claude-einstellungen.md), ported from the
// owner card in legacy/hamburg-2026.html. Roles here only decide what is shown. Security comes from RLS and the
// functions in supabase/migrations, which check admin or crew themselves.
import type { SupabaseClient } from "@supabase/supabase-js";
import { parseDur } from "../format";
import { errorText } from "./errors";
import type { CheckpointRow } from "./supabase";

type Result = { error?: string };
export interface Role {
  admin: boolean;
  crew: boolean;
}
export interface SettingsInput {
  runner: string;
  bib: string;
  block: string;
  /** datetime-local value in the race time zone. */
  start: string;
  target: string;
}
export interface SettingsRow {
  runner_name: string;
  bib: string | null;
  start_block: string | null;
  planned_start: string;
  target_sec: number;
}
export type SettingsErrors = Partial<Record<keyof SettingsInput, string>>;

/** Same limits as the checks on races. */
const RUNNER_MAX = 40;
const SHORT_MAX = 12;
const TARGET_MIN = 600;
const TARGET_MAX = 36000;
/** The poller fetches the link from the server, so it may only point here. Same list as in set_livetrack_link. */
const LIVETRACK_HOST = "livetrack.garmin.com";
const READ_ONLY = errorText({ code: "42501", message: "permission denied" });

/** Offset of a time zone at one instant, in ms (Madrid in winter: +3600000). */
function offsetMs(at: number, tz: string): number {
  const parts = new Intl.DateTimeFormat("en-US", { timeZone: tz, hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit" }).formatToParts(at);
  const n = (t: string) => Number(parts.find((p) => p.type === t)?.value);
  return Date.UTC(n("year"), n("month") - 1, n("day"), n("hour"), n("minute"), n("second")) - Math.floor(at / 1000) * 1000;
}

/** "2027-03-14T08:30" in the race time zone to an ISO string, null if it is not a date. */
export function localToIso(value: string, tz: string): string | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(value.trim());
  if (!m) return null;
  const wall = Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5]);
  if (Number.isNaN(wall)) return null;
  // The offset at the guess can differ from the one at the result around a clock change, so check once more.
  let at = wall - offsetMs(wall, tz);
  at = wall - offsetMs(at, tz);
  return new Date(at).toISOString();
}

/** ISO string to the datetime-local value in the race time zone. */
export function isoToLocal(iso: string, tz: string): string {
  const at = Date.parse(iso);
  return new Date(at + offsetMs(at, tz)).toISOString().slice(0, 16);
}

export function checkSettings(input: SettingsInput, tz: string): { row: SettingsRow } | { errors: SettingsErrors } {
  const errors: SettingsErrors = {};
  const runner = input.runner.trim();
  const bib = input.bib.trim();
  const block = input.block.trim();
  if (!runner) errors.runner = "Gib einen Namen ein.";
  else if (runner.length > RUNNER_MAX) errors.runner = `Höchstens ${RUNNER_MAX} Zeichen.`;
  if (bib.length > SHORT_MAX) errors.bib = `Höchstens ${SHORT_MAX} Zeichen.`;
  if (block.length > SHORT_MAX) errors.block = `Höchstens ${SHORT_MAX} Zeichen.`;
  const start = localToIso(input.start, tz);
  if (!start) errors.start = "Gib die geplante Startzeit ein.";
  const target = parseDur(input.target);
  if (!target || target < TARGET_MIN || target > TARGET_MAX) errors.target = "Zielzeit als h:mm:ss, zwischen 0:10:00 und 10:00:00.";
  if (Object.keys(errors).length || !start || !target) return { errors };
  return { row: { runner_name: runner, bib: bib || null, start_block: block || null, planned_start: start, target_sec: target } };
}

export function checkLiveTrack(raw: string): { url: string } | { error: string } {
  const url = raw.trim();
  if (!url) return { error: "Füg den Link aus der Garmin-Mail ein." };
  const authority = /^https:\/\/([^/?#]*)/.exec(url)?.[1];
  // Same rule as the function: no user info, no port, exactly the one host.
  if (!authority || authority.includes("@") || authority.includes(":") || authority.toLowerCase() !== LIVETRACK_HOST) {
    return { error: "Nur Links von livetrack.garmin.com." };
  }
  return { url };
}

/** numeric(6,3) would round 21.0975 up to 21.098, which lies behind the finish. */
export function splitKm(km: number): number {
  return Math.floor(km * 1000 + 1e-6) / 1000;
}

export function checkSplit(km: string, time: string): { km: number; netSec: number } | { error: string } {
  const k = Number(km);
  if (!km || !Number.isFinite(k) || k <= 0) return { error: "Wähl einen Punkt." };
  const netSec = parseDur(time);
  if (!netSec) return { error: "Zeit als mm:ss oder h:mm:ss." };
  return { km: splitKm(k), netSec };
}

export function officialSplits(checkpoints: CheckpointRow[]): CheckpointRow[] {
  return checkpoints.filter((c) => c.src === "official").sort((a, b) => a.km - b.km);
}

export async function loadRole(client: SupabaseClient, slug: string): Promise<Role> {
  const [admin, crew] = await Promise.all([client.rpc("is_admin"), client.rpc("is_crew", { slug })]);
  return { admin: !admin.error && admin.data === true, crew: !crew.error && crew.data === true };
}

/** A row that RLS filters out is no error, just zero rows. That counts as read only. */
export async function saveSettings(client: SupabaseClient, slug: string, row: SettingsRow): Promise<Result> {
  const { data, error } = await client.from("races").update(row).eq("slug", slug).select();
  if (error) return { error: errorText(error) };
  return Array.isArray(data) && data.length ? {} : { error: READ_ONLY };
}

/** Sets both values. Pass the one you keep, or it is cleared. */
export async function setRaceTimes(client: SupabaseClient, slug: string, startAt: string | null, finishAt: string | null): Promise<Result> {
  const { error } = await client.rpc("set_race_times", { slug, start_at: startAt, finish_at: finishAt });
  return error ? { error: errorText(error) } : {};
}

export async function setSplit(client: SupabaseClient, slug: string, km: number, netSec: number): Promise<Result> {
  const { error } = await client.rpc("set_official_split", { slug, split_km: km, split_net_sec: netSec });
  return error ? { error: errorText(error) } : {};
}

export async function deleteSplit(client: SupabaseClient, id: string): Promise<Result> {
  const { error } = await client.from("checkpoints").delete().eq("id", id);
  return error ? { error: errorText(error) } : {};
}

export async function setLiveTrack(client: SupabaseClient, slug: string, url: string): Promise<Result> {
  const { error } = await client.rpc("set_livetrack_link", { slug, url });
  return error ? { error: errorText(error) } : {};
}

/** Only whether a link is set and since when. The link itself never leaves the database. */
export async function liveTrackStatus(client: SupabaseClient, slug: string): Promise<{ isSet: boolean; at: number | null } | null> {
  const { data, error } = await client.rpc("livetrack_link_status", { slug });
  if (error) return null;
  const row = (Array.isArray(data) ? data[0] : data) as { is_set?: boolean; updated_at?: string | null } | undefined;
  const at = row?.updated_at ? Date.parse(row.updated_at) : null;
  return { isSet: !!row?.is_set, at };
}

/**
 * Sends the sign-in mail. Never creates an account. Unknown addresses get the same answer as known ones,
 * so the form does not tell who has an account. Only a missing network and a failed bot check are reported.
 * Supabase asks for the Turnstile token on every sign-in, not only the anonymous one.
 */
export async function sendMagicLink(client: SupabaseClient, raw: string, redirectTo: string, captchaToken?: string): Promise<Result> {
  const email = raw.trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { error: "Gib eine E-Mail-Adresse ein." };
  const { error } = await client.auth.signInWithOtp({ email, options: { shouldCreateUser: false, emailRedirectTo: redirectTo, ...(captchaToken ? { captchaToken } : {}) } });
  if (!error) return {};
  const text = errorText(error);
  const tell = [errorText(null, { online: false }), errorText({ code: "captcha_failed", message: "x" })];
  return tell.includes(text) ? { error: text } : {};
}
