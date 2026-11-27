import { describe, expect, it } from "vitest";
import raw from "./fixtures/open-meteo-hamburg-2026-10-25.json";
import { describeWeather, fromOpenMeteo, weatherAt, weatherLine } from "../src/lib/live/weather";

// Real answer of the Open-Meteo historical forecast for the Hamburg course centre on race day (icon_seamless, 15 min).
const series = fromOpenMeteo(raw, { model: "icon_seamless" });
const start = Date.parse("2026-10-25T08:45:00Z");

describe("fromOpenMeteo", () => {
  it("keeps the whole day in 15 min steps", () => {
    expect(series.start).toBe(Date.parse("2026-10-25T00:00:00Z") / 1000);
    expect(series.step).toBe(900);
    expect(series.temp).toHaveLength(96);
    expect(series.source).toBe("Open-Meteo");
    expect(series.model).toBe("icon_seamless");
  });

  it("rejects an answer without 15 min values", () => {
    expect(() => fromOpenMeteo({ latitude: 1, longitude: 2 }, { model: "x" })).toThrow(/minutely_15/);
  });
});

describe("weatherAt", () => {
  it("gives the race start value of the fixture", () => {
    const w = weatherAt(series, start)!;
    expect(w.temp).toBe(11.2);
    expect(w.feels).toBe(8.2);
    expect(w.wind).toBe(16.6);
    expect(w.code).toBe(3);
    expect(w.day).toBe(true);
    expect(w.at).toBe(start);
  });

  it("keeps the value of the step until the next one starts", () => {
    expect(weatherAt(series, start + 14 * 60_000)!.at).toBe(start);
    expect(weatherAt(series, start + 15 * 60_000)!.at).toBe(start + 15 * 60_000);
  });

  it("returns null outside the day", () => {
    expect(weatherAt(series, Date.parse("2026-10-24T23:59:00Z"))).toBeNull();
    expect(weatherAt(series, Date.parse("2026-10-26T00:00:00Z"))).toBeNull();
  });

  it("returns null for a step without temperature", () => {
    const gap = { ...series, temp: series.temp.map((v, i) => (i === 35 ? null : v)) };
    expect(weatherAt(gap, start)).toBeNull();
  });
});

describe("describeWeather", () => {
  it("names WMO codes in German with a fitting icon", () => {
    expect(describeWeather(0, true)).toEqual({ label: "klar", icon: "sun" });
    expect(describeWeather(0, false)).toEqual({ label: "klar", icon: "moon" });
    expect(describeWeather(2, true)).toEqual({ label: "teils bewölkt", icon: "cloud-sun" });
    expect(describeWeather(3, true)).toEqual({ label: "bedeckt", icon: "cloud" });
    expect(describeWeather(61, true)).toEqual({ label: "leichter Regen", icon: "cloud-rain" });
    expect(describeWeather(80, true)).toEqual({ label: "Regenschauer", icon: "cloud-rain" });
    expect(describeWeather(95, true)).toEqual({ label: "Gewitter", icon: "cloud-lightning" });
  });

  it("falls back to a plain cloud for unknown codes", () => {
    expect(describeWeather(42, true)).toEqual({ label: "bewölkt", icon: "cloud" });
  });
});

describe("weatherLine", () => {
  it("rounds for the HUD", () => {
    expect(weatherLine(weatherAt(series, start)!)).toEqual({ temp: "11 °C", label: "bedeckt", wind: "Wind 17 km/h" });
  });
});
