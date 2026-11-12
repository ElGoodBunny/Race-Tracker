// Usage: node scripts/fetch-osm.ts <race-slug> [corridorMeters=600]
// Downloads buildings, parks, water and trees along the course from the Overpass API and writes
// public/data/<slug>/scene.json for the 3D view. Run once per race, commit the result.
// Data © OpenStreetMap contributors, ODbL. Be nice to the public Overpass servers: one run, not a loop.

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { osmToScene, overpassQuery, routeBounds, type OverpassElement } from "../src/lib/osm.ts";

const [slug, corridorArg] = process.argv.slice(2);
if (!slug) {
  console.error("Usage: node scripts/fetch-osm.ts <race-slug> [corridorMeters]");
  process.exit(1);
}
const corridor = Number(corridorArg ?? 600);
const race = JSON.parse(readFileSync(`src/content/races/${slug}.json`, "utf8"));
const query = overpassQuery(routeBounds(race.course.route, corridor));

const ENDPOINTS = ["https://overpass-api.de/api/interpreter", "https://overpass.kumi.systems/api/interpreter"];
let elements: OverpassElement[] | null = null;
for (const url of ENDPOINTS) {
  try {
    console.log(`Querying ${url} ...`);
    const res = await fetch(url, { method: "POST", body: new URLSearchParams({ data: query }), headers: { "User-Agent": "race-tracker (github.com/Infopibe/race-tracker)" } });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    elements = (await res.json()).elements;
    break;
  } catch (e) {
    console.warn(`  failed: ${(e as Error).message}`);
  }
}
if (!elements) process.exit(1);

const scene = osmToScene(elements, race.course.route, corridor);
mkdirSync(`public/data/${slug}`, { recursive: true });
const out = `public/data/${slug}/scene.json`;
writeFileSync(out, JSON.stringify(scene));
const kb = Math.round(JSON.stringify(scene).length / 1024);
console.log(`${scene.buildings.length} buildings, ${scene.parks.length} parks, ${scene.water.length} water, ${scene.trees.length / 2} trees -> ${out} (${kb} kB)`);
