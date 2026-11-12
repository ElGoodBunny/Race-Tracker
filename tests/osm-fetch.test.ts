import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { OverpassError, loadOsmParts, readCache, withRetry, writeCache } from "../scripts/lib/osm-fetch";
import { splitBounds, type Bounds, type OverpassElement } from "../src/lib/osm";

const bounds: Bounds = { s: 50, w: 8, n: 52, e: 12 };
const el = (id: number): OverpassElement => ({ type: "way", id });

let dir: string;
beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "osm-cache-"));
});
afterEach(() => rmSync(dir, { recursive: true, force: true }));

describe("withRetry", () => {
  const noSleep = async () => {};

  it("retries 502, 504 and no answer with 30, 60, 120 s waits", async () => {
    const waits: number[] = [];
    const errors = [new OverpassError("HTTP 502", 502), new OverpassError("HTTP 504", 504), new OverpassError("no answer")];
    let calls = 0;
    const result = await withRetry(async () => {
      if (calls < errors.length) throw errors[calls++];
      calls++;
      return [el(1)];
    }, { sleep: async (ms) => void waits.push(ms) });
    expect(result).toEqual([el(1)]);
    expect(calls).toBe(4);
    expect(waits).toEqual([30_000, 60_000, 120_000]);
  });

  it("gives up after the third retry", async () => {
    let calls = 0;
    await expect(withRetry(async () => {
      calls++;
      throw new OverpassError("HTTP 502", 502);
    }, { sleep: noSleep })).rejects.toThrow("HTTP 502");
    expect(calls).toBe(4);
  });

  it("does not retry other errors", async () => {
    let calls = 0;
    await expect(withRetry(async () => {
      calls++;
      throw new OverpassError("HTTP 429", 429);
    }, { sleep: noSleep })).rejects.toThrow("HTTP 429");
    expect(calls).toBe(1);
  });
});

describe("cache", () => {
  it("returns stored elements for the same bounds", () => {
    writeCache(dir, "parks", bounds, [el(1)]);
    expect(readCache(dir, "parks", bounds)).toEqual([el(1)]);
  });

  it("ignores missing entries and entries for other bounds", () => {
    expect(readCache(dir, "parks", bounds)).toBeNull();
    writeCache(dir, "parks", bounds, [el(1)]);
    expect(readCache(dir, "parks", { ...bounds, n: 53 })).toBeNull();
  });
});

describe("loadOsmParts", () => {
  it("takes cached parts and fetches only the missing ones", async () => {
    writeCache(dir, "buildings", bounds, [el(1)]);
    writeCache(dir, "parks", bounds, [el(2)]);
    const asked: string[] = [];
    const r = await loadOsmParts(bounds, dir, async (label) => {
      asked.push(label);
      return [el(label === "water" ? 3 : 4)];
    });
    expect(asked).toEqual(["water", "trees"]);
    expect(r.fromCache).toEqual(["buildings", "parks"]);
    expect(r.fetched).toEqual(["water", "trees"]);
    expect(r.missing).toEqual([]);
    expect(r.elements.map((e) => e.id)).toEqual([1, 2, 3, 4]);
    expect(readCache(dir, "trees", bounds)).toEqual([el(4)]);
  });

  it("splits buildings into tiles, caches each tile and reports failed ones as missing", async () => {
    const r = await loadOsmParts(bounds, dir, async (label) => {
      if (label === "buildings" || label === "buildings-tile-3") throw new OverpassError("HTTP 504", 504);
      return [el(Number(label.at(-1)) || 9)];
    });
    expect(r.fetched).toEqual(["buildings-tile-1", "buildings-tile-2", "buildings-tile-4", "parks", "water", "trees"]);
    expect(r.missing).toEqual(["buildings-tile-3"]);
    expect(readCache(dir, "buildings-tile-2", splitTile(1))).toEqual([el(2)]);
  });

  it("skips the whole-box query when tiles are already cached", async () => {
    writeCache(dir, "buildings-tile-1", splitTile(0), [el(1)]);
    const asked: string[] = [];
    const r = await loadOsmParts(bounds, dir, async (label) => {
      asked.push(label);
      return [el(5)];
    });
    expect(asked).not.toContain("buildings");
    expect(r.fromCache).toContain("buildings-tile-1");
    expect(r.missing).toEqual([]);
  });
});

function splitTile(i: number): Bounds {
  return splitBounds(bounds)[i];
}
