# 014 Zoom mit zwei Fingern beim Folgen
Besitzer: claude
Status: in Arbeit
Branch: claude/014-zoom-zwei-finger
Roadmap: Phase 2, Schritt 8 (Kamera-Rig), Unterpunkt "Zoom mit zwei Fingern beim Folgen, ohne die Kamera freizugeben"

## Worum es geht
Heute nimmt jede Berührung der Karte dem Rig die Kamera weg (`onGrab` in `view.ts`). Wer am Handy beim Folgen näher heranzoomen will, verliert dadurch das Folgen und muss "Zentrieren" drücken. Zoomen mit den Knöpfen geht schon ohne Freigabe (`rig.zoom`).

## Auftrag
1. Am Handy (Touch) im Folgemodus, solange die Kamera nicht frei ist:
   - Zwei Finger auseinander oder zusammen: Folgedistanz ändert sich über `rig.zoom`, in den Grenzen 60 bis 400 m. Die Kamera bleibt beim Läufer, `free` bleibt false.
   - Ein Finger, der sich mehr als 8 px bewegt: wie bisher, die Kamera wird frei und der Finger verschiebt die Karte weiter, ohne neu anzusetzen.
   - Ein Tippen ohne Bewegung nimmt die Kamera nicht mehr weg.
   - Hat die Geste mit zwei Fingern angefangen, bleibt sie Zoom, auch wenn ein Finger zuerst losgelassen wird.
2. Die Entscheidung "Zoom, Ziehen oder nichts" als reine Logik in `src/lib/view3d/gesture.ts`, ohne DOM.
3. Maus, Mausrad, Übersicht und freie Kamera bleiben wie sie sind.

## Erlaubte Dateien
- `src/lib/view3d/gesture.ts` (neu), `src/lib/view3d/view.ts`
- `tests/gesture.test.ts` (neu)
- `e2e/pinch.e2e.ts` (neu)
- `docs/tasks/014-claude-zoom-zwei-finger.md`, `docs/ROADMAP.md` (Haken), `AGENTS.md` (Paketliste)

## Prüfpunkt
- Tests zuerst: Zwei Finger auseinander ergeben einen Faktor unter 1 (näher), zusammen über 1. Ein Finger unter 8 px ergibt nichts, darüber genau einmal "Ziehen". Nach zwei Fingern nie "Ziehen". Losgelassene Finger werden vergessen
- Check als Playwright-Test mit echten Touch-Events (CDP) am Handy: Zwei Finger auseinander im Folgemodus, danach ist die Kamera nicht frei und die Distanz kleiner. Ein Finger 40 px ziehen: Kamera frei. Tippen: Kamera nicht frei
- `npm run check`, `npm test`, `npm run e2e` grün
- Sichtprüfung am Handy: Zoom fühlt sich ohne Sprung an

## Nicht Teil des Pakets
Mausrad und Trackpad am Desktop (nehmen die Kamera weiter weg), Drehen mit zwei Fingern, Zoom in der Übersicht ohne Freigabe.

## Rückfragen

## Ergebnis

## Review
