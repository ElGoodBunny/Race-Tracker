import { describe, expect, it } from "vitest";
import { LABEL_GAP_PX, placeLabels, type LabelBox } from "../src/lib/view3d/labels";

// A label of 100 × 20 px whose anchor (bottom centre, LABEL_GAP_PX below the box) is at x, y.
const box = (id: string, x: number, y: number, priority: number, w = 100, h = 20): LabelBox => ({ id, x, y, w, h, priority });

describe("placeLabels", () => {
  it("shows labels that do not touch", () => {
    expect(placeLabels([box("a", 100, 100, 1), box("b", 300, 100, 0)], 800, 600, 12)).toEqual(new Set(["a", "b"]));
  });

  it("hides the lower priority of two overlapping labels, whatever the order", () => {
    expect(placeLabels([box("spot", 150, 105, 1), box("runner", 100, 100, 9)], 800, 600, 12)).toEqual(new Set(["runner"]));
    expect(placeLabels([box("runner", 100, 100, 9), box("spot", 150, 105, 1)], 800, 600, 12)).toEqual(new Set(["runner"]));
  });

  it("counts the gap: boxes stacked exactly on top of each other do not overlap", () => {
    // b's box ends where a's box starts.
    const a = box("a", 100, 100, 1);
    const b = box("b", 100, 100 - 20, 0);
    expect(placeLabels([a, b], 800, 600, 12)).toEqual(new Set(["a", "b"]));
    expect(placeLabels([a, { ...b, y: b.y + 1 }], 800, 600, 12)).toEqual(new Set(["a"]));
  });

  it("hides labels whose anchor is outside the view", () => {
    const shown = placeLabels([box("left", -1, 100, 1), box("below", 100, 601, 1), box("in", 400, 300, 1)], 800, 600, 12);
    expect(shown).toEqual(new Set(["in"]));
  });

  it("keeps a label whose box sticks out at the top, as long as the anchor is inside", () => {
    expect(placeLabels([box("top", 400, 10 + LABEL_GAP_PX, 1)], 800, 600, 12)).toEqual(new Set(["top"]));
  });

  it("shows at most max labels, the highest priorities first", () => {
    const many = Array.from({ length: 20 }, (_, i) => box(`s${i}`, 60 + (i % 5) * 150, 60 + Math.floor(i / 5) * 100, i));
    const shown = placeLabels(many, 800, 600, 8);
    expect(shown.size).toBe(8);
    expect([...shown].sort()).toEqual(["s12", "s13", "s14", "s15", "s16", "s17", "s18", "s19"]);
  });
});
