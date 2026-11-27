import { describe, expect, it } from "vitest";
import { DRAG_PX, createFollowGesture } from "../src/lib/view3d/gesture";

describe("createFollowGesture (step 8, two-finger zoom)", () => {
  it("fingers apart: a factor below 1 (closer), together: above 1", () => {
    const g = createFollowGesture();
    g.down(1, 100, 100);
    g.down(2, 200, 100);
    const apart = g.move(2, 300, 100);
    expect(apart).toEqual({ type: "zoom", factor: 0.5 });
    const together = g.move(2, 200, 100);
    expect(together).toEqual({ type: "zoom", factor: 2 });
  });

  it("one finger: nothing below DRAG_PX, then exactly one drag", () => {
    const g = createFollowGesture();
    g.down(1, 100, 100);
    expect(g.move(1, 100 + DRAG_PX - 1, 100)).toEqual({ type: "none" });
    expect(g.move(1, 100, 100 + DRAG_PX + 1)).toEqual({ type: "drag", id: 1 });
    expect(g.move(1, 150, 150)).toEqual({ type: "none" });
  });

  it("lets go of the fingers after a drag, so later fingers belong to the free camera", () => {
    const g = createFollowGesture();
    g.down(1, 100, 100);
    g.move(1, 100, 100 + DRAG_PX + 1);
    expect(g.active).toBe(false);
  });

  it("never a drag once two fingers were down, even when one is lifted first", () => {
    const g = createFollowGesture();
    g.down(1, 100, 100);
    g.down(2, 200, 100);
    g.up(2);
    expect(g.move(1, 300, 300)).toEqual({ type: "none" });
    expect(g.active).toBe(true);
    g.up(1);
    expect(g.active).toBe(false);
  });

  it("forgets lifted fingers: the next gesture starts fresh", () => {
    const g = createFollowGesture();
    g.down(1, 100, 100);
    g.down(2, 200, 100);
    g.up(1);
    g.up(2);
    g.down(3, 0, 0);
    expect(g.move(3, 0, DRAG_PX + 1)).toEqual({ type: "drag", id: 3 });
  });

  it("a tap without moving gives nothing", () => {
    const g = createFollowGesture();
    g.down(1, 50, 50);
    expect(g.move(1, 51, 50)).toEqual({ type: "none" });
    g.up(1);
    expect(g.active).toBe(false);
  });

  it("ignores moves of fingers it does not know and a zero spread", () => {
    const g = createFollowGesture();
    expect(g.move(9, 10, 10)).toEqual({ type: "none" });
    g.down(1, 100, 100);
    g.down(2, 100, 100);
    expect(g.move(2, 100, 100)).toEqual({ type: "none" });
  });
});
