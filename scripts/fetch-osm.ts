// Usage: node scripts/fetch-osm.ts <race-slug> [corridorMeters=600]
// Downloads buildings, parks, water, trees and coastline along the course from the Overpass API and writes
// public/data/<slug>/scene.json (packed, see PackedScene in src/lib/osm.ts) and trees.json for the 3D view.
// Run once per race, commit the result.
// Data © OpenStreetMap contributors, ODbL. Be nice to the public Overpass servers: one run, not a loop.

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dedupeElements, osmToScene, overpassTimedOut, packScene, routeBounds, type OverpassElement } from "../src/lib/osm.ts";
import { OverpassError, loadOsmParts, withRetry } from "./lib/osm-fetch.ts";

const [slug, corridorArg] = process.argv.slice(2);
if (!slug) {
  console.error("Usage: node scripts/fetch-osm.ts <race-slug> [corridorMeters]");
  process.exit(1);
}
const corridor = Number(corridorArg ?? 600);
const race = JSON.parse(readFileSync(`src/content/races/${slug}.json`, "utf8"));
const bounds = routeBounds(race.course.route, corridor);

const ENDPOINTS = ["https://overpass-api.de/api/interpreter", "https://overpass.kumi.systems/api/interpreter", "https://overpass.private.coffee/api/interpreter"];
// One request. 502/504 and no answer (network error or 200 s silence) become OverpassError for withRetry.
async function request(url: string, query: string): Promise<OverpassElement[]> {
  let res: Response;
  try {
    res = await fetch(url, { method: "POST", body: new URLSearchParams({ data: query }), headers: { "User-Agent": "race-tracker (github.com/Infopibe/race-tracker)" }, signal: AbortSignal.timeout(200_000) });
  } catch (e) {
    throw new OverpassError(`no answer (${(e as Error).message})`);
  }
  if (!res.ok) throw new OverpassError(`HTTP ${res.status}`, res.status);
  const json = await res.json();
  if (overpassTimedOut(json)) throw new OverpassError(json.remark, res.status);
  return json.elements;
}

// Tries each server in turn, each with retries. Throws if all fail.
async function fetchPart(label: string, query: string): Promise<OverpassElement[]> {
  for (const url of ENDPOINTS) {
    try {
      console.log(`${label}: ${url} ...`);
      const elements = await withRetry(() => request(url, query), {
        onRetry: (err, ms) => console.warn(`  ${err.message}, retry in ${ms / 1000} s`),
      });
      console.log(`  ${label}: ${elements.length} elements`);
      return elements;
    } catch (e) {
      console.warn(`  failed: ${(e as Error).message}`);
    }
  }
  throw new Error(`${label}: all servers failed`);
}

const result = await loadOsmParts(bounds, `.cache/osm/${slug}`, fetchPart);
const list = (keys: string[]) => (keys.length ? keys.join(", ") : "-");
console.log(`\nfrom cache: ${list(result.fromCache)}`);
console.log(`fetched:    ${list(result.fetched)}`);
console.log(`missing:    ${list(result.missing)}`);
if (result.missing.length) {
  console.error("Not all parts loaded, scene.json not written. Run again later, cached parts are kept.");
  process.exit(1);
}
const elements = dedupeElements(result.elements);
console.log(`${result.elements.length} elements, ${result.elements.length - elements.length} duplicates removed`);

const warnings: string[] = [];
const scene = osmToScene(elements, race.course.route, corridor, (msg) => warnings.push(msg));
for (const w of warnings) console.warn(`  ${w}`);
mkdirSync(`public/data/${slug}`, { recursive: true });
const packed = packScene(scene);
const out = `public/data/${slug}/scene.json`;
writeFileSync(out, JSON.stringify(packed.scene));
writeFileSync(`public/data/${slug}/trees.json`, JSON.stringify(packed.trees));
const kb = Math.round(JSON.stringify(packed.scene).length / 1024);
const holes = (items: { holes?: number[][] }[]) => items.reduce((n, i) => n + (i.holes?.length ?? 0), 0);
console.log(`${scene.buildings.length} buildings (${holes(scene.buildings)} courtyards), ${scene.parks.length} parks, ${scene.water.length} water (${holes(scene.water)} islands), ${scene.trees.length / 2} trees -> ${out} (${kb} kB)`);
