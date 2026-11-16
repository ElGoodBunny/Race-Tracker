// Camera rig as pure logic (docs/decisions/2026-11-13-3d-konzept.md, section 2). No three.js in here.
// A pose says where the camera looks and from where. The rig turns mode, runner and time into one pose per frame,
// view.ts only applies it. Everything is in scene metres: x east, y north, angles in radians.

export type Mode = "follow" | "overview";

export interface Pose {
  /** Point on the ground the camera looks at. */
  x: number;
  y: number;
  /** Distance from the camera to that point. */
  dist: number;
  /** Angle above the ground. */
  tilt: number;
  /** Direction the camera looks along the ground, as atan2(north, east): 0 looks east, π/2 looks north. */
  heading: number;
}

const DEG = Math.PI / 180;
export const FOV_DEG = 35;
export const FOLLOW_DIST_M = 140;
export const FOLLOW_MIN_M = 60;
export const FOLLOW_MAX_M = 400;
export const FOLLOW_TILT = 30 * DEG;
/** The camera looks at a point this far ahead of the runner, along the course. */
export const LOOK_AHEAD_M = 25;
export const OVERVIEW_TILT = 50 * DEG;
export const OVERVIEW_MARGIN = 0.08;
export const TRANSITION_S = 1.2;
/** The follow camera turns at most this fast, so it swings round a hairpin instead of jumping. */
export const MAX_TURN = 60 * DEG;
/** Runner height in figure units (src/lib/figures.ts) and his scale in the follow mode. */
export const FIGURE_UNITS = 38;
export const FIGURE_SCALE = 0.55;
export const FIGURE_MIN_PX = 40;

/** The easing curve from docs/DESIGN.md, cubic-bezier(0.22, 1, 0.36, 1), for k from 0 to 1. */
export function ease(k: number): number {
  if (k <= 0) return 0;
  if (k >= 1) return 1;
  const bez = (a: number, b: number, s: number) => 3 * a * s * (1 - s) ** 2 + 3 * b * s * s * (1 - s) + s ** 3;
  // Solve x(s) = k by bisection, x is monotonic.
  let lo = 0;
  let hi = 1;
  for (let i = 0; i < 30; i++) {
    const s = (lo + hi) / 2;
    if (bez(0.22, 0.36, s) < k) lo = s;
    else hi = s;
  }
  return bez(1, 1, (lo + hi) / 2);
}

/** Shortest way from one angle to another, in (-π, π]. */
export function angleDelta(from: number, to: number): number {
  let d = (to - from) % (2 * Math.PI);
  if (d > Math.PI) d -= 2 * Math.PI;
  if (d <= -Math.PI) d += 2 * Math.PI;
  return d;
}

/**
 * One step of a damped turn toward `target`: closes the gap exponentially, but never faster than maxRate.
 * Used for the follow camera (60° per second) and for the runner figure, so neither snaps round at a hairpin.
 */
export function turnToward(current: number, target: number, dt: number, maxRate = MAX_TURN, stiffness = 4): number {
  const gap = angleDelta(current, target);
  const want = gap * (1 - Math.exp(-stiffness * dt));
  const limit = maxRate * dt;
  return current + Math.max(-limit, Math.min(limit, want));
}

/** Camera position for a pose as [x east, y north, up]. */
export function cameraPosition(p: Pose): [number, number, number] {
  const flat = Math.cos(p.tilt) * p.dist;
  return [p.x - Math.cos(p.heading) * flat, p.y - Math.sin(p.heading) * flat, Math.sin(p.tilt) * p.dist];
}

/**
 * Perspective projection of a pose: scene point to normalised screen coordinates (-1 to 1, y up) and the depth
 * along the view direction. Same result as a three.js PerspectiveCamera placed with cameraPosition and looking at the target.
 */
export function projector(p: Pose, aspect: number, fovDeg = FOV_DEG) {
  const [cx, cy, cz] = cameraPosition(p);
  const ch = Math.cos(p.heading);
  const sh = Math.sin(p.heading);
  const ct = Math.cos(p.tilt);
  const st = Math.sin(p.tilt);
  const t = Math.tan((fovDeg * DEG) / 2);
  return (x: number, y: number, up = 0) => {
    const vx = x - cx;
    const vy = y - cy;
    const vz = up - cz;
    const depth = vx * ch * ct + vy * sh * ct - vz * st;
    const right = vx * sh - vy * ch;
    const above = vx * ch * st + vy * sh * st + vz * ct;
    return { x: right / (depth * t * aspect), y: above / (depth * t), depth };
  };
}

/** Overview: the whole course in the frame with a margin, north up, looking down at 50°. */
export function fitOverview(points: readonly (readonly [number, number])[], aspect: number, margin = OVERVIEW_MARGIN, fovDeg = FOV_DEG): Pose {
  let w = Infinity;
  let e = -Infinity;
  let s = Infinity;
  let n = -Infinity;
  for (const [x, y] of points) {
    w = Math.min(w, x);
    e = Math.max(e, x);
    s = Math.min(s, y);
    n = Math.max(n, y);
  }
  const pose: Pose = { x: (w + e) / 2, y: (s + n) / 2, dist: 5000, tilt: OVERVIEW_TILT, heading: Math.PI / 2 };
  // Move out or in until the outermost course point sits on the margin. Perspective makes this a few rounds.
  for (let i = 0; i < 8; i++) {
    const project = projector(pose, aspect, fovDeg);
    let reach = 0;
    for (const [x, y] of points) {
      const q = project(x, y);
      reach = Math.max(reach, Math.abs(q.x), Math.abs(q.y));
    }
    pose.dist *= reach / (1 - margin);
  }
  return pose;
}

/** Metres that cover `px` pixels at the camera target, for a viewport `viewportH` pixels high. */
export function metresForPixels(px: number, dist: number, viewportH: number, fovDeg = FOV_DEG): number {
  return (px * 2 * dist * Math.tan((fovDeg * DEG) / 2)) / viewportH;
}

/** Scale of runner and pins: 0.55 in the follow mode, growing with the distance so the runner stays at least 40 px tall. */
export function figureScale(dist: number, viewportH: number, fovDeg = FOV_DEG): number {
  return Math.max(FIGURE_SCALE, metresForPixels(FIGURE_MIN_PX, dist, viewportH, fovDeg) / FIGURE_UNITS);
}

/** Between two poses: target and angles linear (heading the short way round), distance along its logarithm. */
export function mixPose(a: Pose, b: Pose, k: number): Pose {
  return {
    x: a.x + (b.x - a.x) * k,
    y: a.y + (b.y - a.y) * k,
    dist: Math.exp(Math.log(a.dist) + (Math.log(b.dist) - Math.log(a.dist)) * k),
    tilt: a.tilt + (b.tilt - a.tilt) * k,
    heading: a.heading + angleDelta(a.heading, b.heading) * k,
  };
}

/** What the follow camera needs per frame: the point it looks at and the runner's direction along the course. */
export interface Anchor {
  x: number;
  y: number;
  heading: number;
}

export interface Rig {
  readonly mode: Mode;
  /** The user has taken the camera. The rig holds still until setMode. */
  readonly free: boolean;
  /** A flight between two poses is running. */
  readonly moving: boolean;
  /**
   * Switch mode or, when the camera is free, take it back (the "Zentrieren" button).
   * Flies 1.2 s from `from` (default: the last pose), with cut = true it jumps.
   */
  setMode(mode: Mode, from?: Pose): void;
  /** Hand the camera to the user: stops any flight. `pose` is where the camera is now. */
  release(pose?: Pose): void;
  /** Overview pose, set again when the frame changes its shape. */
  setOverview(pose: Pose): void;
  /** Follow distance (clamped to 60 to 400 m) and tilt, for zooming with two fingers while following. */
  setFollow(dist: number, tilt?: number): void;
  /** Advance by dt seconds of wall time and return the pose of this frame. */
  step(dt: number, anchor: Anchor): Pose;
}

/** `cut`: no flights and no damped turning, for prefers-reduced-motion. Starts in the overview. */
export function createRig(overview: Pose, opts: { cut?: boolean; mode?: Mode } = {}): Rig {
  const cut = opts.cut ?? false;
  let mode: Mode = opts.mode ?? "overview";
  let free = false;
  let followDist = FOLLOW_DIST_M;
  let followTilt = FOLLOW_TILT;
  let camHeading: number | null = null;
  let last: Pose | null = null;
  let flight: { from: Pose; elapsed: number } | null = null;

  const goal = (a: Anchor): Pose =>
    mode === "overview" ? overview : { x: a.x, y: a.y, dist: followDist, tilt: followTilt, heading: camHeading ?? a.heading };

  return {
    get mode() {
      return mode;
    },
    get free() {
      return free;
    },
    get moving() {
      return flight !== null;
    },
    setMode(next, from) {
      const start = from ?? last;
      mode = next;
      free = false;
      // The flight carries the turn, so the follow camera starts straight behind the runner.
      camHeading = null;
      flight = start && !cut ? { from: start, elapsed: 0 } : null;
    },
    release(pose) {
      free = true;
      flight = null;
      if (pose) last = pose;
    },
    setOverview(pose) {
      overview = pose;
    },
    setFollow(dist, tilt) {
      followDist = Math.max(FOLLOW_MIN_M, Math.min(FOLLOW_MAX_M, dist));
      if (tilt !== undefined) followTilt = tilt;
    },
    step(dt, anchor) {
      if (free && last) return last;
      // First frame, reduced motion, or a long gap (tab was hidden): no catching up, be there.
      const snap = cut || camHeading === null || dt > 0.25;
      camHeading = snap ? anchor.heading : turnToward(camHeading!, anchor.heading, dt);
      if (flight && dt > 0.25) flight = null;
      let pose = goal(anchor);
      if (flight) {
        flight.elapsed += dt;
        const k = Math.min(1, flight.elapsed / TRANSITION_S);
        pose = mixPose(flight.from, pose, ease(k));
        if (k >= 1) flight = null;
      }
      last = pose;
      return pose;
    },
  };
}
