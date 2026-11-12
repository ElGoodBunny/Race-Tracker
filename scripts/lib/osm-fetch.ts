// Cache and retry logic for scripts/fetch-osm.ts. Every successfully loaded category or tile is stored
// under .cache/osm/<slug>/, so a later run only asks Overpass for what is still missing.

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { overpassQueries, splitBounds, type Bounds, type OverpassElement } from "../../src/lib/osm.ts";

/** status is undefined when the server did not answer at all. */
export class OverpassError extends Error {
  status?: number;
  constructor(message: string, status?: number) {
    super(message);
    this.status = status;
  }
}

const RETRY_WAITS_MS = [30_000, 60_000, 120_000];
const sleepMs = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

/** Repeats on 502, 504 or no answer, waiting 30, 60, 120 s. Other errors are thrown right away. */
export async function withRetry<T>(
  attempt: () => Promise<T>,
  { sleep = sleepMs, onRetry }: { sleep?: (ms: number) => Promise<void>; onRetry?: (err: Error, waitMs: number) => void } = {},
): Promise<T> {
  for (let i = 0; ; i++) {
    try {
      return await attempt();
    } catch (e) {
      const err = e as OverpassError;
      const retryable = err instanceof OverpassError && (err.status === undefined || err.status === 502 || err.status === 504);
      if (!retryable || i >= RETRY_WAITS_MS.length) throw err;
      onRetry?.(err, RETRY_WAITS_MS[i]);
      await sleep(RETRY_WAITS_MS[i]);
    }
  }
}

export function readCache(dir: string, key: string, bounds: Bounds): OverpassElement[] | null {
  const file = join(dir, `${key}.json`);
  if (!existsSync(file)) return null;
  const cached = JSON.parse(readFileSync(file, "utf8")) as { bounds: Bounds; elements: OverpassElement[] };
  return JSON.stringify(cached.bounds) === JSON.stringify(bounds) ? cached.elements : null;
}

export function writeCache(dir: string, key: string, bounds: Bounds, elements: OverpassElement[]): void {
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, `${key}.json`), JSON.stringify({ bounds, elements }));
}

export interface LoadResult {
  elements: OverpassElement[];
  fromCache: string[];
  fetched: string[];
  missing: string[];
}

/**
 * Loads all categories, from the cache where possible. Buildings fall back to 2 x 2 tiles when the whole box fails;
 * once any tile is cached the whole box is not asked again. Failed parts end up in `missing`, the rest is still loaded.
 */
export async function loadOsmParts(
  bounds: Bounds,
  cacheDir: string,
  fetchPart: (label: string, query: string) => Promise<OverpassElement[]>,
): Promise<LoadResult> {
  const r: LoadResult = { elements: [], fromCache: [], fetched: [], missing: [] };

  const load = async (key: string, b: Bounds, query: string, recordMissing = true) => {
    const cached = readCache(cacheDir, key, b);
    if (cached) {
      r.fromCache.push(key);
      r.elements.push(...cached);
      return true;
    }
    try {
      const elements = await fetchPart(key, query);
      writeCache(cacheDir, key, b, elements);
      r.fetched.push(key);
      r.elements.push(...elements);
      return true;
    } catch {
      if (recordMissing) r.missing.push(key);
      return false;
    }
  };

  const tiles = splitBounds(bounds).map((b, i) => ({ key: `buildings-tile-${i + 1}`, b, query: buildingsQuery(b) }));
  const tilesStarted = tiles.some((t) => readCache(cacheDir, t.key, t.b));
  for (const { category, query } of overpassQueries(bounds)) {
    if (category !== "buildings") {
      await load(category, bounds, query);
      continue;
    }
    if (!tilesStarted && (await load("buildings", bounds, query, false))) continue;
    for (const t of tiles) await load(t.key, t.b, t.query);
  }
  return r;
}

function buildingsQuery(b: Bounds): string {
  return overpassQueries(b).find((q) => q.category === "buildings")!.query;
}
