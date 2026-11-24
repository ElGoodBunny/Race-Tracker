# 013 Ansicht auf die freie Fläche
Besitzer: claude
Status: in Arbeit
Branch: claude/013-freie-flaeche
Roadmap: Phase 2, Schritt 12 (HUD und Panel), Nachtrag aus der Sichtprüfung

## Worum es geht
Die Kamera rechnet mit der ganzen Bildfläche, Panel, Bottom Sheet und HUD-Karten liegen aber darüber. In der Übersicht liegen deshalb am Desktop Teile der Strecke unter dem Panel, an km 28,5 auch Läufer und Pin Fòrum (Paket 009). Am Handy liegt der Läufer bei manchen Stellen hinter den HUD-Karten (Paket 002).

## Auftrag
1. Die Seite meldet der Ansicht, wie viel Rand oben, rechts, unten und links verdeckt ist (`insets()` in `ViewOptions`). Am Desktop: HUD oben, Panel rechts. Am Handy: HUD oben, eingeklapptes Sheet unten. Ein aufgezogenes Sheet ändert nichts.
2. Die Kamera legt ihren Bildmittelpunkt in die Mitte der freien Fläche (`setViewOffset`), die Übersicht wird in die freie Fläche eingepasst. Das gilt in allen Modi, damit der Läufer im Folgemodus nicht unter dem Panel steht.
3. Die Rechnung als reine Funktion `viewFrame` in `camera.ts`.

## Erlaubte Dateien
- `src/lib/view3d/camera.ts`, `src/lib/view3d/view.ts`
- `src/pages/dev/live.astro`
- `tests/camera.test.ts`
- `e2e/free-area.e2e.ts` (neu)
- `docs/tasks/013-claude-freie-flaeche.md`

## Prüfpunkt
- Tests: `viewFrame` ohne Ränder ändert nichts. Mit Rändern liegt das Kameraziel genau in der Mitte der freien Fläche (mit einer echten `PerspectiveCamera` nachgerechnet), Höhe und Seitenverhältnis passen zur freien Fläche
- Check als Playwright-Test: In der Übersicht liegt jeder Punkt der Strecke innerhalb der freien Fläche, am Desktop und am Handy. Die freie Fläche misst der Test selbst aus dem DOM
- `npm run check`, `npm test`, `npm run e2e` grün ("Labels kleben" unverändert)
- Sichtprüfung Übersicht und Folgen, hell und dunkel, Desktop und Handy

## Nicht Teil des Pakets
Rennseite, Layout von Panel und HUD, Kamera-Bedienung.

## Rückfragen

## Ergebnis

## Review
