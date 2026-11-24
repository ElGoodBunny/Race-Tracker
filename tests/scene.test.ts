import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { depthRange, ribbonInk } from "../src/lib/view3d/scene";

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

/** The route tokens of the light theme and of the dark theme, as tokens.css has them. */
function routeTokens(): Record<string, string>[] {
  const css = readFileSync(new URL("../src/styles/tokens.css", import.meta.url), "utf8");
  return [...css.matchAll(/--route:(#\w+); --route-ink:(#\w+); --route-todo:(#\w+)/g)]
    .slice(0, 2)
    .map(([, route, ink, todo]) => ({ route, "route-ink": ink, "route-todo": todo }));
}

/** WCAG contrast ratio of two hex colours. */
function contrast(a: string, b: string): number {
  const lum = (hex: string) => {
    const [r, g, bl] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
    return 0.2126 * r + 0.7152 * g + 0.0722 * bl;
  };
  const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

describe("ribbon colours", () => {
  it("reads both themes from tokens.css", () => {
    expect(routeTokens()).toHaveLength(2);
  });

  it("gives the arrows on the part already run at least 3:1 against the band, in both themes", () => {
    for (const t of routeTokens()) {
      const ink = ribbonInk(t);
      expect(ink.done.band).toBe(t.route);
      expect(contrast(ink.done.arrow, ink.done.band)).toBeGreaterThanOrEqual(3);
    }
  });

  it("keeps the arrows on the rest visible but quieter than on the part already run", () => {
    for (const t of routeTokens()) {
      const ink = ribbonInk(t);
      expect(ink.todo.band).toBe(t["route-todo"]);
      const todo = contrast(ink.todo.arrow, ink.todo.band);
      expect(todo).toBeGreaterThan(1.15);
      expect(todo).toBeLessThan(contrast(ink.done.arrow, ink.done.band));
    }
  });
});
