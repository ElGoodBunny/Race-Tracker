import { describe, expect, it } from "vitest";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { packScene, unpackScene, type SceneData } from "../src/lib/osm";

// Closed rings like osmToScene writes them (last point repeats the first), on the 0.5 m grid.
const tiny: SceneData = {
  origin: [53.55, 9.96],
  buildings: [
    { ring: [0, 0, 10.5, 0, 10.5, -3, 0, 0], h: 14 },
    { ring: [-20, 5, -10, 5, -10, 15.5, -20, 15.5, -20, 5], h: 7.5, holes: [[-18, 7, -12, 7, -12, 13, -18, 7]] },
  ],
  parks: [[100, 100, 120.5, 100, 120.5, 130, 100, 100]],
  water: [{ ring: [-500, -500, 500, -500, 500, -400.5, -500, -500] }, { ring: [0, 0, 1, 0, 1, 1, 0, 0], holes: [[0.5, 0.5, 0.5, 1, 1, 1, 0.5, 0.5]] }],
  trees: [1.5, 2, -3, 4.5],
};

describe("packScene and unpackScene", () => {
  it("round trip through JSON is lossless", () => {
    const { scene, trees } = packScene(tiny);
    expect(unpackScene(JSON.parse(JSON.stringify(scene)), JSON.parse(JSON.stringify(trees)))).toEqual(tiny);
  });

  it("stores rings as integer differences in 0.5 m units, without the closing point, and the trees apart", () => {
    const { scene, trees } = packScene(tiny);
    expect(scene.format).toBe(2);
    expect(scene.buildings[0].ring).toEqual([0, 0, 21, 0, 0, -6]);
    expect(scene.buildings[1].holes).toEqual([[-36, 14, 12, 0, 0, 12]]);
    expect(scene.water[1].holes![0].every(Number.isInteger)).toBe(true);
    expect("trees" in scene).toBe(false);
    expect(trees).toEqual(tiny.trees);
    expect(unpackScene(scene).trees).toEqual([]);
  });

  it("refuses rings that are not closed or not on the 0.5 m grid", () => {
    expect(() => packScene({ ...tiny, parks: [[0, 0, 10, 0, 10, 10]] })).toThrow(/closed/);
    expect(() => packScene({ ...tiny, parks: [[0, 0, 10.25, 0, 10, 10, 0, 0]] })).toThrow(/grid/);
  });

  it("Hamburg decodes to exactly the geometry of the old scene.json (commit 882603c)", () => {
    const scene = unpackScene(
      JSON.parse(readFileSync("public/data/hamburg-2026/scene.json", "utf8")),
      JSON.parse(readFileSync("public/data/hamburg-2026/trees.json", "utf8")),
    );
    const sha = createHash("sha256").update(JSON.stringify(scene)).digest("hex");
    expect(sha).toBe("dd08e27d33b24a5d77ed81f46e5645d779da7ed079e37fe2c62e9ef088ff9bdd");
  });

  it("Hamburg on disk decodes and encodes to the same data", () => {
    const packed = JSON.parse(readFileSync("public/data/hamburg-2026/scene.json", "utf8"));
    const trees = JSON.parse(readFileSync("public/data/hamburg-2026/trees.json", "utf8"));
    const again = packScene(unpackScene(packed, trees));
    expect(again.scene).toEqual(packed);
    expect(again.trees).toEqual(trees);
  });
});
