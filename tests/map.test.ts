// Live layer of the SVG map, the fallback without 3D (docs/tasks/034-claude-karte.md).
import { describe, expect, it } from "vitest";
import { doneRoute } from "../src/lib/live/map";
import type { CourseData } from "../src/lib/course";

const course: CourseData = {
  route: [
    [0, 0],
    [0, 1],
    [1, 1],
  ],
  km: [0, 10, 20],
  landmarks: [],
  bounds: { w: 0, e: 1, n: 1, s: 0 },
};

describe("doneRoute", () => {
  it("is empty before the start", () => {
    expect(doneRoute(course, 0)).toEqual([]);
    expect(doneRoute(course, -1)).toEqual([]);
  });
  it("runs through every passed point and ends at the runner", () => {
    expect(doneRoute(course, 5)).toEqual([
      [0, 0],
      [0, 0.5],
    ]);
    expect(doneRoute(course, 15)).toEqual([
      [0, 0],
      [0, 1],
      [0.5, 1],
    ]);
  });
  it("is the whole route at the finish and beyond", () => {
    expect(doneRoute(course, 20)).toEqual(course.route);
    expect(doneRoute(course, 25)).toEqual(course.route);
  });
});
