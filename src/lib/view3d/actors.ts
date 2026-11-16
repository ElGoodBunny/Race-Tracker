// Runner, pins and confetti in the 3D view, built from src/lib/figures.ts (docs/decisions/2026-11-13-3d-konzept.md).
// A layer like the others: view.ts hands it the frame, it places the figures. It decides nothing about the race:
// where the runner is and which spots are passed comes in with the frame.

import { Group, Mesh, type Material, type Object3D } from "three";
import { createConfetti, createPin, createRunner, figurePalette, type Confetti, type Runner } from "../figures";
import type { Layer, SpotState } from "./layer";
import { toThree, type Track } from "./world";

/** Pins stand this far to the right of the course, so the runner does not run through them. */
const PIN_OFFSET_M = 9;
/** Stride of the running animation when the source has no cadence, in steps per minute. */
const DEFAULT_CADENCE = 170;
/** The figure runs at full swing at this pace (seconds per km) and faster. */
const FULL_SWING_PACE = 330;

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
  let phase = 0;
  const pins = new Map<string, { group: Group; passed: boolean; x: number; y: number; km: number }>();

  const clearPins = () => {
    for (const p of pins.values()) {
      group.remove(p.group);
      disposeTree(p.group);
    }
    pins.clear();
  };

  function syncPins(spots: readonly SpotState[], scale: number, animate: boolean) {
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
        const at = track.at(s.km);
        // To the right of the direction of travel: (dy, -dx).
        const x = at.x + at.dy * PIN_OFFSET_M;
        const y = at.y - at.dx * PIN_OFFSET_M;
        p = { group: createPin(flags[i % flags.length]), passed: s.passed, x, y, km: s.km };
        p.group.position.set(...toThree(x, y));
        group.add(p.group);
        pins.set(s.id, p);
      }
      p.group.scale.setScalar(scale);
      // Confetti exactly when events.ts reports the spot as passed. A spot that arrives already passed stays quiet.
      if (s.passed && !p.passed && animate && confetti) {
        confetti.mesh.position.set(...toThree(p.x, p.y));
        confetti.mesh.scale.setScalar(scale);
        confetti.burst(0, 34, 0);
      }
      p.passed = s.passed;
    });
  }

  return {
    object: group,
    frame(f) {
      if (!runner) return;
      syncPins(f.spots, f.figureScale, f.animate);
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
