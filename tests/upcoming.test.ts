import { describe, expect, it } from "vitest";
import { createSpotTracker, type Spot } from "../src/lib/live/events";
import { upcomingSpots, type UpcomingSpot } from "../src/lib/live/upcoming";

const spots: Spot[] = [
  { id: "c", name: "Fòrum", km: 30.585 },
  { id: "a", name: "Sagrada Família", km: 13.896 },
  { id: "b", name: "Port Vell", km: 23.74 },
];
const ids = (list: UpcomingSpot[]) => list.map((u) => u.spot.id);
const none = () => false;

// List "Als Nächstes" (docs/tasks/001-claude-als-naechstes.md).
describe("upcomingSpots", () => {
  it("leaves out passed spots, also when the runner is behind them again after a jump back", () => {
    const passed = (id: string) => id === "a";
    expect(ids(upcomingSpots(13.5, 300, spots, passed))).toEqual(["b", "c"]);
  });

  it("keeps a spot behind the runner that is not passed, with distance 0 and eta 0", () => {
    const [first] = upcomingSpots(15, 300, spots, none);
    expect(first.spot.id).toBe("a");
    expect(first.distKm).toBe(0);
    expect(first.etaSec).toBe(0);
  });

  it("sorts by km, spots on the same km keep the input order", () => {
    const same = [...spots, { id: "d", name: "Arc de Triomf", km: 13.896 }];
    expect(ids(upcomingSpots(0, 300, same, none, 10))).toEqual(["a", "d", "b", "c"]);
  });

  it("gives at most limit entries, 3 by default, none for limit 0", () => {
    const more = [...spots, { id: "e", name: "Ziel", km: 42.195 }];
    expect(ids(upcomingSpots(0, 300, more, none))).toEqual(["a", "b", "c"]);
    expect(ids(upcomingSpots(0, 300, more, none, 2))).toEqual(["a", "b"]);
    expect(upcomingSpots(0, 300, more, none, 0)).toEqual([]);
  });

  it("computes the eta from distance and pace, none without a pace", () => {
    const spot = [{ id: "x", name: "Arc de Triomf", km: 12.5 }];
    expect(upcomingSpots(10, 300, spot, none)[0]).toEqual({ spot: spot[0], distKm: 2.5, etaSec: 750 });
    expect(upcomingSpots(10, null, spot, none)[0].etaSec).toBeNull();
    expect(upcomingSpots(10, 0, spot, none)[0].etaSec).toBeNull();
  });

  it("gives an empty list without spots", () => {
    expect(upcomingSpots(10, 300, [], none)).toEqual([]);
  });

  it("does not change the input", () => {
    const input = [...spots];
    upcomingSpots(0, 300, input, none);
    expect(input).toEqual(spots);
    input.forEach((s, i) => expect(s).toBe(spots[i]));
  });

  it("takes passed from the real spot tracker", () => {
    const t = createSpotTracker();
    const list = [...spots, { id: "s", name: "Start", km: 0.5 }, { id: "f", name: "Pl. Espanya", km: 5 }];
    for (let km = 0; km <= 5; km += 0.25) t.update(km, list);
    const next = upcomingSpots(5, 300, list, t.passed, 10);
    expect(ids(next)).toEqual(["a", "b", "c"]);
    expect(next.every((u) => u.spot.km > 5)).toBe(true);
  });
});
