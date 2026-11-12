import { describe, expect, it } from "vitest";
import type { LatLng } from "../src/lib/course";
import { buildingHeight, dedupeElements, osmToScene, overpassQueries, overpassTimedOut, routeBounds, splitBounds, type OverpassElement } from "../src/lib/osm";

const route: LatLng[] = [[53.55, 9.96], [53.55, 9.97]]; // ~660 m west to east
const square = (lat: number, lon: number, d = 0.0001) => [
  { lat, lon }, { lat, lon: lon + d }, { lat: lat + d, lon: lon + d }, { lat: lat + d, lon }, { lat, lon },
];

describe("buildingHeight", () => {
  it("prefers height, then levels, then type", () => {
    expect(buildingHeight({ building: "yes", height: "21.5" })).toBe(21.5);
    expect(buildingHeight({ building: "yes", "building:levels": "5" })).toBeCloseTo(17.5);
    expect(buildingHeight({ building: "house" })).toBe(7);
    expect(buildingHeight({ building: "yes", height: "garbage" })).toBe(14);
  });
});

describe("osmToScene", () => {
  const els: OverpassElement[] = [
    { type: "way", id: 1, tags: { building: "yes", "building:levels": "4" }, geometry: square(53.5502, 9.965) }, // ~20 m from route
    { type: "way", id: 2, tags: { building: "yes" }, geometry: square(53.56, 9.965) }, // ~1.1 km away
    { type: "relation", id: 3, tags: { building: "yes" }, members: [{ type: "way", role: "outer", geometry: square(53.5495, 9.962) }] },
    { type: "way", id: 4, tags: { natural: "water" }, geometry: square(53.54, 9.96, 0.01) },
    { type: "way", id: 5, tags: { leisure: "park" }, geometry: square(53.5505, 9.968, 0.001) },
    { type: "node", id: 6, tags: { natural: "tree" }, lat: 53.5501, lon: 9.961 },
  ];
  const scene = osmToScene(els, route, 300);

  it("keeps buildings inside the corridor only, including multipolygons", () => {
    expect(scene.buildings).toHaveLength(2);
    expect(scene.buildings[0].h).toBeCloseTo(14.5);
  });

  it("stores local metres around the start, x east and y north", () => {
    const [x, y] = scene.buildings[0].ring;
    expect(x).toBeGreaterThan(300); // 9.965 is ~330 m east of 9.96
    expect(y).toBeGreaterThan(15);
    expect(scene.origin).toEqual(route[0]);
  });

  it("keeps water whole and collects parks and trees", () => {
    expect(scene.water).toHaveLength(1);
    expect(scene.parks).toHaveLength(1);
    expect(scene.trees).toHaveLength(2);
  });
});

describe("overpassQueries", () => {
  it("uses the buffered route bounds", () => {
    const b = routeBounds(route, 600);
    expect(b.s).toBeLessThan(53.55);
    expect(b.e).toBeGreaterThan(9.97);
    for (const q of overpassQueries(b)) expect(q.query).toContain(`${b.s},${b.w},${b.n},${b.e}`);
  });

  it("splits buildings, parks, water and trees into separate queries with timeout 180", () => {
    const qs = overpassQueries(routeBounds(route, 600));
    expect(qs.map((q) => q.category)).toEqual(["buildings", "parks", "water", "trees"]);
    for (const key of ['"building"', '"leisure"', '"natural"="water"', '"natural"="tree"']) {
      expect(qs.filter((q) => q.query.includes(key))).toHaveLength(1);
    }
    for (const q of qs) expect(q.query).toContain("[timeout:180]");
  });
});

describe("splitBounds", () => {
  it("covers the box with 2 x 2 tiles without gaps", () => {
    const b = { s: 50, w: 8, n: 52, e: 12 };
    const tiles = splitBounds(b);
    expect(tiles).toHaveLength(4);
    expect(tiles).toContainEqual({ s: 50, w: 8, n: 51, e: 10 });
    expect(tiles).toContainEqual({ s: 51, w: 10, n: 52, e: 12 });
    expect(Math.min(...tiles.map((t) => t.s))).toBe(50);
    expect(Math.max(...tiles.map((t) => t.e))).toBe(12);
  });
});

describe("dedupeElements", () => {
  it("drops repeated type and id, keeps same id with different type", () => {
    const els: OverpassElement[] = [
      { type: "way", id: 1, tags: { building: "yes" } },
      { type: "way", id: 1, tags: { building: "yes" } },
      { type: "relation", id: 1 },
      { type: "node", id: 2 },
    ];
    expect(dedupeElements(els).map((e) => `${e.type}/${e.id}`)).toEqual(["way/1", "relation/1", "node/2"]);
  });
});

describe("overpassTimedOut", () => {
  it("detects the timeout remark Overpass sends with HTTP 200", () => {
    expect(overpassTimedOut({ remark: "runtime error: Query timed out in \"query\" at line 3 after 181 seconds." })).toBe(true);
    expect(overpassTimedOut({})).toBe(false);
    expect(overpassTimedOut({ remark: "" })).toBe(false);
  });
});
