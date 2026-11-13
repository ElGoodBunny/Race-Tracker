import { describe, expect, it } from "vitest";
import raceJson from "../src/content/races/hamburg-2026.json";
import bcnJson from "../src/content/races/barcelona-2027.json";
import type { CourseData } from "../src/lib/course";
import {
  FIGURE_SCALE, FOLLOW_DIST_M, FOLLOW_TILT, LOOK_AHEAD_M, MAX_TURN, OVERVIEW_TILT, TRANSITION_S, angleDelta, cameraPosition, createRig,
  ease, figureScale, fitOverview, metresForPixels, mixPose, projector, turnToward, type Anchor, type Pose,
} from "../src/lib/view3d/camera";
import { headingOf, makeLocal, makeTrack, toThree } from "../src/lib/view3d/world";

const course = raceJson.course as unknown as CourseData;
const track = makeTrack(course, makeLocal(course.route[0]));
const DEG = Math.PI / 180;
const FRAME = 1 / 60;

/** What view.ts hands to the rig: the point 25 m ahead along the course and the runner's direction. */
const anchorAt = (km: number): Anchor => {
  const ahead = track.at(km + LOOK_AHEAD_M / 1000);
  return { x: ahead.x, y: ahead.y, heading: headingOf(track.at(km)) };
};
const overview: Pose = fitOverview(track.xy, 16 / 10);
const dist3 = (a: number[], b: number[]) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);

describe("ease", () => {
  it("is the design curve: starts at 0, ends at 1, rises all the way, fast at first", () => {
    expect(ease(0)).toBe(0);
    expect(ease(1)).toBe(1);
    let last = 0;
    for (let k = 0.05; k < 1; k += 0.05) {
      expect(ease(k)).toBeGreaterThan(last);
      last = ease(k);
    }
    expect(ease(0.25)).toBeGreaterThan(0.6);
  });
});

describe("angles", () => {
  it("takes the short way across ±180°", () => {
    expect(angleDelta(170 * DEG, -170 * DEG)).toBeCloseTo(20 * DEG, 9);
    expect(angleDelta(-170 * DEG, 170 * DEG)).toBeCloseTo(-20 * DEG, 9);
    expect(angleDelta(0, Math.PI)).toBeCloseTo(Math.PI, 9);
  });

  it("turns toward the target, never faster than the limit, across the wrap too", () => {
    let a = 170 * DEG;
    for (let i = 0; i < 60; i++) {
      const next = turnToward(a, -170 * DEG, FRAME);
      expect(Math.abs(angleDelta(a, next))).toBeLessThanOrEqual(MAX_TURN * FRAME + 1e-9);
      expect(angleDelta(a, next)).toBeGreaterThan(0); // the short way, through 180°
      a = next;
    }
    expect(Math.abs(angleDelta(a, -170 * DEG))).toBeLessThan(1 * DEG);
  });
});

describe("projector and cameraPosition", () => {
  const pose: Pose = { x: 100, y: 200, dist: 140, tilt: FOLLOW_TILT, heading: Math.PI / 2 };

  it("puts the camera behind and above the target", () => {
    const [x, y, up] = cameraPosition(pose);
    expect(x).toBeCloseTo(100, 6);
    expect(y).toBeCloseTo(200 - 140 * Math.cos(30 * DEG), 6); // looking north, so the camera is south
    expect(up).toBeCloseTo(70, 6);
  });

  it("projects the target to the middle, east to the right and far points up", () => {
    const project = projector(pose, 16 / 10);
    const mid = project(100, 200);
    expect(mid.x).toBeCloseTo(0, 9);
    expect(mid.y).toBeCloseTo(0, 9);
    expect(mid.depth).toBeCloseTo(140, 6);
    expect(project(130, 200).x).toBeGreaterThan(0);
    expect(project(100, 260).y).toBeGreaterThan(0);
    expect(project(100, 200, 20).y).toBeGreaterThan(0);
  });
});

describe("fitOverview", () => {
  for (const [name, aspect] of [["desktop 16:10", 16 / 10], ["phone 3:4", 3 / 4]] as const) {
    it(`shows the whole course with 8 % margin, north up, at 50° (${name})`, () => {
      for (const c of [course, bcnJson.course as unknown as CourseData]) {
        const t = makeTrack(c, makeLocal(c.route[0]));
        const pose = fitOverview(t.xy, aspect);
        expect(pose.heading).toBeCloseTo(Math.PI / 2, 9);
        expect(pose.tilt).toBe(OVERVIEW_TILT);
        const project = projector(pose, aspect);
        const reach = Math.max(...t.xy.map(([x, y]) => Math.max(Math.abs(project(x, y).x), Math.abs(project(x, y).y))));
        expect(reach).toBeCloseTo(0.92, 3);
      }
    });
  }
});

describe("figure size", () => {
  it("is 0.55 in the follow mode and keeps the runner at least 40 px tall from far away", () => {
    expect(figureScale(FOLLOW_DIST_M, 600)).toBe(FIGURE_SCALE);
    const far = figureScale(9000, 600);
    expect(far).toBeGreaterThan(FIGURE_SCALE);
    expect((38 * far) / metresForPixels(1, 9000, 600)).toBeCloseTo(40, 6);
  });
});

describe("runner direction", () => {
  it("gives the yaw that turns a figure facing +x into the direction of travel", () => {
    for (const km of [0.5, 5, 12, 17.5, 20]) {
      const p = track.at(km);
      const yaw = headingOf(p);
      // Rotation about the three.js y axis by yaw takes (1, 0, 0) to (cos, 0, -sin).
      const [x, , z] = toThree(p.dx, p.dy);
      expect(Math.cos(yaw)).toBeCloseTo(x, 9);
      expect(-Math.sin(yaw)).toBeCloseTo(z, 9);
    }
  });
});

describe("createRig, follow mode", () => {
  it("looks from 140 m and 30° at the point 25 m ahead, from behind the runner", () => {
    const rig = createRig(overview, { mode: "follow" });
    const pose = rig.step(FRAME, anchorAt(5));
    const p = track.at(5);
    expect(pose.dist).toBe(140);
    expect(pose.tilt).toBe(FOLLOW_TILT);
    expect(Math.hypot(pose.x - p.x, pose.y - p.y)).toBeCloseTo(LOOK_AHEAD_M, 0);
    const [cx, cy] = cameraPosition(pose);
    // The camera is behind the runner: the runner's direction points away from it.
    expect((p.x - cx) * p.dx + (p.y - cy) * p.dy).toBeGreaterThan(90);
  });

  it("swings round the hairpin at km 17.0 at no more than 60° per second, without a jump of the camera", () => {
    const rig = createRig(overview, { mode: "follow" });
    // 3:30 min per km: 4.76 m per second, from 150 m before the turn to 150 m after it.
    const speedKm = 1 / 210;
    let prev = rig.step(FRAME, anchorAt(16.85));
    let turned = 0;
    let maxStep = 0;
    for (let t = FRAME; t < 0.3 / speedKm; t += FRAME) {
      const pose = rig.step(FRAME, anchorAt(16.85 + t * speedKm));
      const turn = Math.abs(angleDelta(prev.heading, pose.heading));
      expect(turn).toBeLessThanOrEqual(MAX_TURN * FRAME + 1e-9);
      turned += turn;
      maxStep = Math.max(maxStep, dist3(cameraPosition(prev), cameraPosition(pose)));
      prev = pose;
    }
    expect(turned).toBeGreaterThan(170 * DEG); // it did turn round
    // 60° per second on a 121 m arm is 2.1 m per frame, plus the runner's own 8 cm.
    expect(maxStep).toBeLessThan(2.5);
    expect(Math.abs(angleDelta(prev.heading, headingOf(track.at(17.15))))).toBeLessThan(2 * DEG);
  });

  it("keeps the follow distance between 60 and 400 m", () => {
    const rig = createRig(overview, { mode: "follow" });
    rig.setFollow(20);
    expect(rig.step(FRAME, anchorAt(5)).dist).toBe(60);
    rig.setFollow(1000, 45 * DEG);
    const pose = rig.step(FRAME, anchorAt(5));
    expect(pose.dist).toBe(400);
    expect(pose.tilt).toBe(45 * DEG);
  });
});

describe("createRig, flights between the modes", () => {
  it("starts in the overview and flies to the runner in 1.2 s without a jump", () => {
    const rig = createRig(overview);
    const a = anchorAt(5);
    const start = rig.step(FRAME, a);
    expect(start).toEqual(overview);
    rig.setMode("follow");
    expect(rig.moving).toBe(true);
    let prev = start;
    let biggest = 0;
    for (let t = 0; t < TRANSITION_S + FRAME; t += FRAME) {
      const pose = rig.step(FRAME, a);
      // No jump: the distance changes by a bounded factor per frame, also in the first one.
      biggest = Math.max(biggest, Math.abs(Math.log(pose.dist / prev.dist)));
      prev = pose;
    }
    expect(biggest).toBeLessThan(0.35);
    expect(rig.moving).toBe(false);
    expect(prev.dist).toBeCloseTo(140, 6);
    expect(prev.x).toBeCloseTo(a.x, 6);
  });

  it("interpolates the logarithm of the distance, not the distance", () => {
    const a: Pose = { x: 0, y: 0, dist: 100, tilt: 0.5, heading: 0 };
    const b: Pose = { x: 10, y: 0, dist: 10_000, tilt: 0.9, heading: 0 };
    expect(mixPose(a, b, 0.5).dist).toBeCloseTo(1000, 6);
    expect(mixPose(a, b, 0.5).x).toBeCloseTo(5, 9);
  });

  it("turns the short way round in a flight", () => {
    const a: Pose = { x: 0, y: 0, dist: 100, tilt: 0.5, heading: 170 * DEG };
    const b: Pose = { ...a, heading: -170 * DEG };
    expect(angleDelta(a.heading, mixPose(a, b, 0.5).heading)).toBeCloseTo(10 * DEG, 9);
  });

  it("stops a flight when the user takes the camera, and holds still until it is taken back", () => {
    const rig = createRig(overview);
    rig.step(FRAME, anchorAt(5));
    rig.setMode("follow");
    const mid = rig.step(0.3, anchorAt(5));
    rig.release();
    expect(rig.free).toBe(true);
    expect(rig.moving).toBe(false);
    expect(rig.step(FRAME, anchorAt(5.2))).toEqual(mid);
    // The user moved the camera somewhere. "Zentrieren" flies back from there.
    const somewhere: Pose = { x: 500, y: 500, dist: 800, tilt: 0.7, heading: 1 };
    rig.setMode("follow", somewhere);
    expect(rig.free).toBe(false);
    const first = rig.step(FRAME, anchorAt(5.2));
    expect(Math.hypot(first.x - 500, first.y - 500)).toBeLessThan(Math.hypot(anchorAt(5.2).x - 500, anchorAt(5.2).y - 500));
    expect(first.dist).toBeLessThan(800);
    expect(first.dist).toBeGreaterThan(140);
  });

  it("jumps instead of flying with reduced motion", () => {
    const rig = createRig(overview, { cut: true });
    rig.step(FRAME, anchorAt(5));
    rig.setMode("follow");
    expect(rig.moving).toBe(false);
    expect(rig.step(FRAME, anchorAt(5)).dist).toBe(140);
  });

  it("does not catch up after a long gap, it is simply there", () => {
    const rig = createRig(overview, { mode: "follow" });
    rig.step(FRAME, anchorAt(16.9));
    const pose = rig.step(30, anchorAt(17.1)); // the tab was hidden for 30 s
    expect(Math.abs(angleDelta(pose.heading, anchorAt(17.1).heading))).toBeLessThan(1e-9);
  });
});
