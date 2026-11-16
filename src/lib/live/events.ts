// Which cheering spots the runner has passed (docs/decisions/2026-11-13-3d-konzept.md).
// The only place that decides "passed": the view and the HUD get the result and never compare km themselves.

/** Like a row of the spots table. Everything else about a spot is optional for this module. */
export interface Spot {
  id: string;
  name: string;
  km: number;
}

export interface SpotTracker {
  /**
   * Call with the runner's course km on every frame and the current list of spots.
   * Returns the spots passed since the last call, in course order, each one only once.
   * A spot counts as passed when the runner reaches its km. Small steps backwards change nothing.
   */
  update(km: number, spots: readonly Spot[]): Spot[];
  passed(id: string): boolean;
  /** After a jump in time (seek, restart): spots up to `km` count as passed, the ones ahead are armed again. No events. */
  reset(km: number): void;
}

/** Spots up to `startKm` count as passed from the beginning, so opening the page mid race fires nothing. */
export function createSpotTracker(startKm = 0): SpotTracker {
  let lastKm = startKm;
  let state = new Map<string, boolean>();

  return {
    update(km, spots) {
      const next = new Map<string, boolean>();
      const fired: Spot[] = [];
      for (const s of spots) {
        // A spot seen for the first time behind the runner was passed before anyone could cheer there.
        let passed = state.get(s.id) ?? s.km <= lastKm;
        if (!passed && s.km <= km) {
          passed = true;
          fired.push(s);
        }
        next.set(s.id, passed);
      }
      state = next;
      lastKm = Math.max(lastKm, km);
      return fired.sort((a, b) => a.km - b.km);
    },
    passed: (id) => state.get(id) ?? false,
    reset(km) {
      lastKm = km;
      state = new Map();
    },
  };
}
