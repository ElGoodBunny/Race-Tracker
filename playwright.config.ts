// Browser checks from the roadmap that need a real page ("Labels kleben"). Run with `npm run e2e`.
// Uses the installed Google Chrome, no browser download. The page is built and served by astro preview.
import { defineConfig } from "@playwright/test";

const PORT = 4331;

export default defineConfig({
  testDir: "e2e",
  // Not *.test.ts or *.spec.ts, so vitest does not pick these up.
  testMatch: "**/*.e2e.ts",
  timeout: 120_000,
  workers: 1,
  use: {
    baseURL: `http://127.0.0.1:${PORT}`,
    channel: "chrome",
    // WebGL on the GPU in headless Chrome on the Mac. Without it Chrome may fall back to software or to no WebGL.
    launchOptions: { args: process.platform === "darwin" ? ["--use-angle=metal", "--enable-gpu", "--ignore-gpu-blocklist"] : [] },
  },
  // --ignore-lock: a preview server of another session may already run in this folder.
  webServer: {
    command: `npm run build && npx astro preview --ignore-lock --host 127.0.0.1 --port ${PORT}`,
    url: `http://127.0.0.1:${PORT}/dev/live`,
    reuseExistingServer: false,
    timeout: 180_000,
  },
});
