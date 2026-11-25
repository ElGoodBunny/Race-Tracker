// @ts-check
import { defineConfig } from "astro/config";

// Static output: every race page is prebuilt, live data comes from Supabase in the browser.
export default defineConfig({
  site: "https://race-tracker.dmitrij-helmer.workers.dev", // bis eine eigene Domain steht (docs/ROADMAP.md, Phase 4)
});
