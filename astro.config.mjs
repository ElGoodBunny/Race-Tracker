// @ts-check
import { defineConfig } from "astro/config";

// Static output: every race page is prebuilt, live data comes from Supabase in the browser.
export default defineConfig({
  site: "https://example.com", // TODO: set once hosting is decided (docs/ROADMAP.md, Phase 4)
});
