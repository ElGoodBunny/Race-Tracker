// FAQ of a race page (docs/tasks/033-claude-navigation.md): questions from the legacy page on today's state.
import { describe, expect, it } from "vitest";
import { faqItems } from "../src/lib/live/faq";

describe("faqItems", () => {
  it("names the water stations from the content file, German numbers", () => {
    const items = faqItems([3.68, 7.22, 9.54, 12.54, 15.22, 17.85, 19.72]);
    const water = items.find((i) => i.q === "Wo sind die Erfrischungspunkte?");
    expect(water?.a).toBe("Es gibt 7 Erfrischungspunkte, bei km 3,7, 7,2, 9,5, 12,5, 15,2, 17,9 und 19,7. Dort laufen alle langsamer, gute Stellen zum Anfeuern.");
  });
  it("leaves the water question out when the race has no stations", () => {
    expect(faqItems([]).some((i) => i.q.includes("Erfrischung"))).toBe(false);
    expect(faqItems([]).length).toBe(5);
  });
  it("says one station without a list", () => {
    expect(faqItems([5]).at(-1)?.a).toBe("Es gibt einen Erfrischungspunkt, bei km 5,0. Dort laufen alle langsamer, eine gute Stelle zum Anfeuern.");
  });
  it("promises nothing the page no longer does", () => {
    const text = faqItems([1]).map((i) => i.q + i.a).join(" ");
    expect(text).not.toMatch(/Claude|LiveTrack|Simulation|Einladung/);
  });
});
