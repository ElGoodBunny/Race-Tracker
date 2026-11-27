// Cheering spots (docs/tasks/025-claude-spots.md): checks like the database, add and delete, arrival per spot.
// Author name and owner are set by the database, never by the client. Security comes from RLS.
import type { SupabaseClient } from "@supabase/supabase-js";
import { estimate, type Checkpoint, type Estimate } from "../estimate";
import { errorText } from "./errors";
import type { CheckpointRow, RaceRow, SpotRow } from "./supabase";

/** Same limit as the check on spots.name. */
export const SPOT_NAME_MAX = 40;
/** The legacy slider started at 0.3 km, right behind the start line. */
const KM_MIN = 0.3;
type Result = { error?: string };

export function checkSpotName(raw: string): { name: string } | { error: string } {
  const name = raw.trim();
  if (!name) return { error: "Gib deinem Spot einen Namen." };
  if (name.length > SPOT_NAME_MAX) return { error: `Höchstens ${SPOT_NAME_MAX} Zeichen.` };
  return { name };
}

/** Slider range. The end is the last tenth inside the race: 42.195 rounded would be 42.2, which the database rejects. */
export function kmRange(distanceKm: number): { min: number; max: number } {
  return { min: KM_MIN, max: Math.floor(distanceKm * 10 + 1e-9) / 10 };
}

/** km rounded to 0.1 and kept inside the slider range. */
export function checkSpotKm(raw: number | string, distanceKm: number): { km: number } | { error: string } {
  const n = typeof raw === "number" ? raw : Number(raw);
  if (!Number.isFinite(n)) return { error: "Wähl einen Kilometer auf der Strecke." };
  const { min, max } = kmRange(distanceKm);
  return { km: Math.min(max, Math.max(min, Math.round(n * 10) / 10)) };
}

export async function addSpot(client: SupabaseClient, slug: string, name: string, km: number): Promise<Result> {
  const { error } = await client.from("spots").insert({ race_slug: slug, name, km });
  return error ? { error: errorText(error) } : {};
}

export async function deleteSpot(client: SupabaseClient, id: string): Promise<Result> {
  const { error } = await client.from("spots").delete().eq("id", id);
  return error ? { error: errorText(error) } : {};
}

export const isMine = (spot: Pick<SpotRow, "created_by">, me: string | null) => !!me && spot.created_by === me;

/** Values from src/content/races, used where the database has none yet. */
export interface RacePlan {
  plannedStart: string;
  targetSec: number;
  distanceKm: number;
  /** Net time from the result, for races that are over before the database knew their finish. */
  netSec?: number;
}

const time = (iso: string | null) => (iso ? Date.parse(iso) : null);

/** The legacy estimate on the race row and checkpoints from Supabase. */
export function raceEstimate(race: RaceRow | null, checkpoints: CheckpointRow[], plan: RacePlan, now: number): Estimate {
  const cps: Checkpoint[] = checkpoints.map((c) => ({ id: c.id, km: c.km, netSec: c.net_sec, at: time(c.seen_at ?? c.created_at), src: c.src }));
  const plannedStart = time(race?.planned_start ?? null) ?? Date.parse(plan.plannedStart);
  const actualStart = time(race?.actual_start ?? null);
  // Without a finish in the database the result from the content file counts, once its finish time has passed.
  const resultAt = plan.netSec ? (actualStart ?? plannedStart) + plan.netSec * 1000 : null;
  const state = {
    plannedStart,
    actualStart,
    finishedAt: time(race?.finished_at ?? null) ?? (resultAt != null && now >= resultAt ? resultAt : null),
    targetSec: race?.target_sec || plan.targetSec,
  };
  return estimate(state, cps, race?.distance_km || plan.distanceKm, now);
}

/** Passed like in the legacy list (finish, or the estimate is at or past the spot), otherwise the arrival in ms. */
export function spotEta(est: Estimate, km: number): { passed: boolean; at: number | null } {
  if (est.phase === "done" || km <= est.km) return { passed: true, at: null };
  return { passed: false, at: est.eta(km) };
}

/** A tap counts as on the route when the closest route point is at most this far away on screen (CSS px). */
export const TAP_PX = 24;

/**
 * The km a tap on the 3D view chooses for the own spot (docs/tasks/034-claude-karte.md), rounded and clamped
 * like the slider. `px` is the screen distance from the tap to the closest route point. null: not on the route.
 */
export function tapSpotKm(hit: { km: number; px: number } | null, distanceKm: number): { km: number } | null {
  if (!hit || hit.px > TAP_PX) return null;
  const k = checkSpotKm(hit.km, distanceKm);
  return "km" in k ? k : null;
}
