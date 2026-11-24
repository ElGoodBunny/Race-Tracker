// Runner, pins and confetti in the 3D view, built from src/lib/figures.ts (docs/decisions/2026-11-13-3d-konzept.md).
// A layer like the others: view.ts hands it the frame, it places the figures. It decides nothing about the race:
// where the runner is and which spots are passed comes in with the frame.

import { Group, Mesh, type Material, type Object3D } from "three";
import { createConfetti, createPin, createRunner, figurePalette, type Confetti, type Runner } from "../figures";
import { pinOffset } from "./camera";
import type { Layer, SpotState } from "./layer";
import { toThree, type Track } from "./world";

/** Stride of the running animation when the source has no cadence, in steps per minute. */
const DEFAULT_CADENCE = 170;
/** The figure runs at full swing at this pace (seconds per km) and faster. */
const FULL_SWING_PACE = 330;

/**
 * Where the pin of a spot stands, to the right of the direction of travel: (dy, -dx). Far enough out that the runner
 * passes beside it at both scales, so it moves out when the camera zooms out. Labels use it too.
 */
export function pinPosition(track: Track, km: number, figureScale: number, pinScale: number): { x: number; y: number } {
  const at = track.at(km);
  const off = pinOffset(figureScale, pinScale);
  return { x: at.x + at.dy * off, y: at.y - at.dx * off };
}

function disposeTree(o: Object3D) {
  o.traverse((c) => {
    if (!(c instanceof Mesh)) return;
    c.geometry.dispose();
    for (const m of ([] as Material[]).concat(c.material)) m.dispose();
  });
}

export function createActors(track: Track): Layer {
  const group = new Group();
  // After the flat layers and the course band, which is drawn over the buildings from far away.
  group.renderOrder = 6;
  let flags: string[] = [];
  let runner: Runner | null = null;
  let confetti: Confetti | null = null;
  /** The spot whose pin the confetti last burst from. */
  let confettiKm: number | null = null;
  let phase = 0;
  const pins = new Map<string, { group: Group; passed: boolean; km: number }>();

  const clearPins = () => {
    for (const p of pins.values()) {
      group.remove(p.group);
      disposeTree(p.group);
    }
    pins.clear();
  };

  function syncPins(spots: readonly SpotState[], figureScale: number, scale: number, animate: boolean) {
    for (const [id, p] of pins) {
      const s = spots.find((x) => x.id === id);
      if (s && s.km === p.km) continue;
      group.remove(p.group);
      disposeTree(p.group);
      pins.delete(id);
    }
    spots.forEach((s, i) => {
      let p = pins.get(s.id);
      if (!p) {
        p = { group: createPin(flags[i % flags.length]), passed: s.passed, km: s.km };
        group.add(p.group);
        pins.set(s.id, p);
      }
      const { x, y } = pinPosition(track, s.km, figureScale, scale);
      p.group.position.set(...toThree(x, y));
      p.group.scale.setScalar(scale);
      // Confetti exactly when events.ts reports the spot as passed. A spot that arrives already passed stays quiet.
      if (s.passed && !p.passed && animate && confetti) {
        confettiKm = s.km;
        confetti.burst(0, 34, 0);
      }
      p.passed = s.passed;
    });
  }

  return {
    object: group,
    frame(f) {
      if (!runner) return;
      syncPins(f.spots, f.figureScale, f.pinScale, f.animate);
      // Where the pin is in this frame and at its scale, not as at the burst: a flight from the overview would
      // otherwise leave huge pieces far beside the course.
      if (confetti && confettiKm !== null) {
        const { x, y } = pinPosition(track, confettiKm, f.figureScale, f.pinScale);
        confetti.mesh.position.set(...toThree(x, y));
        confetti.mesh.scale.setScalar(f.pinScale);
      }
      confetti?.step(f.dt);
      runner.group.visible = f.runner !== null;
      if (!f.runner || !f.sample) return;
      runner.group.position.set(...toThree(f.runner.x, f.runner.y));
      runner.group.rotation.y = f.runner.heading;
      runner.group.scale.setScalar(f.figureScale);
      // Stride from the measured cadence in wall time, so the legs look right at every replay speed.
      const swing = f.moving ? Math.min(1.3, FULL_SWING_PACE / (f.sample.pace ?? FULL_SWING_PACE)) : 0;
      if (f.moving) phase = (phase + f.dt * ((f.sample.cad ?? DEFAULT_CADENCE) / 60) * Math.PI) % (2 * Math.PI);
      runner.pose(phase, swing);
      runner.pulse(f.now / 1000, f.animate);
    },
    setColors(tokens, dark) {
      // Figure colours sit in many small materials. Rebuilding the few figures is simpler than recolouring them.
      const palette = figurePalette(tokens, dark);
      flags = palette.flags;
      if (runner) {
        group.remove(runner.group);
        disposeTree(runner.group);
      }
      runner = createRunner(palette);
      runner.group.visible = false;
      group.add(runner.group);
      if (confetti) {
        group.remove(confetti.mesh);
        disposeTree(confetti.mesh);
      }
      confetti = createConfetti(palette.flags);
      group.add(confetti.mesh);
      clearPins();
    },
    busy: () => (confetti?.active() ?? 0) > 0,
    dispose() {
      disposeTree(group);
    },
  };
}
