// List "Als Nächstes": the spots still ahead and when the runner gets there (docs/decisions/2026-11-13-3d-konzept.md).
// "Passed" comes from the SpotTracker in events.ts, this module never compares km to decide it.
import type { Spot } from "./events";

export interface UpcomingSpot {
  spot: Spot;
  /** Distance to the spot in km, never negative. */
  distKm: number;
  /** Seconds to the spot at the given pace, null without a pace. */
  etaSec: number | null;
}

/**
 * Spots that are not passed yet, nearest first, at most `limit`.
 * `passed` comes from the SpotTracker (tracker.passed), this function never decides "passed" itself.
 */
export function upcomingSpots(
  km: number,
  pace: number | null,
  spots: readonly Spot[],
  passed: (id: string) => boolean,
  limit = 3,
): UpcomingSpot[] {
  if (limit <= 0) return [];
  const hasPace = pace !== null && pace > 0;
  // filter copies, and sort is stable, so equal km keep the input order.
  return spots
    .filter((s) => !passed(s.id))
    .sort((a, b) => a.km - b.km)
    .slice(0, limit)
    .map((spot) => {
      const distKm = Math.max(0, spot.km - km);
      return { spot, distKm, etaSec: hasPace ? distKm * pace : null };
    });
}
