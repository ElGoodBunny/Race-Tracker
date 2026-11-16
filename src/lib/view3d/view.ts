// The 3D view as a thin shell (docs/decisions/2026-11-13-3d-konzept.md, section 1 and "Durchstich").
// It owns renderer, camera and the frame loop and knows nothing about where the data comes from:
// the page hands it one measurement per frame with update(sample, spots).
// What a frame looks like is decided elsewhere: camera.ts (pose), scene.ts (city, ribbon), actors.ts (figures).
// No element ids, globals or CSS reads in here, so the race page can embed it as it is (step 15).

import { PerspectiveCamera, Scene, Vector3, WebGLRenderer } from "three";
import { MapControls } from "three/examples/jsm/controls/MapControls.js";
import type { CourseData } from "../course";
import type { Sample } from "../live/source";
import type { SceneData } from "../osm";
import { createActors } from "./actors";
import { FOV_DEG, LOOK_AHEAD_M, cameraPosition, createRig, figureScale, fitOverview, turnToward, type Mode, type Pose } from "./camera";
import type { Frame, Layer, SpotState, Tokens } from "./layer";
import { createCity, createRibbon, CITY_TOKENS, type CityColors } from "./scene";
import { headingOf, makeLocal, makeTrack, toThree } from "./world";

/** Token names the view needs, without the leading "--". The page reads them from CSS and passes them in. */
export const VIEW_TOKENS = [
  ...CITY_TOKENS, "route", "route-todo", "ink", "pressed-ink", "muted", "toast", "signal",
  ...[1, 2, 3, 4, 5, 6].map((i) => `flag-${i}`),
  ...[1, 2, 3].flatMap((i) => [`figure-skin-${i}`, `figure-hair-${i}`]),
] as const;

/** The runner figure turns faster than the camera: 240° per second. */
const RUNNER_TURN = (240 * Math.PI) / 180;
const MAX_DT = 0.1;

export interface ViewOptions {
  scene: SceneData;
  course: Pick<CourseData, "route" | "km">;
  /** Current design tokens and theme. Called at the start and on setColors(). */
  tokens(): Tokens;
  dark(): boolean;
  /** prefers-reduced-motion: cuts instead of flights, no confetti, no pulsing. The camera still follows. */
  reducedMotion?: boolean;
  /** Called at the start of every frame, before drawing. The page asks its clock and source here and calls update(). */
  tick?(now: number): void;
  /** Mode or "camera is free" changed, for the buttons of the page. */
  onState?(state: { mode: Mode; free: boolean }): void;
}

export interface ViewStats {
  triangles: number;
  calls: number;
  /** Time in render() in ms, smoothed. */
  frameMs: number;
  geometries: number;
  textures: number;
}

export interface View {
  /** One measurement and the spots with their state. Call it from tick() or whenever new data arrives. */
  update(sample: Sample, spots: readonly SpotState[]): void;
  /** Follow the runner or show the whole course. Also takes the camera back after the user moved it. */
  setMode(mode: Mode): void;
  readonly mode: Mode;
  readonly free: boolean;
  /** After a theme change. */
  setColors(): void;
  /** Add something to draw: trees, labels, landmarks. See layer.ts. */
  add(layer: Layer): void;
  /** Draw one frame now, outside the loop (tests, screenshots). */
  render(now?: number): void;
  stats(): ViewStats;
  /** Stops the loop and frees everything on the graphics card. The canvas stays. */
  dispose(): void;
}

/** Starts drawing at once. Returns null when WebGL is not available, the page then keeps its 2D map. */
export function createView(canvas: HTMLCanvasElement, o: ViewOptions): View | null {
  let renderer: WebGLRenderer;
  try {
    renderer = new WebGLRenderer({ canvas, antialias: true });
  } catch {
    return null;
  }
  renderer.setPixelRatio(Math.min(2, devicePixelRatio));
  const animate = !o.reducedMotion;

  const track = makeTrack(o.course, makeLocal(o.scene.origin));
  const lastKm = o.course.km[o.course.km.length - 1];
  const scene = new Scene();
  const camera = new PerspectiveCamera(FOV_DEG, 1, 1, 10_000);
  const city = createCity(o.scene);
  scene.add(city.group);
  const layers: Layer[] = [];

  let width = 1;
  let height = 1;
  const rig = createRig(fitOverview(track.xy, 1), { cut: !animate });

  const controls = new MapControls(camera, canvas);
  controls.enableDamping = true;
  controls.minDistance = 60;
  controls.maxDistance = 30_000;
  controls.maxPolarAngle = (80 * Math.PI) / 180;
  controls.screenSpacePanning = false;

  let sample: Sample | null = null;
  let spots: readonly SpotState[] = [];
  let runnerHeading: number | null = null;
  let drawnKm = -1;
  let dirty = true;
  let lastNow = 0;
  let frameMs = 0;
  let pose: Pose = rig.step(0, { x: 0, y: 0, heading: 0 });

  /** Where the user has put the camera, as a pose, so a flight back can start from there. */
  function poseOfCamera(): Pose {
    const t = controls.target;
    const off = camera.position.clone().sub(t);
    const dist = off.length() || 1;
    return { x: t.x, y: -t.z, dist, tilt: Math.asin(Math.max(-1, Math.min(1, off.y / dist))), heading: Math.atan2(off.z, -off.x) };
  }

  function applyPose(p: Pose) {
    const [x, y, up] = cameraPosition(p);
    camera.position.set(...toThree(x, y, up));
    controls.target.set(...toThree(p.x, p.y));
    camera.lookAt(controls.target);
  }

  const state = () => o.onState?.({ mode: rig.mode, free: rig.free });
  // Any touch takes the camera from the rig. No automatic return, the page highlights "Zentrieren" instead.
  const onGrab = () => {
    if (rig.free) return;
    rig.release(poseOfCamera());
    state();
  };
  controls.addEventListener("start", onGrab);
  const onControlsChange = () => (dirty = true);
  controls.addEventListener("change", onControlsChange);

  function resize() {
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    if (!w || !h || (w === width && h === height)) return;
    width = w;
    height = h;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    rig.setOverview(fitOverview(track.xy, w / h));
    dirty = true;
  }

  const projected = new Vector3();
  const project = (x: number, y: number, up = 0): [number, number] | null => {
    projected.set(...toThree(x, y, up)).project(camera);
    if (projected.z > 1 || projected.z < -1) return null;
    return [((projected.x + 1) / 2) * width, ((1 - projected.y) / 2) * height];
  };

  function frame(now: number, force = false) {
    o.tick?.(now);
    resize();
    const gap = lastNow ? (now - lastNow) / 1000 : 0;
    lastNow = now;
    const dt = Math.min(MAX_DT, gap);

    const km = sample ? Math.max(0, Math.min(lastKm, sample.km)) : 0;
    const at = track.at(km);
    const ahead = track.at(km + LOOK_AHEAD_M / 1000);
    const heading = headingOf(at);
    // After a gap (hidden tab) or a jump there is nothing to catch up with: be there.
    runnerHeading = runnerHeading === null || !animate || gap > 0.25 ? heading : turnToward(runnerHeading, heading, dt, RUNNER_TURN, 10);
    const moving = sample !== null && km !== drawnKm;

    const still = !animate && !dirty && !moving && !rig.moving && !layers.some((l) => l.busy?.());
    if (still && !force) return;
    drawnKm = sample ? km : -1;
    dirty = false;

    if (rig.free) {
      controls.update();
      pose = poseOfCamera();
    } else {
      // The rig gets the real gap, so it can tell a hidden tab from a slow frame.
      pose = rig.step(gap, { x: ahead.x, y: ahead.y, heading });
      applyPose(pose);
    }
    city.setDistance(camera, scene, pose.dist);
    camera.updateMatrixWorld();

    const f: Frame = {
      now,
      dt,
      sample,
      runner: sample ? { x: at.x, y: at.y, heading: runnerHeading } : null,
      moving,
      spots,
      pose,
      mode: rig.mode,
      free: rig.free,
      width,
      height,
      figureScale: figureScale(pose.dist, height),
      animate,
      project,
    };
    for (const l of layers) l.frame?.(f);

    const a = performance.now();
    renderer.render(scene, camera);
    frameMs = 0.9 * frameMs + 0.1 * (performance.now() - a);
  }

  function setColors() {
    const tokens = o.tokens();
    city.setColors(tokens as CityColors, scene);
    for (const l of layers) l.setColors?.(tokens, o.dark());
    dirty = true;
  }

  function add(layer: Layer) {
    layers.push(layer);
    if (layer.object) scene.add(layer.object);
    if (ready) layer.setColors?.(o.tokens(), o.dark());
    dirty = true;
  }

  let ready = false;
  add(createRibbon(track, o.course.km));
  add(createActors(track));
  setColors();
  ready = true;

  // Not visible or tab in the background: no frames at all.
  let onScreen = true;
  const seen = new IntersectionObserver(([e]) => (onScreen = e.isIntersecting));
  seen.observe(canvas);
  renderer.setAnimationLoop((now) => {
    if (onScreen) frame(now);
  });

  return {
    update(next, nextSpots) {
      sample = next;
      spots = nextSpots;
    },
    setMode(mode) {
      const changed = mode !== rig.mode || rig.free;
      rig.setMode(mode, rig.free ? poseOfCamera() : undefined);
      dirty = true;
      if (changed) state();
    },
    get mode() {
      return rig.mode;
    },
    get free() {
      return rig.free;
    },
    setColors,
    add,
    render: (now = performance.now()) => frame(now, true),
    stats: () => ({
      triangles: renderer.info.render.triangles,
      calls: renderer.info.render.calls,
      frameMs,
      geometries: renderer.info.memory.geometries,
      textures: renderer.info.memory.textures,
    }),
    dispose() {
      renderer.setAnimationLoop(null);
      seen.disconnect();
      controls.removeEventListener("start", onGrab);
      controls.removeEventListener("change", onControlsChange);
      controls.dispose();
      for (const l of layers) {
        if (l.object) scene.remove(l.object);
        l.dispose();
      }
      city.dispose();
      renderer.dispose();
    },
  };
}
