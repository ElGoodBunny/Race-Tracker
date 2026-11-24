// The overview fits the course into the part of the view that HUD, camera bar and panel leave free
// (docs/tasks/013-claude-freie-flaeche.md). The free area is measured here from the DOM, not taken from the page.
import { expect, test, type Page } from "@playwright/test";

interface Outside {
  points: number;
  outside: number;
  worst: number;
  free: { left: number; top: number; right: number; bottom: number };
}

async function measureOverview(page: Page): Promise<Outside> {
  await page.goto("/dev/live?race=barcelona-2027");
  await page.waitForFunction(() => (window as any).__live?.view);
  // The page switches to following 1.5 s after the first load. Wait for that, then go to the overview.
  await page.waitForTimeout(2000);
  await page.evaluate(() => {
    const L = (window as any).__live;
    L.pause();
    L.view.setMode("overview");
  });
  // Flight into the overview is 1.2 s.
  await page.waitForTimeout(2500);
  return page.evaluate(
    () =>
      new Promise<Outside>((resolve) => {
        const L = (window as any).__live;
        const rect = (id: string) => document.getElementById(id)!.getBoundingClientRect();
        let done = false;
        L.view.add({
          frame(f: any) {
            if (done) return;
            done = true;
            const c = rect("view");
            const hud = rect("hud");
            const panel = rect("panel");
            const phone = panel.width >= c.width - 1;
            // Free area in canvas pixels.
            const free = {
              left: 0,
              top: hud.bottom - c.top,
              right: phone ? c.width : Math.min(panel.left, rect("bar").left) - c.left,
              bottom: phone ? panel.top - c.top : c.height,
            };
            let outside = 0;
            let worst = 0;
            const xy: [number, number][] = L.track.xy;
            for (const [x, y] of xy) {
              const at = f.project(x, y);
              if (!at) continue;
              const d = Math.max(free.left - at[0], at[0] - free.right, free.top - at[1], at[1] - free.bottom);
              if (d > 1) outside++;
              worst = Math.max(worst, d);
            }
            resolve({ points: xy.length, outside, worst, free });
          },
          dispose() {},
        });
      }),
  );
}

for (const [name, size] of [["Desktop", { width: 1280, height: 900 }], ["Handy", { width: 390, height: 844 }]] as const) {
  test(`Übersicht liegt in der freien Fläche: ${name}`, async ({ page }) => {
    await page.setViewportSize(size);
    const r = await measureOverview(page);
    console.log(name, JSON.stringify(r));
    expect(r.points).toBeGreaterThan(100);
    expect(r.outside).toBe(0);
  });
}
