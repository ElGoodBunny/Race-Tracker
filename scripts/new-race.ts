// Usage: node scripts/new-race.ts <config.json>
// Creates src/content/races/<slug>.json from a GPX file: the track is simplified, km are scaled to the
// official distance, bounds get 500 m margin, landmarks snap in order to the nearest route point.
// Config example: scripts/races/barcelona-2027.json. GPX files stay out of the repo (.cache/courses/).

import { readFileSync, writeFileSync } from "node:fs";
import type { LatLng } from "../src/lib/course.ts";
import { routeBounds } from "../src/lib/osm.ts";
import { parseGpx, snapToRoute, trackToCourse } from "../src/lib/track.ts";

interface Config {
  gpx: string;
  toleranceM: number;
  race: Record<string, unknown> & { slug: string; distanceKm: number };
  source: string;
  /** "start", "finish" or a position; `osm` only documents where the position comes from. */
  landmarks: { name: string; at: "start" | "finish" | LatLng; osm?: string }[];
}

const [file] = process.argv.slice(2);
if (!file) {
  console.error("Usage: node scripts/new-race.ts <config.json>");
  process.exit(1);
}
const cfg: Config = JSON.parse(readFileSync(file, "utf8"));
const track = parseGpx(readFileSync(cfg.gpx, "utf8"));
let { route, km, rawKm, scale } = trackToCourse(track, cfg.toleranceM, cfg.race.distanceKm);

let from = 0;
const report: string[] = [];
const landmarks = cfg.landmarks.map((l) => {
  let idx = l.at === "start" ? 0 : route.length - 1;
  let off = "";
  if (Array.isArray(l.at)) {
    const s = snapToRoute(route, km, l.at, from);
    ({ route, km, idx } = s);
    off = `${Math.round(s.offM)} m neben der Strecke`;
  }
  report.push(`${l.name.padEnd(24)} km ${km[idx].toFixed(2).padStart(5)}  ${off}`);
  from = idx;
  return { name: l.name, idx };
});

const r4 = (v: number) => Math.round(v * 10000) / 10000;
const b = routeBounds(route, 500);
const race = {
  ...cfg.race,
  course: { source: cfg.source, route, km, landmarks, bounds: { w: r4(b.w), e: r4(b.e), n: r4(b.n), s: r4(b.s) } },
};
const out = `src/content/races/${cfg.race.slug}.json`;
writeFileSync(out, JSON.stringify(race, null, 1));
console.log(`${track.length} -> ${route.length} points, GPX length ${rawKm.toFixed(3)} km, scale ${scale.toFixed(4)} -> ${out}`);
console.log(report.join("\n"));
