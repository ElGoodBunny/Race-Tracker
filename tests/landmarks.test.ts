import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import type { SceneData } from "../src/lib/osm";
import { makeLocal } from "../src/lib/view3d/world";

// Check "Gebäude sind aus OSM" (docs/VISION.md): the buildings stand where OSM has them and differ in height.
// Positions are the centres of the OSM ways from the Overpass cache of 13.11.2026.
const scene: SceneData = JSON.parse(readFileSync("public/data/hamburg-2026/scene.json", "utf8"));
const local = makeLocal(scene.origin);

function inside(ring: number[], x: number, y: number) {
  let c = false;
  for (let i = 0; i + 3 < ring.length; i += 2) {
    const [x1, y1, x2, y2] = [ring[i], ring[i + 1], ring[i + 2], ring[i + 3]];
    if (y1 > y !== y2 > y && x < ((x2 - x1) * (y - y1)) / (y2 - y1) + x1) c = !c;
  }
  return c;
}
const heightAt = (lat: number, lng: number) => {
  const [x, y] = local.toXY(lat, lng);
  return scene.buildings.filter((b) => inside(b.ring, x, y)).map((b) => b.h);
};

describe("hamburg-2026 buildings from OSM", () => {
  it("has the Elbphilharmonie with its 110 m (way 24981342)", () => {
    expect(heightAt(53.54144, 9.98424)).toEqual([110]);
  });

  it("has the Hauptbahnhof from its 3 levels (way 137538320)", () => {
    expect(heightAt(53.55312, 10.00673)).toEqual([11]);
  });

  it("has the Alsterhaus with the default height (way 39878608)", () => {
    expect(heightAt(53.55304, 9.99125)).toEqual([14]);
  });
});
