// The contract between view.ts and everything it draws (docs/decisions/2026-11-13-3d-konzept.md, "Durchstich").
// A layer is one visible thing: the course ribbon, the figures, later trees, labels and landmarks.
// view.ts owns renderer, camera and loop and calls every layer once per frame, after the camera is set.
// New things are added as layers. Nothing in view.ts has to change for them.

import type { Object3D } from "three";
import type { Spot } from "../live/events";
import type { Sample } from "../live/source";
import type { Mode, Pose } from "./camera";

/** Design tokens by name without the leading "--", read by the page from CSS. */
export type Tokens = Record<string, string>;

/** A spot as the view gets it. `passed` comes from events.ts, the view never compares km itself. */
export interface SpotState extends Spot {
  passed: boolean;
}

/** Everything a layer may need to draw one frame. Built by view.ts after the camera is in place. */
export interface Frame {
  /** Wall time in ms and seconds since the last frame (at most 0.1). */
  now: number;
  dt: number;
  /** Latest measurement, null before the first update. */
  sample: Sample | null;
  /** Runner on the course in scene metres (x east, y north), heading smoothed. null before the first update. */
  runner: { x: number; y: number; heading: number } | null;
  /** The runner's km changed since the last frame. */
  moving: boolean;
  spots: readonly SpotState[];
  /** Camera of this frame. */
  pose: Pose;
  mode: Mode;
  free: boolean;
  /** Size of the view in CSS pixels. */
  width: number;
  height: number;
  /** Scale for runner and pins at this camera distance. */
  figureScale: number;
  /** false with prefers-reduced-motion: no confetti, no pulsing, no flowing texture. */
  animate: boolean;
  /** Scene point to CSS pixels from the top left of the view, with this frame's camera. null behind the camera. */
  project(x: number, y: number, up?: number): [number, number] | null;
}

export interface Layer {
  /** Added to the scene by view.ts. A layer that only draws HTML (labels) has none. */
  object?: Object3D;
  /** Called once per rendered frame, before the renderer draws. */
  frame?(f: Frame): void;
  /** Called at the start and after a theme change. Only colours change, geometry stays. */
  setColors?(tokens: Tokens, dark: boolean): void;
  /** A layer that still moves by itself (confetti in the air) keeps the loop drawing. */
  busy?(): boolean;
  dispose(): void;
}
