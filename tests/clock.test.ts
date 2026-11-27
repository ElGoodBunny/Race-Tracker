import { describe, expect, it } from "vitest";
import { createClock } from "../src/lib/live/clock";

// Wall time is passed in as milliseconds, race time comes out in seconds.
describe("createClock", () => {
  it("starts paused at the start time", () => {
    const c = createClock(6000, 100);
    expect(c.playing).toBe(false);
    expect(c.time(0)).toBe(100);
    expect(c.time(50_000)).toBe(100);
  });

  it("runs at the chosen speed", () => {
    const c = createClock(6000);
    c.play(1000);
    expect(c.time(3000)).toBe(2);
    c.setSpeed(10, 3000);
    expect(c.time(4000)).toBe(12);
  });

  it("does not jump when the speed changes", () => {
    const c = createClock(6000);
    c.setSpeed(10, 0);
    c.play(0);
    const before = c.time(60_000);
    c.setSpeed(60, 60_000);
    expect(c.time(60_000)).toBe(before);
    c.setSpeed(1, 60_000);
    expect(c.time(60_000)).toBe(before);
  });

  it("holds the time while paused", () => {
    const c = createClock(6000);
    c.setSpeed(30, 0);
    c.play(0);
    c.pause(10_000);
    expect(c.time(10_000)).toBe(300);
    expect(c.time(99_000)).toBe(300);
    c.play(99_000);
    expect(c.time(100_000)).toBe(330);
  });

  it("jumps to a time and keeps running from there", () => {
    const c = createClock(6000);
    c.setSpeed(10, 0);
    c.play(0);
    c.seek(3600, 5000);
    expect(c.time(5000)).toBe(3600);
    expect(c.time(6000)).toBe(3610);
  });

  it("stays between 0 and the duration", () => {
    const c = createClock(6000);
    c.setSpeed(60, 0);
    c.play(0);
    expect(c.time(200_000)).toBe(6000);
    c.seek(-50, 200_000);
    expect(c.time(200_000)).toBe(0);
    c.seek(9999, 200_000);
    expect(c.time(300_000)).toBe(6000);
  });

  it("only accepts 1x, 10x, 30x and 60x", () => {
    const c = createClock(6000);
    // @ts-expect-error 5x is not a speed
    expect(() => c.setSpeed(5, 0)).toThrow();
  });
});
