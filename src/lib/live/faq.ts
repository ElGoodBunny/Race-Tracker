// FAQ of a race page (docs/tasks/033-claude-navigation.md). Questions and answers from the #faq part of
// legacy/hamburg-2026.html, rewritten where the legacy described what the page no longer does
// (Claude account, invitation, Garmin link for guests, simulation). Only facts from the content file.
import { fmtKm } from "../format";

export interface FaqItem {
  q: string;
  a: string;
}

/** "a, b und c" */
function list(xs: string[]): string {
  return xs.length < 2 ? (xs[0] ?? "") : `${xs.slice(0, -1).join(", ")} und ${xs.at(-1)}`;
}

export function faqItems(waterKm: number[]): FaqItem[] {
  const items: FaqItem[] = [
    {
      q: "Wie genau ist meine Position auf der Seite?",
      a: "Sie ist geschätzt. Grundlage sind die Zeit, zu der ich über die Startmatte gehe, und meine geplante Pace. Jede offizielle Zwischenzeit und jede Sichtung von euch korrigiert die Schätzung.",
    },
    {
      q: "Warum zeigt meine Uhr eine andere Zeit als die offizielle?",
      a: "Die offizielle Zeit ist die Chipzeit von Matte zu Matte. Die Uhr misst per GPS, nimmt Kurven anders als die vermessene Ideallinie und kommt dadurch auf eine etwas andere Strecke und Zeit.",
    },
    {
      q: "Wie trage ich meinen Spot ein?",
      a: "Im Bereich „An der Strecke“ trägst du ein, wer da steht. Mit dem Regler wählst du deinen Kilometer. Beim ersten Mal fragt die Seite nach deinem Namen, ein Konto brauchst du nicht.",
    },
    {
      q: "Was passiert, wenn ich auf „Ich sehe Dima gerade“ tippe?",
      a: "Die Seite speichert Uhrzeit und Kilometer deiner Sichtung. Damit wird meine Position für alle genauer. Die Sichtung steht danach auch auf der Pinnwand.",
    },
    {
      q: "Wer sieht, was ich eintrage?",
      a: "Alle, die diese Seite öffnen, sehen die Namen der Spots und die Nachrichten auf der Pinnwand. Löschen können du selbst und ich.",
    },
  ];
  if (waterKm.length === 1) {
    items.push({ q: "Wo sind die Erfrischungspunkte?", a: `Es gibt einen Erfrischungspunkt, bei km ${fmtKm(waterKm[0])}. Dort laufen alle langsamer, eine gute Stelle zum Anfeuern.` });
  } else if (waterKm.length > 1) {
    items.push({
      q: "Wo sind die Erfrischungspunkte?",
      a: `Es gibt ${waterKm.length} Erfrischungspunkte, bei km ${list(waterKm.map((k) => fmtKm(k)))}. Dort laufen alle langsamer, gute Stellen zum Anfeuern.`,
    });
  }
  return items;
}
