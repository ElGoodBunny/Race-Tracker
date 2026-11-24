// Touch gestures while the camera follows the runner (step 8): two fingers zoom without taking the camera,
// one finger that really moves takes it. Pure logic, view.ts feeds it the pointer events.

/** A finger has to move this far (CSS px) before it counts as dragging the map. */
export const DRAG_PX = 8;

export type GestureResult =
  | { type: "none" }
  /** Multiply the follow distance by this: below 1 is closer. */
  | { type: "zoom"; factor: number }
  /** This finger drags the map: hand the camera to the user. Comes once per gesture. */
  | { type: "drag"; id: number };

export interface FollowGesture {
  down(id: number, x: number, y: number): void;
  move(id: number, x: number, y: number): GestureResult;
  up(id: number): void;
  /** A finger of this gesture is still down. */
  readonly active: boolean;
}

export function createFollowGesture(): FollowGesture {
  const fingers = new Map<number, { x: number; y: number; startX: number; startY: number }>();
  // Once two fingers were down, the gesture stays a zoom until all fingers are up.
  let pinch = false;
  let dragged = false;

  const spread = () => {
    if (fingers.size !== 2) return 0;
    const [a, b] = [...fingers.values()];
    return Math.hypot(a.x - b.x, a.y - b.y);
  };

  return {
    down(id, x, y) {
      fingers.set(id, { x, y, startX: x, startY: y });
      if (fingers.size >= 2) pinch = true;
    },
    move(id, x, y) {
      const f = fingers.get(id);
      if (!f) return { type: "none" };
      const before = spread();
      f.x = x;
      f.y = y;
      if (pinch) {
        const after = spread();
        return before > 0 && after > 0 ? { type: "zoom", factor: before / after } : { type: "none" };
      }
      if (dragged || Math.hypot(x - f.startX, y - f.startY) <= DRAG_PX) return { type: "none" };
      dragged = true;
      return { type: "drag", id };
    },
    up(id) {
      fingers.delete(id);
      if (fingers.size === 0) pinch = dragged = false;
    },
    get active() {
      return fingers.size > 0;
    },
  };
}
