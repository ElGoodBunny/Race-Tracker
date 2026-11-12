// Usage: node scripts/course-from-track.ts <race-slug> <streams.json> [toleranceMeters=4]
// Replaces course.route and course.km of src/content/races/<slug>.json with a recorded GPS track
// (Strava streams with `location`). The track is simplified (Douglas-Peucker), km are scaled to the
// official distance, and landmark indices are remapped to the nearest point on the new route.

import { readFileSync, writeFileSync } from "node:fs";
import { haversineKm, type LatLng } from "../src/lib/course.ts";

const [slug, file, tolArg] = process.argv.slice(2);
if (!slug || !file) {
  console.error("Usage: node scripts/course-from-track.ts <race-slug> <streams.json> [toleranceMeters]");
  process.exit(1);
}
const tol = Number(tolArg ?? 4);
const path = `src/content/races/${slug}.json`;
const race = JSON.parse(readFileSync(path, "utf8"));
const track: LatLng[] = JSON.parse(readFileSync(file, "utf8")).location;

// Douglas-Peucker in local metres.
const o = track[0];
const kx = (Math.cos((o[0] * Math.PI) / 180) * Math.PI * 6371000) / 180;
const ky = (Math.PI * 6371000) / 180;
const xy = track.map((p) => [(p[1] - o[1]) * kx, (p[0] - o[0]) * ky]);
const keep = new Uint8Array(track.length);
keep[0] = keep[track.length - 1] = 1;
const stack: [number, number][] = [[0, track.length - 1]];
while (stack.length) {
  const [a, b] = stack.pop()!;
  const [ax, ay] = xy[a];
  const [bx, by] = xy[b];
  const len = Math.hypot(bx - ax, by - ay) || 1;
  let far = -1;
  let dmax = tol;
  for (let i = a + 1; i < b; i++) {
    const d = Math.abs((bx - ax) * (ay - xy[i][1]) - (ax - xy[i][0]) * (by - ay)) / len;
    if (d > dmax) { dmax = d; far = i; }
  }
  if (far > 0) { keep[far] = 1; stack.push([a, far], [far, b]); }
}
const route: LatLng[] = track.filter((_, i) => keep[i]).map((p) => [+p[0].toFixed(6), +p[1].toFixed(6)]);

// Cumulative km, scaled so the finish is exactly the official distance.
const raw = [0];
for (let i = 1; i < route.length; i++) raw.push(raw[i - 1] + haversineKm(route[i - 1], route[i]));
const scale = race.distanceKm / raw[raw.length - 1];
const km = raw.map((k) => Math.round(k * scale * 1000) / 1000);

// Remap landmarks in order: nearest new point at or after the previous landmark.
const old: LatLng[] = race.course.route;
let from = 0;
const report: string[] = [];
const landmarks = race.course.landmarks.map((l: { idx: number; name: string }, n: number, all: unknown[]) => {
  const target = old[l.idx];
  const last = n === all.length - 1;
  let best = { d: Infinity, i: from };
  for (let i = from; i < route.length; i++) {
    const d = haversineKm(target, route[i]);
    if (d < best.d) best = { d, i };
  }
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
console.log(`${track.length} -> ${route.length} points, GPS length ${raw[raw.length - 1].toFixed(3)} km, scale ${scale.toFixed(4)}`);
console.log("Landmark remap (distance from old position):\n" + report.join("\n"));
