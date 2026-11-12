// Usage: node scripts/fetch-osm.ts <race-slug> [corridorMeters=600]
// Downloads buildings, parks, water and trees along the course from the Overpass API and writes
// public/data/<slug>/scene.json for the 3D view. Run once per race, commit the result.
// Data © OpenStreetMap contributors, ODbL. Be nice to the public Overpass servers: one run, not a loop.

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dedupeElements, osmToScene, overpassQueries, overpassTimedOut, routeBounds, splitBounds, type OverpassElement } from "../src/lib/osm.ts";

const [slug, corridorArg] = process.argv.slice(2);
if (!slug) {
  console.error("Usage: node scripts/fetch-osm.ts <race-slug> [corridorMeters]");
  process.exit(1);
}
const corridor = Number(corridorArg ?? 600);
const race = JSON.parse(readFileSync(`src/content/races/${slug}.json`, "utf8"));
const bounds = routeBounds(race.course.route, corridor);

const ENDPOINTS = ["https://overpass-api.de/api/interpreter", "https://overpass.kumi.systems/api/interpreter", "https://overpass.private.coffee/api/interpreter"];
// Tries each server once. Returns null if all fail or time out.
async function fetchQuery(label: string, query: string): Promise<OverpassElement[] | null> {
  for (const url of ENDPOINTS) {
    try {
      console.log(`${label}: ${url} ...`);
      const res = await fetch(url, { method: "POST", body: new URLSearchParams({ data: query }), headers: { "User-Agent": "race-tracker (github.com/Infopibe/race-tracker)" } });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      if (overpassTimedOut(json)) throw new Error(json.remark);
      return json.elements;
    } catch (e) {
      console.warn(`  failed: ${(e as Error).message}`);
    }
  }
  return null;
}

const raw: OverpassElement[] = [];
for (const { category, query } of overpassQueries(bounds)) {
  let part = await fetchQuery(category, query);
  if (!part && category === "buildings") {
    console.log("buildings: splitting into 2 x 2 tiles");
    part = [];
    for (const [i, tile] of splitBounds(bounds).entries()) {
      const tilePart = await fetchQuery(`buildings tile ${i + 1}/4`, overpassQueries(tile).find((q) => q.category === "buildings")!.query);
      if (!tilePart) process.exit(1);
      part.push(...tilePart);
    }
  }
  if (!part) process.exit(1);
  console.log(`  ${category}: ${part.length} elements`);
  raw.push(...part);
}
const elements = dedupeElements(raw);
console.log(`${raw.length} elements, ${raw.length - elements.length} duplicates removed`);

const scene = osmToScene(elements, race.course.route, corridor);
mkdirSync(`public/data/${slug}`, { recursive: true });
const out = `public/data/${slug}/scene.json`;
writeFileSync(out, JSON.stringify(scene));
const kb = Math.round(JSON.stringify(scene).length / 1024);
console.log(`${scene.buildings.length} buildings, ${scene.parks.length} parks, ${scene.water.length} water, ${scene.trees.length / 2} trees -> ${out} (${kb} kB)`);
