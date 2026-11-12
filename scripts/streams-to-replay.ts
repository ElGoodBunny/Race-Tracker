// Usage: node scripts/streams-to-replay.ts <race-slug> <streams.json>
// streams.json: Strava activity streams (time, location, heart_rate, cadence, altitude), e.g. from the Strava API.
// Writes public/data/<slug>/replay.json, which the replay mode and the 3D scene load lazily.

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { projectOnCourse } from "../src/lib/replay.ts";

const [slug, file] = process.argv.slice(2);
if (!slug || !file) {
  console.error("Usage: node scripts/streams-to-replay.ts <race-slug> <streams.json>");
  process.exit(1);
}

const race = JSON.parse(readFileSync(`src/content/races/${slug}.json`, "utf8"));
const streams = JSON.parse(readFileSync(file, "utf8"));
const samples = projectOnCourse(race.course, streams);

// Compact columnar format, about a third of the size of an array of objects.
const r = (v: number, d: number) => Math.round(v * 10 ** d) / 10 ** d;
const replay = {
  slug,
  source: "Strava activity streams",
  fields: ["t", "km", "lat", "lng", "hr", "cad", "alt"],
  t: samples.map((s) => s.t),
  km: samples.map((s) => r(s.km, 3)),
  lat: samples.map((s) => r(s.lat, 6)),
  lng: samples.map((s) => r(s.lng, 6)),
  hr: samples.map((s) => s.hr),
  cad: samples.map((s) => s.cad),
  alt: samples.map((s) => (s.alt == null ? null : r(s.alt, 1))),
};

mkdirSync(`public/data/${slug}`, { recursive: true });
writeFileSync(`public/data/${slug}/replay.json`, JSON.stringify(replay));
const last = samples[samples.length - 1];
console.log(`${samples.length} samples, ${last.t} s, course km ${last.km}`);
