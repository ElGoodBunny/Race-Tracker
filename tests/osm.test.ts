import { describe, expect, it } from "vitest";
import type { LatLng } from "../src/lib/course";
import { buildingHeight, osmToScene, overpassQuery, routeBounds, type OverpassElement } from "../src/lib/osm";

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

describe("overpassQuery", () => {
  it("uses the buffered route bounds", () => {
    const b = routeBounds(route, 600);
    expect(b.s).toBeLessThan(53.55);
    expect(b.e).toBeGreaterThan(9.97);
    expect(overpassQuery(b)).toContain(`${b.s},${b.w},${b.n},${b.e}`);
  });
});
