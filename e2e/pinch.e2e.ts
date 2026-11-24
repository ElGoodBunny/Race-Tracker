// Two-finger zoom while following (docs/tasks/014-claude-zoom-zwei-finger.md), with real touch events over CDP.
import { expect, test, type CDPSession, type Page } from "@playwright/test";

test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });

type Point = { x: number; y: number; id: number };

async function touch(cdp: CDPSession, type: "touchStart" | "touchMove" | "touchEnd", points: Point[]) {
  await cdp.send("Input.dispatchTouchEvent", { type, touchPoints: points });
}

/** Opens the page in follow mode and returns a free spot on the map (between HUD and sheet) and the follow distance. */
async function setUp(page: Page) {
  await page.goto("/dev/live?race=barcelona-2027");
  await page.waitForFunction(() => (window as any).__live?.view);
  await page.evaluate(() => {
    const L = (window as any).__live;
    L.pause();
    L.view.setMode("follow");
    L.view.add({ frame: (f: any) => (((window as any).__dist = f.pose.dist), ((window as any).__pose = f.pose)), dispose() {} });
    document.getElementById("view")!.scrollIntoView({ block: "start" });
  });
  await page.waitForTimeout(2500);
  const box = await page.evaluate(() => {
    const c = document.getElementById("view")!.getBoundingClientRect();
    const hud = document.getElementById("hud")!.getBoundingClientRect();
    return { x: c.left + c.width / 2, y: hud.bottom + 60 };
  });
  return box;
}

const state = (page: Page) => page.evaluate(() => ({ free: (window as any).__live.view.free as boolean, dist: (window as any).__dist as number, x: (window as any).__pose.x as number, y: (window as any).__pose.y as number }));

test("Zoom mit zwei Fingern: näher, Kamera bleibt beim Läufer", async ({ page }) => {
  const at = await setUp(page);
  const cdp = await page.context().newCDPSession(page);
  const before = await state(page);
  await touch(cdp, "touchStart", [{ x: at.x - 20, y: at.y, id: 1 }, { x: at.x + 20, y: at.y, id: 2 }]);
  for (let s = 1; s <= 10; s++) await touch(cdp, "touchMove", [{ x: at.x - 20 - 6 * s, y: at.y, id: 1 }, { x: at.x + 20 + 6 * s, y: at.y, id: 2 }]);
  await touch(cdp, "touchEnd", []);
  await page.waitForTimeout(1500);
  const after = await state(page);
  console.log(JSON.stringify({ before, after }));
  expect(after.free).toBe(false);
  // Fingers spread to four times their distance: the camera goes as close as it may (FOLLOW_MIN_M).
  expect(after.dist).toBeLessThan(before.dist);
  expect(after.dist).toBeCloseTo(100, 0);
});

test("Ein Finger zieht: Kamera wird frei. Tippen: bleibt beim Läufer", async ({ page }) => {
  const at = await setUp(page);
  const cdp = await page.context().newCDPSession(page);
  await touch(cdp, "touchStart", [{ ...at, id: 1 }]);
  await touch(cdp, "touchEnd", []);
  await page.waitForTimeout(300);
  expect((await state(page)).free).toBe(false);

  await touch(cdp, "touchStart", [{ ...at, id: 1 }]);
  // Past DRAG_PX the camera is handed over, the rest of the move pans the map.
  await touch(cdp, "touchMove", [{ x: at.x, y: at.y + 10, id: 1 }]);
  await page.waitForTimeout(100);
  const grabbed = await state(page);
  for (let s = 1; s <= 8; s++) await touch(cdp, "touchMove", [{ x: at.x, y: at.y + 10 + 10 * s, id: 1 }]);
  await touch(cdp, "touchEnd", []);
  await page.waitForTimeout(600);
  const after = await state(page);
  console.log(JSON.stringify({ grabbed, after }));
  expect(grabbed.free).toBe(true);
  expect(Math.hypot(after.x - grabbed.x, after.y - grabbed.y)).toBeGreaterThan(5);
});
