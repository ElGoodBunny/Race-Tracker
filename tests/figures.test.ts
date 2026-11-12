import { readFileSync } from "node:fs";
import { Box3, Color, Mesh, type Material, type Object3D } from "three";
import { describe, expect, it } from "vitest";
import { createConfetti, createPin, createRunner, createSpectator, figurePalette, pinProfile, runPose, type FigurePalette } from "../src/lib/figures";

// Token values straight from tokens.css, so the test breaks when the design system changes.
const css = readFileSync("src/styles/tokens.css", "utf8");
function tokens(block: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const m of block.matchAll(/--([a-z0-9-]+):\s*(#[0-9A-Fa-f]{6})/g)) out[m[1]] = m[2];
  return out;
}
const light = tokens(css.slice(css.indexOf(":root{"), css.indexOf("/* dark")));
const dark = tokens(css.slice(css.indexOf(':root[data-theme="dark"]{')));

function meshColors(root: Object3D): string[] {
  const out: string[] = [];
  root.traverse((o) => {
    if (o instanceof Mesh) out.push(`#${((o.material as Material & { color: Color }).color).getHexString().toUpperCase()}`);
  });
  return out;
}
const values = (p: FigurePalette) => [...Object.values(p).flat()].map((c) => c.toUpperCase());

describe("figurePalette", () => {
  it("uses only token colors in dark mode", () => {
    const allowed = Object.values(dark).map((c) => c.toUpperCase());
    for (const c of values(figurePalette(dark, true))) expect(allowed).toContain(c);
  });

  it("uses only token colors in light mode too", () => {
    const allowed = Object.values(light).map((c) => c.toUpperCase());
    for (const c of values(figurePalette(light, false))) expect(allowed).toContain(c);
  });

  it("makes the runner stand out: dark shirt in light mode, light shirt in dark mode, bib inverted", () => {
    const l = figurePalette(light, false), d = figurePalette(dark, true);
    expect([l.shirt, l.bib, l.bibInk]).toEqual(["#111111", "#FFFFFF", "#111111"]);
    expect([d.shirt, d.bib, d.bibInk]).toEqual(["#EDEDED", "#000000", "#EDEDED"]);
    expect(l.ring).toBe(light["signal"]);
    expect(d.ring).toBe(dark["signal"]);
  });

  it("takes skin and hair from the figure tokens", () => {
    expect(figurePalette(dark, true).skin).toEqual([1, 2, 3].map((i) => dark[`figure-skin-${i}`]));
    expect(figurePalette(light, false).hair).toEqual([1, 2, 3].map((i) => light[`figure-hair-${i}`]));
  });

  it("takes the six pin colors from the flag tokens", () => {
    expect(figurePalette(light, false).flags).toEqual([1, 2, 3, 4, 5, 6].map((i) => light[`flag-${i}`]));
  });
});

describe("figures", () => {
  const p = figurePalette(dark, true);
  const allowed = values(p);

  it("builds runner, spectators and pins from palette colors only", () => {
    const parts = [
      createRunner(p).group,
      ...([0, 1, 2] as const).map((style) => createSpectator(p, { shirt: p.flags[style], skin: p.skin[style], hair: p.hair[style], style }).group),
      createPin(p.flags[0]),
    ];
    for (const part of parts) {
      const colors = meshColors(part);
      expect(colors.length).toBeGreaterThan(0);
      for (const c of colors) expect(allowed).toContain(c);
    }
  });

  it("stands the runner on the ground, about 36 units tall like the legacy figure", () => {
    const box = new Box3().setFromObject(createRunner(p).group);
    expect(box.min.y).toBeGreaterThanOrEqual(-0.5);
    expect(box.max.y).toBeGreaterThan(34);
    expect(box.max.y).toBeLessThan(42);
  });
});

describe("runner ring", () => {
  const ringOf = (r: ReturnType<typeof createRunner>) => r.group.children.find((o) => o.name === "pulse") as Mesh;

  it("grows and fades over one pulse of 1.4 s, then starts again", () => {
    const r = createRunner(figurePalette(light, false));
    const ring = ringOf(r), mat = ring.material as Material;
    r.pulse(0, true);
    expect(ring.scale.x).toBeCloseTo(1);
    expect(mat.opacity).toBeCloseTo(0.7);
    r.pulse(0.7, true);
    expect(ring.scale.x).toBeCloseTo(1.7);
    expect(mat.opacity).toBeCloseTo(0.35);
    r.pulse(1.4, true);
    expect(ring.scale.x).toBeCloseTo(1);
  });

  it("holds still with reduced motion", () => {
    const r = createRunner(figurePalette(light, false));
    r.pulse(0.2, false);
    const a = ringOf(r).scale.x;
    r.pulse(0.9, false);
    expect(ringOf(r).scale.x).toBe(a);
  });
});

describe("runPose", () => {
  it("swings legs against each other and arms against legs", () => {
    const pose = runPose(Math.PI / 2, 1);
    expect(pose.thighL).toBeGreaterThan(0.5);
    expect(pose.thighR).toBeCloseTo(-pose.thighL);
    expect(Math.sign(pose.armL)).toBe(-Math.sign(pose.thighL));
    expect(Math.sign(pose.armR)).toBe(-Math.sign(pose.thighR));
  });

  it("stands still at speed 0", () => {
    const pose = runPose(1.3, 0);
    expect(pose.thighL).toBeCloseTo(0);
    expect(pose.armL).toBeCloseTo(0);
    expect(pose.bob).toBeCloseTo(0);
  });

  it("never bends a knee forward", () => {
    for (let ph = 0; ph < Math.PI * 2; ph += 0.1) {
      const pose = runPose(ph, 1);
      expect(pose.kneeL).toBeLessThanOrEqual(0);
      expect(pose.kneeR).toBeLessThanOrEqual(0);
    }
  });
});

describe("pinProfile", () => {
  it("starts at the tip on the ground and closes at the top of the balloon", () => {
    const pts = pinProfile();
    expect(pts[0]).toEqual([0, 0]);
    expect(pts.at(-1)![0]).toBeCloseTo(0);
    expect(Math.max(...pts.map((q) => q[0]))).toBeGreaterThan(8);
    for (let i = 1; i < pts.length; i++) expect(pts[i][1]).toBeGreaterThan(pts[i - 1][1]);
  });
});

describe("confetti", () => {
  it("launches pieces on burst and removes them when their life is over", () => {
    const c = createConfetti(figurePalette(light, false).flags);
    expect(c.active()).toBe(0);
    c.burst(0, 40, 0);
    expect(c.active()).toBe(140);
    c.step(0.5);
    expect(c.active()).toBe(140);
    c.step(5);
    expect(c.active()).toBe(0);
  });

  it("never holds more pieces than the instanced mesh has slots", () => {
    const c = createConfetti(figurePalette(light, false).flags);
    for (let i = 0; i < 5; i++) c.burst(0, 40, 0);
    expect(c.active()).toBe(c.mesh.count);
  });
});
