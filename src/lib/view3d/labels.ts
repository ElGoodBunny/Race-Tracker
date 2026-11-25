// HTML labels over the runner and the spot pins (docs/decisions/2026-11-13-3d-konzept.md, step 10).
// A layer without a 3D object: view.ts calls it after the camera of the frame is set, and it moves every label
// with `transform` to where frame.project puts its anchor. So a label is never one frame behind its figure.
// Which labels are shown is placeLabels, a pure function: the runner wins, overlapping labels of lower priority
// are hidden, and there is a budget per mode.

import { pinProfile } from "../figures";
import { fmtKm, fmtPace } from "../format";
import { pinPosition } from "./actors";
import { FIGURE_UNITS } from "./camera";
import type { Layer } from "./layer";
import type { Track } from "./world";

/** Space between the anchor (top of the figure) and the bottom of the label, in CSS pixels. */
export const LABEL_GAP_PX = 8;
/** At most this many labels at once (docs/decisions/2026-11-13-3d-konzept.md, "Budget"). */
export const MAX_LABELS = { follow: 12, overview: 8 } as const;
/** Height of a pin in figure units, the top of its balloon. */
const PIN_UNITS = Math.max(...pinProfile().map(([, y]) => y));

/** A label to place: anchor x, y in CSS pixels (bottom centre, LABEL_GAP_PX below the box), size and priority. */
export interface LabelBox {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
  priority: number;
}

/**
 * Which labels to show: highest priority first, a label is left out when its anchor is outside the view or its box
 * overlaps one already placed. At most max labels. Boxes that only touch do not overlap.
 */
export function placeLabels(boxes: readonly LabelBox[], width: number, height: number, max: number): Set<string> {
  const placed: { l: number; t: number; r: number; b: number }[] = [];
  const shown = new Set<string>();
  for (const b of [...boxes].sort((p, q) => q.priority - p.priority)) {
    if (shown.size >= max) break;
    if (b.x < 0 || b.x > width || b.y < 0 || b.y > height) continue;
    const r = { l: b.x - b.w / 2, r: b.x + b.w / 2, t: b.y - LABEL_GAP_PX - b.h, b: b.y - LABEL_GAP_PX };
    if (placed.some((p) => r.l < p.r && p.l < r.r && r.t < p.b && p.t < r.b)) continue;
    placed.push(r);
    shown.add(b.id);
  }
  return shown;
}

/** A span in a label: "mono" for numbers, "label-name" for the runner's name. */
interface Part {
  text: string;
  cls: string;
}
const mono = (text: string): Part => ({ text, cls: "mono" });

interface Label {
  el: HTMLElement;
  text: string;
  w: number;
  h: number;
  shown: boolean;
}

export interface LabelOptions {
  /** Name over the runner, for example "Dima". */
  name: string;
}

/**
 * Labels as a layer. The elements go into container, which lies exactly over the canvas. Styles come from the page:
 * every label has the class "label" and a text style, the runner's also "label-runner". Numbers are in spans with the class "mono",
 * the runner's name in one with "label-name".
 */
export function createLabels(container: HTMLElement, track: Track, o: LabelOptions): Layer {
  const labels = new Map<string, Label>();
  // Sizes measured before Geist has loaded are too small and would let labels overlap. Measure again once it is there.
  document.fonts?.ready.then(() => {
    for (const l of labels.values()) l.text = "";
  });

  function label(id: string, runner: boolean): Label {
    let l = labels.get(id);
    if (!l) {
      const el = document.createElement("div");
      el.className = runner ? "label label-runner caption-4" : "label caption-5";
      el.style.visibility = "hidden";
      container.append(el);
      l = { el, text: "", w: 0, h: 0, shown: false };
      labels.set(id, l);
    }
    return l;
  }

  /** Sets the parts (plain text, or a span with a class) and measures the label, only when the text changed. */
  function setText(l: Label, parts: (string | Part)[]) {
    const text = parts.map((p) => (typeof p === "string" ? p : `<${p.cls}>${p.text}`)).join("");
    // A label measured while the view was hidden has no size yet: measure again.
    if (text === l.text && l.w > 0) return;
    l.text = text;
    l.el.replaceChildren(
      ...parts.map((p) => {
        if (typeof p === "string") return p;
        const span = document.createElement("span");
        span.className = p.cls;
        span.textContent = p.text;
        return span;
      }),
    );
    l.w = l.el.offsetWidth;
    l.h = l.el.offsetHeight;
  }

  return {
    frame(f) {
      const boxes: LabelBox[] = [];
      const anchors = new Map<string, [number, number]>();
      const listed = new Set(f.spots.map((s) => `spot:${s.id}`));

      if (f.runner && f.sample) {
        const l = label("runner", true);
        const pace = f.sample.pace;
        setText(l, [{ text: o.name, cls: "label-name" }, " ", mono(fmtKm(f.sample.km)), " km", ...(pace ? [" · ", mono(fmtPace(pace)), "/km"] : [])]);
        const at = f.project(f.runner.x, f.runner.y, FIGURE_UNITS * f.figureScale);
        if (at) {
          anchors.set("runner", at);
          boxes.push({ id: "runner", x: at[0], y: at[1], w: l.w, h: l.h, priority: Infinity });
        }
      }

      // Spot names only while following. In the overview they would cover the whole city (step 11: on tap).
      if (f.mode === "follow") {
        const km = f.sample?.km ?? 0;
        for (const s of f.spots) {
          const id = `spot:${s.id}`;
          const l = label(id, false);
          setText(l, [s.name]);
          const p = pinPosition(track, s.km, f.figureScale, f.pinScale);
          const at = f.project(p.x, p.y, PIN_UNITS * f.pinScale);
          if (!at) continue;
          anchors.set(id, at);
          // Spots still ahead before passed ones, nearer ones first.
          boxes.push({ id, x: at[0], y: at[1], w: l.w, h: l.h, priority: (s.passed ? -1e6 : 0) - Math.abs(s.km - km) });
        }
      }

      const shown = placeLabels(boxes, f.width, f.height, MAX_LABELS[f.mode]);
      for (const [id, l] of labels) {
        if (id.startsWith("spot:") && !listed.has(id)) {
          // The spot is gone from the list.
          l.el.remove();
          labels.delete(id);
          continue;
        }
        const at = anchors.get(id);
        const show = shown.has(id) && at !== undefined;
        if (show) l.el.style.transform = `translate(${at[0]}px, ${at[1]}px) translate(-50%, calc(-100% - ${LABEL_GAP_PX}px))`;
        if (show !== l.shown) {
          l.shown = show;
          l.el.style.visibility = show ? "visible" : "hidden";
        }
      }
    },
    dispose() {
      for (const l of labels.values()) l.el.remove();
      labels.clear();
    },
  };
}
