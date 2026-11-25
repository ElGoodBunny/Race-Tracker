// Check "Labels kleben" (docs/VISION.md, roadmap phase 2 step 10): the camera is turned and zoomed fast by script and
// by mouse, and in every drawn frame runner and spot labels sit at most 1 px off their anchors and no two overlap.
//
// The measurement is a layer of its own, added after the labels: view.ts calls it in the same frame, after the
// labels have been moved. It projects the top of the runner and of each pin itself and compares that with where the label really
// is on screen, relative to the canvas. So a label one frame behind, a CSS transition or a shifted container fail.
import { expect, test, type Page } from "@playwright/test";

/** Runner height in figure units (FIGURE_UNITS in src/lib/view3d/camera.ts) and the gap above it (LABEL_GAP_PX). */
const RUNNER_UNITS = 38;
const GAP_PX = 8;
/**
 * Pins stand to the right of the course, as far out as the runner body (8.4 units at the runner scale) plus the pin
 * radius (11 units at the pin scale), see pinOffset in camera.ts. They are 41 units tall (pinProfile in figures.ts).
 */
const RUNNER_SIDE_UNITS = 8.4;
const PIN_RADIUS_UNITS = 11;
const PIN_UNITS = 41;

interface Probe {
  frames: number;
  runnerFrames: number;
  spotFrames: number;
  maxDev: number;
  overlaps: number;
  multi: number;
  maxShown: number;
}

async function installProbe(page: Page) {
  await page.evaluate(
    ([units, gap, runnerSide, pinRadius, pinUnits]) => {
      const w = window as any;
      const canvas = document.getElementById("view")!;
      const p = { on: false, frames: 0, runnerFrames: 0, spotFrames: 0, maxDev: 0, overlaps: 0, multi: 0, maxShown: 0 };
      /** Distance between the bottom centre of a label (plus the gap) and its anchor, relative to the canvas. */
      const dev = (e: HTMLElement, at: [number, number], c: DOMRect) => {
        const r = e.getBoundingClientRect();
        return Math.hypot(r.left + r.width / 2 - c.left - at[0], r.bottom + gap - c.top - at[1]);
      };
      w.__probe = p;
      w.__live.view.add({
        frame(f: any) {
          if (!p.on) return;
          p.frames++;
          const c = canvas.getBoundingClientRect();
          const shown = [...document.querySelectorAll<HTMLElement>("#labels .label")].filter((e) => e.style.visibility === "visible");
          p.maxShown = Math.max(p.maxShown, shown.length);
          if (shown.length > 1) p.multi++;
          const rects = shown.map((e) => e.getBoundingClientRect());
          for (let i = 0; i < rects.length; i++) {
            for (let j = i + 1; j < rects.length; j++) {
              const a = rects[i];
              const b = rects[j];
              if (Math.min(a.right, b.right) - Math.max(a.left, b.left) > 0.5 && Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top) > 0.5) p.overlaps++;
            }
          }
          // Spot labels against the pin, computed from the course as actors.ts places it.
          const track = w.__live.track;
          for (const s of f.spots) {
            const e = shown.find((x) => !x.classList.contains("label-runner") && x.textContent === s.name);
            if (!e) continue;
            const a = track.at(s.km);
            const off = runnerSide * f.figureScale + pinRadius * f.pinScale;
            const at = f.project(a.x + a.dy * off, a.y - a.dx * off, pinUnits * f.pinScale);
            if (!at) continue;
            p.maxDev = Math.max(p.maxDev, dev(e, at, c));
            p.spotFrames++;
          }
          const runner = document.querySelector<HTMLElement>("#labels .label-runner");
          if (!runner || runner.style.visibility !== "visible" || !f.runner) return;
          const at = f.project(f.runner.x, f.runner.y, units * f.figureScale);
          if (!at) return;
          p.maxDev = Math.max(p.maxDev, dev(runner, at, c));
          p.runnerFrames++;
        },
        dispose() {},
      });
    },
    [RUNNER_UNITS, GAP_PX, RUNNER_SIDE_UNITS, PIN_RADIUS_UNITS, PIN_UNITS],
  );
}

/** Measures while act() runs and returns what the probe saw. */
async function measure(page: Page, act: () => Promise<void>): Promise<Probe> {
  await page.evaluate(() => Object.assign((window as any).__probe, { on: true, frames: 0, runnerFrames: 0, spotFrames: 0, maxDev: 0, overlaps: 0, multi: 0, maxShown: 0 }));
  await act();
  return page.evaluate(() => {
    const p = (window as any).__probe;
    p.on = false;
    return { frames: p.frames, runnerFrames: p.runnerFrames, spotFrames: p.spotFrames, maxDev: p.maxDev, overlaps: p.overlaps, multi: p.multi, maxShown: p.maxShown };
  });
}

function expectGlued(p: Probe, maxShown: number) {
  // The view draws only when something moves. Without enough frames the check would pass with nothing checked.
  expect(p.frames).toBeGreaterThanOrEqual(30);
  expect(p.runnerFrames).toBeGreaterThanOrEqual(20);
  expect(p.maxDev).toBeLessThanOrEqual(1);
  expect(p.overlaps).toBe(0);
  expect(p.maxShown).toBeLessThanOrEqual(maxShown);
}

test("Labels kleben: am Anker, ohne Überdeckung", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto("/dev/live?race=barcelona-2027");
  await page.waitForFunction(() => (window as any).__live?.view);
  await expect(page.locator("#fallback")).toBeHidden();
  await installProbe(page);

  // 400 m before the spot at the Sagrada Família (km 13,9). At 60× the runner passes its pin within the next seconds,
  // so runner label and spot label meet on screen.
  await page.evaluate(() => {
    const L = (window as any).__live;
    L.pause();
    let lo = 0;
    let hi = L.source.duration;
    for (let i = 0; i < 40; i++) {
      const mid = (lo + hi) / 2;
      if (L.source.sampleAt(mid).km < 13.5) lo = mid;
      else hi = mid;
    }
    L.seek(lo);
    L.view.setMode("follow");
  });
  await page.click('[data-speed="60"]');
  await page.waitForTimeout(1500);
  await page.evaluate(() => (window as any).__live.play());

  // Following: zoom in and out and switch 2D on and off, fast.
  const follow = await measure(page, async () => {
    for (let i = 0; i < 12; i++) {
      await page.evaluate((k) => {
        const v = (window as any).__live.view;
        v.zoom(k % 2 ? 1.6 : 0.6);
        if (k % 4 === 3) v.setFlat(!v.flat);
      }, i);
      await page.waitForTimeout(250);
    }
  });
  expectGlued(follow, 12);
  // Runner and spot label were on screen together, so "no overlap" and the spot anchor were really tested.
  expect(follow.multi).toBeGreaterThan(0);
  expect(follow.spotFrames).toBeGreaterThanOrEqual(5);

  // Free camera: turn with the right mouse button and zoom with the wheel, as fast as the mouse goes.
  // The clock stops, because the free camera does not follow and the runner would run out of the picture.
  await page.evaluate(() => (window as any).__live.pause());
  const box = (await page.locator("#view").boundingBox())!;
  const cx = box.x + box.width * 0.35;
  const cy = box.y + box.height * 0.5;
  const free = await measure(page, async () => {
    for (let i = 0; i < 3; i++) {
      await page.mouse.move(cx, cy);
      await page.mouse.down({ button: "right" });
      await page.mouse.move(cx + (i % 2 ? -150 : 150), cy - 40, { steps: 15 });
      await page.mouse.up({ button: "right" });
      await page.mouse.wheel(0, i % 2 ? 400 : -400);
      await page.waitForTimeout(200);
    }
    await page.waitForTimeout(800);
  });
  expectGlued(free, 12);

  // Overview: the flight out and the whole course, only the runner label.
  const overview = await measure(page, async () => {
    await page.evaluate(() => (window as any).__live.view.setMode("overview"));
    await page.waitForTimeout(2500);
  });
  expectGlued(overview, 8);
  expect(overview.maxShown).toBe(1);

  console.log(JSON.stringify({ follow, free, overview }));

  // A rebuilt view leaves no labels of the old one behind.
  await page.evaluate(() => (window as any).__live.remount());
  await page.waitForTimeout(500);
  await expect(page.locator("#labels .label-runner")).toHaveCount(1);
});
