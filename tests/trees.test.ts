import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { unpackScene } from "../src/lib/osm";
import { TREE_MAX, TREE_RADIUS_M, nearestTrees, treeGrid, treeLook } from "../src/lib/view3d/geometry";
import { makeLocal, makeTrack } from "../src/lib/view3d/world";

/** All trees within r of (x, y), nearest first, by looking at every one. */
function bruteForce(trees: number[], x: number, y: number, r: number): number[] {
  const near: [number, number, number][] = [];
  for (let i = 0; i < trees.length; i += 2) {
    const d = Math.hypot(trees[i] - x, trees[i + 1] - y);
    if (d <= r) near.push([d, trees[i], trees[i + 1]]);
  }
  return near.sort((a, b) => a[0] - b[0]).flatMap(([, tx, ty]) => [tx, ty]);
}

describe("nearestTrees", () => {
  // 400 trees on a 0.5 m grid between -500 and 500 m, from a fixed pseudo random sequence.
  let seed = 7;
  const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647) * 1000 - 500;
  const trees = Array.from({ length: 800 }, () => Math.round(rand() * 2) / 2);
  const grid = treeGrid(trees);

  it("finds the same trees as looking at every one, nearest first", () => {
    for (const [x, y, r] of [[0, 0, 150], [-480, 320, 90], [123.5, -77, 400], [600, 600, 50]]) {
      expect(nearestTrees(grid, x, y, r, 10_000)).toEqual(bruteForce(trees, x, y, r));
    }
  });

  it("keeps only the nearest when there are more than max", () => {
    const all = bruteForce(trees, 0, 0, 300);
    expect(all.length / 2).toBeGreaterThan(20);
    expect(nearestTrees(grid, 0, 0, 300, 20)).toEqual(all.slice(0, 40));
  });

  it("returns nothing far away from all trees", () => {
    expect(nearestTrees(grid, 5000, 5000, 400, 100)).toEqual([]);
  });
});

describe("treeLook", () => {
  it("gives every tree its own size, turn and shade, the same on every call", () => {
    const a = treeLook(12.5, -40);
    expect(treeLook(12.5, -40)).toEqual(a);
    expect(treeLook(13, -40)).not.toEqual(a);
    for (let i = 0; i < 500; i++) {
      const l = treeLook(i * 3.5, -i * 7);
      expect(l.scale).toBeGreaterThanOrEqual(0.8);
      expect(l.scale).toBeLessThan(1.3);
      expect(l.turn).toBeGreaterThanOrEqual(0);
      expect(l.turn).toBeLessThan(2 * Math.PI);
      expect(l.shade).toBeGreaterThanOrEqual(0.85);
      expect(l.shade).toBeLessThan(1.05);
    }
  });
});

describe("trees along the Barcelona course (step 6 budget)", () => {
  const race = JSON.parse(readFileSync("src/content/races/barcelona-2027.json", "utf8"));
  const scene = unpackScene(
    JSON.parse(readFileSync("public/data/barcelona-2027/scene.json", "utf8")),
    JSON.parse(readFileSync("public/data/barcelona-2027/trees.json", "utf8")),
  );
  const track = makeTrack(race.course, makeLocal(scene.origin));
  const grid = treeGrid(scene.trees);
  const last = race.course.km[race.course.km.length - 1];

  it("never draws more than TREE_MAX trees and still shows trees on most of the course", () => {
    const counts: number[] = [];
    for (let km = 0; km <= last; km += 0.1) {
      const p = track.at(km);
      counts.push(nearestTrees(grid, p.x, p.y, TREE_RADIUS_M, TREE_MAX).length / 2);
    }
    expect(Math.max(...counts)).toBeLessThanOrEqual(TREE_MAX);
    // Measured: about 2,100 trees within 400 m at the densest point, so the cap is reached somewhere.
    expect(Math.max(...counts)).toBe(TREE_MAX);
    expect(counts.filter((n) => n > 100).length).toBeGreaterThan(0.9 * counts.length);
  });
});
