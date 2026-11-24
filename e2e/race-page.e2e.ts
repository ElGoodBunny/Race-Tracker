// The 3D view on the race page (docs/tasks/017-claude-einbau-rennseite.md): loads only when in view,
// fades in over the 2D map without moving anything, and brings the replay controls.
import { expect, test } from "@playwright/test";

for (const slug of ["barcelona-2027", "hamburg-2026"]) {
  test(`${slug}: 3D erst beim Sichtbarwerden, ohne Layout-Verschiebung`, async ({ page }) => {
    const loaded: string[] = [];
    page.on("request", (r) => loaded.push(r.url()));
    // Small window: the view starts below the fold plus the 200 px margin of the observer (stage top is at 460 px).
    await page.setViewportSize({ width: 1280, height: 240 });
    await page.addInitScript(() => {
      (window as any).__shift = 0;
      new PerformanceObserver((list) => {
        for (const e of list.getEntries() as any[]) if (!e.hadRecentInput) (window as any).__shift += e.value;
      }).observe({ type: "layout-shift", buffered: true });
    });
    await page.goto(`/${slug}`);
    await page.waitForTimeout(1000);
    expect(loaded.some((u) => u.includes("three.module")), "three.js vor dem Sichtbarwerden").toBe(false);
    expect(loaded.some((u) => u.includes("scene.json")), "Szene vor dem Sichtbarwerden").toBe(false);
    await expect(page.locator("#controls")).toBeHidden();
    // Counted from here: the swap of the web font moves the hero heading on load, that is not the view (see the package).
    await page.evaluate(() => ((window as any).__shift = 0));

    await page.locator("#stage").scrollIntoViewIfNeeded();
    await page.waitForFunction(() => document.getElementById("stage")?.dataset.ready === "true", null, { timeout: 30_000 });
    // Fade in is 500 ms.
    await page.waitForTimeout(1500);
    await expect(page.locator("#controls")).toBeVisible();
    await expect(page.locator("#outage")).toHaveCount(0);
    await expect(page.locator("#next-block")).toBeHidden();
    expect(await page.evaluate(() => (window as any).__shift)).toBe(0);
  });
}
