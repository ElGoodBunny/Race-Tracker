import { describe, expect, it } from "vitest";
import { createSpotTracker, type Spot } from "../src/lib/live/events";

const spots: Spot[] = [
  { id: "c", name: "Fòrum", km: 30.585 },
  { id: "a", name: "Sagrada Família", km: 13.896 },
  { id: "b", name: "Port Vell", km: 23.74 },
];
const ids = (list: Spot[]) => list.map((s) => s.id);

// Check "Spots werden wirklich passiert" (docs/VISION.md).
describe("createSpotTracker", () => {
  it("fires exactly when the runner reaches the spot km, not before", () => {
    const t = createSpotTracker();
    expect(t.update(13.0, spots)).toEqual([]);
    expect(t.update(13.895, spots)).toEqual([]);
    expect(t.passed("a")).toBe(false);
    expect(ids(t.update(13.896, spots))).toEqual(["a"]);
    expect(t.passed("a")).toBe(true);
  });

  it("fires every spot only once, also when the km jitters backwards", () => {
    const t = createSpotTracker();
    expect(ids(t.update(14, spots))).toEqual(["a"]);
    expect(t.update(14.2, spots)).toEqual([]);
    expect(t.update(13.5, spots)).toEqual([]); // estimate falls back behind the spot
    expect(t.passed("a")).toBe(true);
    expect(t.update(14.5, spots)).toEqual([]);
  });

  it("gives all spots in course order when fast forward jumps over several", () => {
    const t = createSpotTracker();
    t.update(1, spots);
    expect(ids(t.update(41, spots))).toEqual(["a", "b", "c"]);
    expect(t.update(42.195, spots)).toEqual([]);
  });

  it("counts spots behind the start position as passed, without an event", () => {
    const t = createSpotTracker(20);
    expect(t.update(20, spots)).toEqual([]);
    expect(t.passed("a")).toBe(true);
    expect(t.passed("b")).toBe(false);
    expect(ids(t.update(24, spots))).toEqual(["b"]);
  });

  it("takes a spot that is added behind the runner as passed, one added ahead fires later", () => {
    const t = createSpotTracker();
    t.update(25, spots.slice(0, 1));
    const behind = { id: "x", name: "Arc de Triomf", km: 10 };
    const ahead = { id: "y", name: "Ziel", km: 42 };
    expect(t.update(25.1, [...spots, behind, ahead])).toEqual([]);
    expect(t.passed("x")).toBe(true);
    expect(t.passed("a")).toBe(true);
    expect(ids(t.update(42, [...spots, behind, ahead]))).toEqual(["c", "y"]);
  });

  it("arms the spots ahead again after a jump back, without events for the ones behind", () => {
    const t = createSpotTracker();
    t.update(41, spots);
    t.reset(20);
    expect(t.update(20, spots)).toEqual([]);
    expect(t.passed("a")).toBe(true);
    expect(t.passed("b")).toBe(false);
    expect(ids(t.update(31, spots))).toEqual(["b", "c"]);
  });

  it("forgets spots that were removed", () => {
    const t = createSpotTracker();
    t.update(41, spots);
    t.update(41, spots.slice(0, 1));
    expect(t.passed("a")).toBe(false);
  });
});
