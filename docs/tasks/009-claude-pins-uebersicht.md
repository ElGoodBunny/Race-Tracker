# 009 Läufer vor den Pins
Besitzer: claude
Status: review
Branch: claude/009-pins-uebersicht
Roadmap: Phase 2, Schritt 9 (Läufer), Teil "fällt in der Übersicht zuerst auf"

## Worum es geht
Review von Paket 002 (Gemini, Sichtprüfung auf `/dev/live`): Gemini hat auf `b1615b7` geprüft, 14 Commits hinter `phase-2`. Die Abweichungen 1 (Läufer-Label), 2 (Bäume) und 8 (HUD) sind mit den Paketen 004, 007 und 008 schon erledigt. 3 bis 7 gelten weiter:
3. In der Übersicht dominieren die Pins, der Läufer fällt nicht zuerst auf
4. Streckenband: Farbe und Pfeile blasser als in `frame-04.jpg`
5. Startnummer auf dem Trikot fehlt
6. Bei km 13,9 steht der Pin im Läufer
7. Sagrada Família ist ein OSM-Klotz (Schritt 14)

Dieses Paket nimmt 3 und 6. Ursache, gemessen an den Figuren aus `src/lib/figures.ts`:
- Pins skalieren mit demselben `figureScale` wie der Läufer und sind 41 Einheiten hoch, der Läufer 38. Ein Pin ist also immer größer als der Läufer.
- Der Pin steht fest 9 m neben der Strecke. Der Körper reicht seitlich 8,4 Einheiten, der Pin hat 11 Einheiten Radius. Schon im Folgemodus (Maßstab 0,55) braucht es 10,7 m, in der Übersicht wächst der Bedarf mit dem Maßstab, der Abstand nicht.

## Auftrag
1. Pins bekommen einen eigenen Maßstab `pinScale` nach dem Muster von `figureScale`: im Folgemodus 0,55 wie bisher, aus der Ferne so groß, dass ein Pin mindestens `PIN_MIN_PX` = 24 px hoch ist. Der Läufer bleibt bei mindestens 40 px.
2. Der Abstand des Pins zur Strecke folgt aus beiden Maßstäben: Körperbreite seitlich mal `figureScale` plus Pin-Radius mal `pinScale`. Eine Funktion `pinPosition` für Figuren, Labels und den Check.
3. Pins werden in jedem Bild neu gesetzt, nicht nur beim Anlegen. Konfetti startet an der aktuellen Pin-Stelle.
4. Check "Labels kleben" rechnet den Pin-Anker mit der neuen Regel.

## Erlaubte Dateien
- `src/lib/view3d/camera.ts`, `src/lib/view3d/actors.ts`, `src/lib/view3d/labels.ts`, `src/lib/view3d/layer.ts`, `src/lib/view3d/view.ts`
- `tests/camera.test.ts`, `tests/actors.test.ts` (neu, falls nötig)
- `e2e/labels.e2e.ts`
- `docs/decisions/2026-11-13-3d-konzept.md`: Nachtrag
- `docs/tasks/009-claude-pins-uebersicht.md`

## Prüfpunkt
- Tests: `pinScale` ist im Folgemodus 0,55, aus der Ferne ist der Pin genau 24 px hoch und damit kleiner als der Läufer (40 px). Abstand Pin zu Strecke ist bei jedem Maßstab mindestens Körperbreite plus Pin-Radius
- Test: `PIN_UNITS` in `camera.ts` passt zu `pinProfile()` aus `figures.ts`
- `npm run e2e` grün ("Labels kleben" mit neuem Anker)
- Sichtprüfung km 12, 13,9, 28,5, Folgen und Übersicht, hell und dunkel, Desktop und Handy: Läufer fällt in der Übersicht vor den Pins auf, bei km 13,9 steht der Pin neben dem Läufer

## Nicht Teil des Pakets
Startnummer, Farbe und Pfeile des Streckenbands, Sagrada Família, Spot-Namen beim Antippen.

## Rückfragen

## Ergebnis
Erledigt: `pinScale` und `pinOffset` in `camera.ts`, `pinScale` im Frame (`layer.ts`, `view.ts`), Pins werden in jedem Bild neu gesetzt, Konfetti startet an der aktuellen Pin-Stelle (`actors.ts`), Spot-Labels und Check "Labels kleben" nehmen den neuen Anker.

Geprüft:
- Tests zuerst, rot ohne `pinScale`, danach `npm test` 22 Dateien, 256 Tests grün (dieser Branch hat Paket 001 nicht)
- `npm run check`: 0 Fehler im Projekt. Gemeldet werden 17, alle in `Claude outputs/` und `brag-output/`. 5 davon sind neu: Kopien in `brag-output/work/` bauen den Frame selbst und kennen `pinScale` nicht
- `npm run e2e`: "Labels kleben" grün, größte Abweichung 0,00005 px, keine Überdeckung
- Messung per Projektion auf `/dev/live`, Barcelona, 1280 × 900, km 13,9: Übersicht Läufer 39 px, Pin 25 px (vorher 45 px), Läuferbox zu 26 % von der Pinbox überdeckt (vorher 100 %). Folgemodus 0 %. An km 12 und 28,5 kein Pin in der Nähe, Läufer 37,5 bis 40 px
- Sichtprüfung: Übersicht hell Desktop (km 13,9 und 28,5) und dunkel Handy, Folgemodus dunkel Handy an km 13,9. Der Läufer fällt mit Label zuerst auf, der Pin steht klein daneben, im Folgemodus rechts neben dem Körper. Pins Sagrada Família und Port Vell stehen in der Übersicht an Land neben der Strecke. Nicht geprüft: Folgemodus hell Desktop, Übersicht dunkel Desktop
- Die 37,5 px an km 12 sind eine Näherung aus projizierten Eckpunkten, `figureScale` rechnet mit dem Abstand zum Kameraziel, nicht zum Läufer. Nicht weiter verfolgt

Abweichungen: Im Folgemodus steht der Pin jetzt 10,7 m statt 9 m neben der Strecke. Grund ist die Geometrie: Körper seitlich 8,4 und Pin-Radius 11 Einheiten brauchen bei Maßstab 0,55 zusammen 10,67 m. In meiner Messung aus dieser Kamera war die alte Regel im Folgemodus bei 0 % Überdeckung, Geminis Bild zeigt die Kollision aus anderem Winkel. Entscheidung im Nachtrag in `docs/decisions/2026-11-13-3d-konzept.md`.

Offen aus Paket 002: Startnummer, Farbe und Pfeile des Streckenbands, Sagrada Família.
Neu gefunden, schon vor dem Paket so: Am Desktop liegen an km 28,5 Läufer und Pin Fòrum in der Übersicht unter dem Panel. Die Übersicht rechnet die Fläche des Panels nicht heraus.

## Review
