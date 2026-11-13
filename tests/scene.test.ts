import { describe, expect, it } from "vitest";
import { depthRange } from "../src/lib/view3d/scene";

describe("depthRange", () => {
  it("puts the fog at 900 to 1400 m at the follow distance of 140 m", () => {
    const r = depthRange(140);
    expect(r.fogNear).toBeCloseTo(900, 6);
    expect(r.fogFar).toBeCloseTo(1400, 6);
  });

  it("draws nothing behind the fog and sets near to a fiftieth of the distance", () => {
    for (const d of [60, 140, 400, 6000]) {
      const r = depthRange(d);
      expect(r.far).toBe(r.fogFar);
      expect(r.near).toBeCloseTo(d / 50, 6);
      expect(r.fogNear).toBeGreaterThan(d);
    }
  });
});
