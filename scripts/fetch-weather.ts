// Usage: node scripts/fetch-weather.ts <race-slug>
// Fetches the weather of race day once from Open-Meteo (historical forecast, 15 min values, model icon_seamless)
// for the centre of the course and writes public/data/<slug>/weather.json for the replay. Run once per race, commit.
// Data: Open-Meteo.com, CC BY 4.0. Model values, not measurements.

import { mkdirSync, writeFileSync, readFileSync } from "node:fs";
import { fromOpenMeteo } from "../src/lib/live/weather.ts";

const [slug] = process.argv.slice(2);
if (!slug) {
  console.error("Usage: node scripts/fetch-weather.ts <race-slug>");
  process.exit(1);
}
const race = JSON.parse(readFileSync(`src/content/races/${slug}.json`, "utf8"));
const { n, s, w, e } = race.course.bounds;
const lat = ((n + s) / 2).toFixed(4);
const lng = ((w + e) / 2).toFixed(4);
const day = new Date(race.plannedStart).toISOString().slice(0, 10);
const model = "icon_seamless";
const fields = "temperature_2m,apparent_temperature,precipitation,wind_speed_10m,wind_direction_10m,weather_code,is_day";
const url = `https://historical-forecast-api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&start_date=${day}&end_date=${day}&minutely_15=${fields}&timezone=UTC&timeformat=unixtime&models=${model}`;

const res = await fetch(url, { headers: { "User-Agent": "race-tracker (github.com/Infopibe/race-tracker)" }, signal: AbortSignal.timeout(30_000) });
if (!res.ok) {
  console.error(`Open-Meteo: HTTP ${res.status} ${await res.text()}`);
  process.exit(1);
}
const series = fromOpenMeteo(await res.json(), { model });
mkdirSync(`public/data/${slug}`, { recursive: true });
writeFileSync(`public/data/${slug}/weather.json`, JSON.stringify(series));
const known = series.temp.filter((v) => v != null).length;
console.log(`public/data/${slug}/weather.json: ${day}, ${series.temp.length} steps of ${series.step / 60} min, ${known} with temperature, at ${series.lat}/${series.lng}`);
