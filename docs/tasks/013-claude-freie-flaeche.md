# 013 Ansicht auf die freie Fläche
Besitzer: claude
Status: review
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
Erledigt: `viewFrame` und `Insets` in `camera.ts`. `view.ts` fragt jedes Bild `insets()` ab, verschiebt den Bildmittelpunkt per `setViewOffset` und passt Übersicht und 2D in die freie Fläche ein. `/dev/live` misst HUD, Kameraleiste und Panel (Desktop) beziehungsweise HUD und eingeklapptes Sheet (Handy), mit 8 px Abstand. Ein aufgezogenes Sheet behält den letzten Wert.

Geprüft:
- Unit-Tests zuerst, rot ohne `viewFrame`: ohne Ränder unverändert, mit Rändern liegt das Kameraziel mit einer echten `PerspectiveCamera` genau in der Mitte der freien Fläche
- Check `e2e/free-area.e2e.ts`: alle 200 Streckenpunkte in der Übersicht innerhalb der freien Fläche, Desktop und Handy. Gegenprobe ohne `insets`: rot, Desktop 26 Punkte bis 153 px unter Kameraleiste und Panel, Handy 32 Punkte
- `npm test` 23 Dateien, 269 Tests grün. `npm run check` 0 Fehler im Projekt. `npm run e2e` 3 von 3 grün, "Labels kleben" unverändert
- Sichtprüfung: Desktop hell Übersicht km 28,5 (Läufer und Pin Fòrum jetzt sichtbar, vorher unter dem Panel) und Folgen (Läufer mittig links vom Panel). Handy dunkel Übersicht km 13,9 und Folgen. Nicht geprüft: Desktop dunkel, Handy hell

Offen:
- Am Handy ragt die Strecke rechts oben unter die Kameraleiste. Die Leiste ziehe ich am Handy bewusst nicht ab, die Karte würde sonst 60 px schmaler
- Am Handy im Folgemodus berührt der Ring unter dem Läufer die Kante des Sheets

## Review
