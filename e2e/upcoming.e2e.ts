// List "Als Nächstes" in the panel of /dev/live (docs/tasks/012-claude-als-naechstes-panel.md).
// Jumps to a km by script and reads the list as a viewer sees it. "Passed" comes from the page's SpotTracker.
import { expect, test, type Page } from "@playwright/test";

async function seekKm(page: Page, km: number) {
  await page.evaluate((km) => {
    const L = (window as any).__live;
    L.pause();
    let lo = 0;
    let hi = L.source.duration;
    for (let i = 0; i < 40; i++) {
      const mid = (lo + hi) / 2;
      if (L.source.sampleAt(mid).km < km) lo = mid;
      else hi = mid;
    }
    L.seek(hi);
  }, km);
}

const rows = (page: Page) => page.locator("#hud-next li");

test("Als Nächstes: nächster Spot oben, passierte fehlen, nach dem Rücksprung wieder da", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto("/dev/live?race=barcelona-2027");
  await page.waitForFunction(() => (window as any).__live?.view);

  await seekKm(page, 12);
  await expect(rows(page).first()).toContainText("Sagrada Família");
  await expect(rows(page).first()).toContainText("1,9 km");
  await expect(rows(page).first()).toContainText(/in \d+ min/);
  await expect(rows(page)).toHaveCount(3);

  await seekKm(page, 14);
  await expect(rows(page).first()).toContainText("Port Vell");
  await expect(page.locator("#hud-next")).not.toContainText("Sagrada Família");

  await seekKm(page, 31);
  await expect(rows(page)).toHaveCount(1);
  await expect(rows(page).first()).toHaveText("Alle Spots passiert");

  await seekKm(page, 12);
  await expect(rows(page).first()).toContainText("Sagrada Família");
});
