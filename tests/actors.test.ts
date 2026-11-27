import { readFileSync } from "node:fs";
import { InstancedMesh } from "three";
import { describe, expect, it } from "vitest";
import bcnJson from "../src/content/races/barcelona-2027.json";
import type { CourseData } from "../src/lib/course";
import { createActors, pinPosition } from "../src/lib/view3d/actors";
import type { Frame, SpotState } from "../src/lib/view3d/layer";
import { makeLocal, makeTrack, toThree } from "../src/lib/view3d/world";

const course = bcnJson.course as unknown as CourseData;
const track = makeTrack(course, makeLocal(course.route[0]));
const css = readFileSync("src/styles/tokens.css", "utf8");
const tokens: Record<string, string> = {};
for (const m of css.slice(css.indexOf(":root{"), css.indexOf("/* dark")).matchAll(/--([a-z0-9-]+):\s*(#[0-9A-Fa-f]{6})/g)) tokens[m[1]] = m[2];

const spot = (passed: boolean): SpotState => ({ id: "s", name: "Spot", km: 13.9, passed });
const frame = (spots: SpotState[], pinScale: number): Frame =>
  ({ now: 0, dt: 1 / 60, sample: null, runner: null, moving: false, spots, figureScale: 0.55, pinScale, animate: true }) as unknown as Frame;

describe("createActors, confetti (package 015)", () => {
  it("keeps the confetti at the pins' current scale after the burst, so a camera flight does not blow it up", () => {
    const actors = createActors(track);
    actors.setColors!(tokens, false);
    // Burst while the overview is on: pins are drawn large there.
    actors.frame!(frame([spot(false)], 20));
    actors.frame!(frame([spot(true)], 20));
    const confetti = actors.object!.children.find((c) => c instanceof InstancedMesh)!;
    expect(confetti.scale.x).toBe(20);
    // The camera flies into the follow mode while the pieces are still in the air.
    actors.frame!(frame([spot(true)], 0.55));
    expect(confetti.scale.x).toBe(0.55);
    // And it stays at the pin, which moves in next to the course.
    const { x, y } = pinPosition(track, 13.9, 0.55, 0.55);
    expect(confetti.position.toArray()).toEqual(toThree(x, y));
  });
});
