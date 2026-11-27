// Usage: node scripts/course-from-track.ts <race-slug> <streams.json> [toleranceMeters=4]
// Replaces course.route and course.km of src/content/races/<slug>.json with a recorded GPS track
// (Strava streams with `location`). The track is simplified (Douglas-Peucker), km are scaled to the
// official distance, and landmark indices are remapped to the nearest point on the new route.

import { readFileSync, writeFileSync } from "node:fs";
import { haversineKm, type LatLng } from "../src/lib/course.ts";
import { nearestIndex, trackToCourse } from "../src/lib/track.ts";

const [slug, file, tolArg] = process.argv.slice(2);
if (!slug || !file) {
  console.error("Usage: node scripts/course-from-track.ts <race-slug> <streams.json> [toleranceMeters]");
  process.exit(1);
}
const tol = Number(tolArg ?? 4);
const path = `src/content/races/${slug}.json`;
const race = JSON.parse(readFileSync(path, "utf8"));
const track: LatLng[] = JSON.parse(readFileSync(file, "utf8")).location;

const { route, km, rawKm, scale } = trackToCourse(track, tol, race.distanceKm);

// Remap landmarks in order: nearest new point at or after the previous landmark.
const old: LatLng[] = race.course.route;
let from = 0;
const report: string[] = [];
const landmarks = race.course.landmarks.map((l: { idx: number; name: string }, n: number, all: unknown[]) => {
  const target = old[l.idx];
  const last = n === all.length - 1;
  const near = nearestIndex(route, target, from);
  const best = { d: haversineKm(target, route[near]), i: near };
  const idx = last ? route.length - 1 : best.i;
  report.push(`${l.name.padEnd(22)} km ${km[idx].toFixed(2).padStart(5)}  ${Math.round(best.d * 1000)} m`);
  from = idx;
  return { ...l, idx };
});

race.course.route = route;
race.course.km = km;
race.course.landmarks = landmarks;
race.course.source = "GPS-Aufzeichnung vom Renntag, vereinfacht, km auf die offizielle Distanz skaliert";
writeFileSync(path, JSON.stringify(race, null, 1));
console.log(`${track.length} -> ${route.length} points, GPS length ${rawKm.toFixed(3)} km, scale ${scale.toFixed(4)}`);
console.log("Landmark remap (distance from old position):\n" + report.join("\n"));
