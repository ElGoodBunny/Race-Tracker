// Weather for the HUD (docs/tasks/030-claude-wetter-replay.md). Source is Open-Meteo, model values, not measurements.
// The replay reads a fixed file per race (public/data/<slug>/weather.json, scripts/fetch-weather.ts).
// Live values come through Supabase later (031), never from the viewer's browser straight to the provider.

/** Even 15 min steps for one place. `start` in Unix seconds (UTC). Missing values are null, as Open-Meteo sends them. */
export interface WeatherSeries {
  source: "Open-Meteo";
  model: string;
  lat: number;
  lng: number;
  start: number;
  step: number;
  /** °C */
  temp: (number | null)[];
  /** Apparent temperature, °C */
  feels: (number | null)[];
  /** mm in the step */
  precip: (number | null)[];
  /** km/h at 10 m */
  wind: (number | null)[];
  /** Degrees the wind comes from */
  dir: (number | null)[];
  /** WMO weather code */
  code: (number | null)[];
  day: (number | null)[];
}

export interface Weather {
  /** Start of the step, ms */
  at: number;
  temp: number;
  feels: number | null;
  precip: number | null;
  wind: number | null;
  dir: number | null;
  code: number | null;
  day: boolean;
}

type Raw = { latitude?: number; longitude?: number; minutely_15?: Record<string, (number | null)[]> };

/** Answer of /v1/forecast with `minutely_15` and `timeformat=unixtime` into a series with even steps. */
export function fromOpenMeteo(raw: unknown, meta: { model: string }): WeatherSeries {
  const r = raw as Raw;
  const m = r.minutely_15;
  const time = m?.time as number[] | undefined;
  if (!m || !time || time.length < 2) throw new Error("Open-Meteo answer without minutely_15 values");
  const step = time[1] - time[0];
  if (time.some((t, i) => t !== time[0] + i * step)) throw new Error("minutely_15 steps are not even");
  const col = (key: string) => {
    const v = m[key];
    if (!v || v.length !== time.length) throw new Error(`minutely_15.${key} missing or of wrong length`);
    return v;
  };
  return {
    source: "Open-Meteo",
    model: meta.model,
    lat: r.latitude!,
    lng: r.longitude!,
    start: time[0],
    step,
    temp: col("temperature_2m"),
    feels: col("apparent_temperature"),
    precip: col("precipitation"),
    wind: col("wind_speed_10m"),
    dir: col("wind_direction_10m"),
    code: col("weather_code"),
    day: col("is_day"),
  };
}

/** Value of the step that contains `atMs`. Null outside the series or where the temperature is missing. */
export function weatherAt(s: WeatherSeries, atMs: number): Weather | null {
  const i = Math.floor((atMs / 1000 - s.start) / s.step);
  if (i < 0 || i >= s.temp.length) return null;
  const temp = s.temp[i];
  if (temp == null) return null;
  return {
    at: (s.start + i * s.step) * 1000,
    temp,
    feels: s.feels[i],
    precip: s.precip[i],
    wind: s.wind[i],
    dir: s.dir[i],
    code: s.code[i],
    day: s.day[i] !== 0,
  };
}

export type WeatherIcon = "sun" | "moon" | "cloud-sun" | "cloud-moon" | "cloud" | "cloud-fog" | "cloud-rain" | "cloud-snow" | "cloud-lightning";

/** WMO code (Open-Meteo docs, "WMO Weather interpretation codes") to German text and a Phosphor icon. */
export function describeWeather(code: number | null, day: boolean): { label: string; icon: WeatherIcon } {
  const clear = day ? "sun" : "moon";
  const partly = day ? "cloud-sun" : "cloud-moon";
  switch (code) {
    case 0: return { label: "klar", icon: clear };
    case 1: return { label: "überwiegend klar", icon: clear };
    case 2: return { label: "teils bewölkt", icon: partly };
    case 3: return { label: "bedeckt", icon: "cloud" };
    case 45: case 48: return { label: "Nebel", icon: "cloud-fog" };
    case 51: case 53: case 55: return { label: "Nieselregen", icon: "cloud-rain" };
    case 56: case 57: return { label: "gefrierender Nieselregen", icon: "cloud-rain" };
    case 61: return { label: "leichter Regen", icon: "cloud-rain" };
    case 63: return { label: "Regen", icon: "cloud-rain" };
    case 65: return { label: "starker Regen", icon: "cloud-rain" };
    case 66: case 67: return { label: "gefrierender Regen", icon: "cloud-rain" };
    case 71: case 73: case 75: case 77: return { label: "Schnee", icon: "cloud-snow" };
    case 80: case 81: case 82: return { label: "Regenschauer", icon: "cloud-rain" };
    case 85: case 86: return { label: "Schneeschauer", icon: "cloud-snow" };
    case 95: return { label: "Gewitter", icon: "cloud-lightning" };
    case 96: case 99: return { label: "Gewitter mit Hagel", icon: "cloud-lightning" };
    default: return { label: "bewölkt", icon: "cloud" };
  }
}

/** Texts for the HUD card: temperature, condition and wind apart, so the phone can drop the wind. */
export function weatherLine(w: Weather): { temp: string; label: string; wind: string | null } {
  return { temp: `${Math.round(w.temp)} °C`, label: describeWeather(w.code, w.day).label, wind: w.wind != null ? `Wind ${Math.round(w.wind)} km/h` : null };
}
