// "Ich sehe Dima gerade" (docs/tasks/026-claude-gesehen.md): a sighting is a checkpoint with src 'seen'.
// Time, author and owner are set by the database, never by the client. Security comes from RLS.
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Estimate } from "../estimate";
import { errorText } from "./errors";

type Result = { error?: string };
/** The legacy page took the own spot if it was closer than this to the estimate. */
const SPOT_RADIUS_KM = 2.5;
/** The database wants km > 0. */
const KM_MIN = 0.1;

/**
 * Where the sighting goes, as in the legacy page: the nearest own spot within 2.5 km, otherwise the estimate rounded to 0.1 km.
 * null outside "run" and "arriving", the legacy page hid the button then.
 */
export function sightingKm(est: Pick<Estimate, "phase" | "km">, mySpots: { km: number }[], distanceKm: number): number | null {
  if (est.phase !== "run" && est.phase !== "arriving") return null;
  const near = mySpots
    .filter((s) => Math.abs(s.km - est.km) < SPOT_RADIUS_KM)
    .sort((a, b) => Math.abs(a.km - est.km) - Math.abs(b.km - est.km))[0];
  const km = near ? near.km : Math.round(est.km * 10) / 10;
  // The last tenth inside the race: 42.195 rounded would be 42.2, which the database rejects.
  const max = Math.floor(distanceKm * 10 + 1e-9) / 10;
  return Math.min(max, Math.max(KM_MIN, km));
}

export async function reportSeen(client: SupabaseClient, slug: string, km: number): Promise<Result> {
  const { error } = await client.from("checkpoints").insert({ race_slug: slug, km, src: "seen" });
  return error ? { error: errorText(error) } : {};
}

export async function deleteSighting(client: SupabaseClient, id: string): Promise<Result> {
  const { error } = await client.from("checkpoints").delete().eq("id", id);
  return error ? { error: errorText(error) } : {};
}
