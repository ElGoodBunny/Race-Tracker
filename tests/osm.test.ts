import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import type { LatLng } from "../src/lib/course";
import { makeLocal } from "../src/lib/view3d/world";
import { buildingHeight, dedupeElements, joinRings, osmToScene, overpassQueries, overpassTimedOut, routeBounds, splitBounds, type OverpassElement } from "../src/lib/osm";

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
    expect(scene.water[0].holes).toBeUndefined();
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

  it("splits buildings, parks, water, trees and coastline into separate queries with timeout 180", () => {
    const qs = overpassQueries(routeBounds(route, 600));
    expect(qs.map((q) => q.category)).toEqual(["buildings", "parks", "water", "trees", "coastline"]);
    for (const key of ['"building"', '"leisure"', '"natural"="water"', '"natural"="tree"', '"natural"="coastline"']) {
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

// Multipolygons: OSM splits long outlines into several ways that only form a ring when joined.
type P = { lat: number; lon: number };
const pt = (lat: number, lon: number): P => ({ lat, lon });
const way = (role: string, geometry: P[]) => ({ type: "way", role, geometry });
const closed = (r: number[]) => r[0] === r[r.length - 2] && r[1] === r[r.length - 1];
// A square of side d (degrees) at lat/lon, as four corner points, counter-clockwise.
const corners = (lat: number, lon: number, d: number) => [pt(lat, lon), pt(lat, lon + d), pt(lat + d, lon + d), pt(lat + d, lon)];

describe("joinRings", () => {
  const [a, b, c, d] = corners(53.54, 9.96, 0.01);

  it("joins segments out of order and reversed into one closed ring", () => {
    const { rings, open } = joinRings([[c, d], [a, b], [d, a], [c, b]]); // [c, b] runs against the others
    expect(open).toBe(0);
    expect(rings).toHaveLength(1);
    expect(rings[0]).toHaveLength(5);
    expect(rings[0][0]).toEqual(rings[0][4]);
  });

  it("keeps rings that are already closed", () => {
    const { rings, open } = joinRings([[a, b, c, d, a]]);
    expect(open).toBe(0);
    expect(rings).toEqual([[a, b, c, d, a]]);
  });

  it("reports segments that never close", () => {
    const { rings, open } = joinRings([[a, b], [b, c], [c, d]]);
    expect(rings).toEqual([]);
    expect(open).toBe(1);
  });
});

describe("osmToScene multipolygons", () => {
  const route: LatLng[] = [[53.545, 9.96], [53.545, 9.99]];
  // Lake of about 1.3 x 1.1 km, outline in three ways (one reversed), island of about 130 x 110 m in two ways.
  const [la, lb, lc, ld] = corners(53.54, 9.96, 0.01);
  const lm = pt(53.54, 9.965);
  const [ia, ib, ic, id] = corners(53.544, 9.964, 0.001);
  // Second lake further east with its own island.
  const [ma, mb, mc, md] = corners(53.54, 9.98, 0.01);
  const [ja, jb, jc, jd] = corners(53.544, 9.984, 0.001);
  // Courtyard block of about 66 x 55 m with a 26 x 22 m yard, and a 4 x 4 m light well that is too small to keep.
  const [ba, bb, bc, bd] = corners(53.5452, 9.97, 0.0005);
  const [ha, hb, hc, hd] = corners(53.5453, 9.9701, 0.0002);
  const [sa, sb, sc, sd] = corners(53.54565, 9.97035, 0.00004);

  const warnings: string[] = [];
  const scene = osmToScene(
    [
      {
        type: "relation", id: 10, tags: { natural: "water", type: "multipolygon" },
        members: [way("outer", [lb, lc, ld]), way("outer", [lm, la].reverse()), way("outer", [ld, la]), way("outer", [lm, lb]), way("inner", [ia, ib, ic]), way("inner", [ic, id, ia])],
      },
      {
        type: "relation", id: 11, tags: { natural: "water", type: "multipolygon" },
        members: [way("outer", [ma, mb, mc, md, ma]), way("outer", [la, lb, lc, ld, la].map((p) => pt(p.lat + 0.03, p.lon))), way("inner", [ja, jb, jc, jd, ja])],
      },
      {
        type: "relation", id: 12, tags: { building: "apartments", "building:levels": "5", type: "multipolygon" },
        members: [way("outer", [ba, bb, bc]), way("outer", [bc, bd, ba]), way("inner", [ha, hb, hc, hd, ha]), way("inner", [sa, sb, sc, sd, sa])],
      },
      {
        type: "relation", id: 13, tags: { natural: "water", type: "multipolygon" },
        members: [way("outer", [ma, mb]), way("outer", [mc, md])],
      },
    ] as OverpassElement[],
    route,
    600,
    (msg) => warnings.push(msg),
  );

  it("joins an outline made of several ways into one area with its island", () => {
    const lake = scene.water[0]; // relation 10 comes first
    expect(scene.water).toHaveLength(3);
    expect(closed(lake.ring)).toBe(true);
    expect(lake.ring).toHaveLength(12); // a, m, b, c, d and the closing point: 6 points
    expect(lake.holes).toHaveLength(1);
    expect(closed(lake.holes![0])).toBe(true);
    expect(lake.holes![0]).toHaveLength(10);
  });

  it("puts each island into the outline that contains it", () => {
    const withHole = scene.water.filter((w) => w.holes?.length);
    expect(withHole).toHaveLength(2);
    const east = withHole.find((w) => w.ring.some((v, i) => i % 2 === 0 && v > 1000))!;
    const holeX = east.holes![0][0];
    expect(holeX).toBeGreaterThan(1000); // island at 9.984 belongs to the lake at 9.98, not the one at 9.96
    const third = scene.water.find((w) => !w.holes);
    expect(third).toBeDefined(); // the outline without island has no holes field
  });

  it("keeps courtyards of buildings and drops holes under 30 square metres", () => {
    expect(scene.buildings).toHaveLength(1);
    expect(scene.buildings[0].holes).toHaveLength(1);
    expect(scene.buildings[0].h).toBeCloseTo(17.5);
  });

  it("drops outlines that do not close and reports them", () => {
    expect(warnings.some((w) => w.includes("13"))).toBe(true);
    expect(scene.water.every((w) => closed(w.ring))).toBe(true);
  });
});

describe("osmToScene coastline", () => {
  // Box of routeBounds(route, 600) around a 660 m route: about 53.5446 to 53.5554 and 9.951 to 9.979.
  const coast = (id: number, geometry: P[]) => ({ type: "way", id, tags: { natural: "coastline" }, geometry }) as OverpassElement;
  const local = makeLocal(route[0]);
  const inside = (r: number[], [x, y]: number[]) => {
    let hit = false;
    for (let i = 0, j = r.length - 2; i < r.length; j = i, i += 2) {
      if (r[i + 1] > y !== r[j + 1] > y && x < ((r[j] - r[i]) * (y - r[i + 1])) / (r[j + 1] - r[i + 1]) + r[i]) hit = !hit;
    }
    return hit;
  };
  const isWater = (scene: ReturnType<typeof osmToScene>, lat: number, lon: number) => {
    const p = local.toXY(lat, lon);
    return scene.water.some((w) => inside(w.ring, p) && !(w.holes ?? []).some((h) => inside(h, p)));
  };

  it("fills the sea on the right of the coastline, clipped to the box, from ways out of order", () => {
    // Coast runs west to east across the box, land on the left (north), split into two ways.
    const scene = osmToScene([coast(2, [pt(53.552, 9.965), pt(53.552, 9.99)]), coast(1, [pt(53.552, 9.94), pt(53.552, 9.965)])], route, 600);
    expect(scene.water).toHaveLength(1);
    expect(closed(scene.water[0].ring)).toBe(true);
    expect(isWater(scene, 53.546, 9.955)).toBe(true);
    expect(isWater(scene, 53.546, 9.975)).toBe(true);
    expect(isWater(scene, 53.554, 9.965)).toBe(false);
    const ys = scene.water[0].ring.filter((_, i) => i % 2 === 1);
    expect(Math.min(...ys)).toBeCloseTo(local.toXY(routeBounds(route, 600).s, 9.96)[1], 0); // clipped, not the whole way
  });

  it("closes along the box edge round the corner the sea is in", () => {
    // Coast enters at the bottom and leaves at the right, land north-west, sea in the south-east corner.
    const scene = osmToScene([coast(1, [pt(53.540, 9.970), pt(53.560, 9.990)])], route, 600);
    expect(isWater(scene, 53.546, 9.977)).toBe(true);
    expect(isWater(scene, 53.553, 9.975)).toBe(false);
    expect(isWater(scene, 53.546, 9.955)).toBe(false);
  });

  it("makes a coast ring inside the box an island in the sea", () => {
    const [a, b, c, d] = corners(53.546, 9.962, 0.001); // counter-clockwise, land on the left
    const scene = osmToScene([coast(1, [pt(53.552, 9.94), pt(53.552, 9.99)]), coast(2, [a, b, c, d, a])], route, 600);
    expect(scene.water).toHaveLength(1);
    expect(scene.water[0].holes).toHaveLength(1);
    expect(isWater(scene, 53.5465, 9.9625)).toBe(false);
    expect(isWater(scene, 53.5465, 9.958)).toBe(true);
  });

  it("reports a coast that ends inside the box and adds no sea for it", () => {
    const warnings: string[] = [];
    const scene = osmToScene([coast(7, [pt(53.552, 9.94), pt(53.552, 9.965)])], route, 600, (m) => warnings.push(m));
    expect(scene.water).toEqual([]);
    expect(warnings.some((w) => w.includes("coastline") && w.includes("7"))).toBe(true);
  });
});

describe("osmToScene building relations without outer", () => {
  const near: LatLng[] = [[41.4105, 2.1785], [41.4105, 2.1795]];

  it("takes members with an empty role as the outline (relation 20197870, Barcelona)", () => {
    const rel = JSON.parse(readFileSync("tests/fixtures/osm-relation-20197870.json", "utf8")) as OverpassElement;
    const warnings: string[] = [];
    const scene = osmToScene([rel], near, 600, (m) => warnings.push(m));
    expect(scene.buildings).toHaveLength(1);
    expect(scene.buildings[0].ring).toHaveLength(22); // 11 points, closed
    expect(warnings).toEqual([]);
  });

  it("reports a relation that still has no outline, with its id", () => {
    const warnings: string[] = [];
    const rel = { type: "relation", id: 4259123, tags: { building: "yes", type: "building" }, members: [way("part", square(41.4105, 2.179))] } as OverpassElement;
    const scene = osmToScene([rel], near, 600, (m) => warnings.push(m));
    expect(scene.buildings).toEqual([]);
    expect(warnings).toEqual(["relation 4259123: no outer ring, dropped"]);
  });

  it("drops ways that do not close and reports them with their id", () => {
    const warnings: string[] = [];
    const open = { type: "way", id: 77, tags: { landuse: "grass" }, geometry: square(41.4105, 2.179).slice(0, 4) } as OverpassElement;
    const scene = osmToScene([open], near, 600, (m) => warnings.push(m));
    expect(scene.parks).toEqual([]);
    expect(warnings).toEqual(["way 77: open ring dropped"]);
  });
});
