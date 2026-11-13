import { describe, expect, it } from "vitest";
import replay from "../public/data/hamburg-2026/replay.json";
import { createClock } from "../src/lib/live/clock";
import { replaySource } from "../src/lib/live/source";

const source = replaySource(replay);

describe("replaySource", () => {
  it("Puls ist echt: at 1:00:00 the source gives 174 from replay.json", () => {
    expect(source.sampleAt(3600).hr).toBe(174);
  });

  it("gives exactly the values from the file at every measurement point", () => {
    for (let i = 0; i < replay.t.length; i++) {
      const s = source.sampleAt(replay.t[i]);
      expect([s.km, s.lat, s.lng, s.hr, s.cad, s.alt]).toEqual([replay.km[i], replay.lat[i], replay.lng[i], replay.hr[i], replay.cad[i], replay.alt[i]]);
    }
  });

  it("knows its duration", () => {
    expect(source.duration).toBe(replay.t.at(-1));
  });

  it("Jeder Messwert kommt an: 30 s at 10x give a new km for every measurement point", () => {
    const from = 3600;
    const points = replay.t.map((t, i) => ({ t, km: replay.km[i] })).filter((p) => p.t > from && p.t <= from + 300);
    // Precondition: the runner moves in this window, every point has a higher km than the one before.
    expect(points.length).toBeGreaterThan(60);
    for (let i = 1; i < points.length; i++) expect(points[i].km).toBeGreaterThan(points[i - 1].km);

    const clock = createClock(source.duration, from);
    clock.setSpeed(10, 0);
    clock.play(0);
    const frames: { t: number; km: number }[] = [];
    for (let frame = 1; frame <= 30 * 60; frame++) {
      const t = clock.time((frame * 1000) / 60);
      frames.push({ t, km: source.sampleAt(t).km });
    }
    expect(frames.at(-1)!.t).toBeCloseTo(from + 300, 6);

    // The first frame at or after each measurement point shows a higher km than at the point before.
    let prevKm = source.sampleAt(from).km;
    for (const p of points) {
      const f = frames.find((x) => x.t >= p.t)!;
      expect(f.km).toBeGreaterThan(prevKm);
      prevKm = f.km;
    }
  });
});
