# 014 Zoom mit zwei Fingern beim Folgen
Besitzer: claude
Status: erledigt
Branch: claude/014-zoom-zwei-finger
Roadmap: Phase 2, Schritt 8 (Kamera-Rig), Unterpunkt "Zoom mit zwei Fingern beim Folgen, ohne die Kamera freizugeben"

## Worum es geht
Heute nimmt jede Berührung der Karte dem Rig die Kamera weg (`onGrab` in `view.ts`). Wer am Handy beim Folgen näher heranzoomen will, verliert dadurch das Folgen und muss "Zentrieren" drücken. Zoomen mit den Knöpfen geht schon ohne Freigabe (`rig.zoom`).

## Auftrag
1. Am Handy (Touch) im Folgemodus, solange die Kamera nicht frei ist:
   - Zwei Finger auseinander oder zusammen: Folgedistanz ändert sich über `rig.zoom`, in den Grenzen 100 bis 400 m (vorher 60 m, siehe Ergebnis). Die Kamera bleibt beim Läufer, `free` bleibt false.
   - Ein Finger, der sich mehr als 8 px bewegt: wie bisher, die Kamera wird frei und der Finger verschiebt die Karte weiter, ohne neu anzusetzen.
   - Ein Tippen ohne Bewegung nimmt die Kamera nicht mehr weg.
   - Hat die Geste mit zwei Fingern angefangen, bleibt sie Zoom, auch wenn ein Finger zuerst losgelassen wird.
2. Die Entscheidung "Zoom, Ziehen oder nichts" als reine Logik in `src/lib/view3d/gesture.ts`, ohne DOM.
3. Maus, Mausrad, Übersicht und freie Kamera bleiben wie sie sind.

## Erlaubte Dateien
- `src/lib/view3d/gesture.ts` (neu), `src/lib/view3d/view.ts`
- `tests/gesture.test.ts` (neu)
- `e2e/pinch.e2e.ts` (neu)
- `src/lib/view3d/camera.ts`, `tests/camera.test.ts`, `docs/decisions/2026-11-13-3d-konzept.md` (untere Grenze, nachträglich, siehe Ergebnis)
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
Erledigt: `createFollowGesture` in `gesture.ts` entscheidet zwischen Zoom, Ziehen und nichts. `view.ts` fängt Touch-Finger im Folgemodus ab, bevor MapControls sie sieht (Listener auf dem Dokument in der Capture-Phase, damit die Reihenfolge nicht vom Browser abhängt): Zwei Finger gehen an `rig.zoom`, ein Finger über 8 px gibt die Kamera frei und wird per nachgereichtem `pointerdown` an MapControls übergeben, so dass die Karte ohne neues Ansetzen weiter mitgeht. Danach vergisst die Geste ihre Finger, ein zweiter Finger zoomt also die freie Kamera wie bisher. Ein Tippen gibt die Kamera nicht mehr frei. Maus, Rad und freie Kamera unverändert.

Abweichung: untere Grenze der Folgedistanz 100 m statt 60 m (`FOLLOW_MIN_M`). Bei 60 m sitzt die Kamera in der etwa 21 m hohen Figur, bei 80 m rutscht das Label unter das HUD, bei 100 m sind Figur und Label ganz zu sehen. Das gilt auch für die Knöpfe + und − am Desktop, die vorher schon auf 60 m kamen. Erlaubte Dateien dafür nachträglich ergänzt, Begründung auch in `docs/decisions/2026-11-13-3d-konzept.md`.

Geprüft:
- `tests/gesture.test.ts` zuerst, rot ohne `gesture.ts`, dann grün, 7 Tests. Kamera-Tests auf 100 m angepasst, vorher rot mit 60 m
- Check `e2e/pinch.e2e.ts` mit CDP-Touch am Handy 390 × 844:
  - zwei Finger auseinander: Distanz 140 auf 100 m, Kamera nicht frei. Ohne Sprung gemessen: über 149 Bilder wird die Distanz nie größer, höchstens 3,4 m pro Bild
  - Tippen: nicht frei. Ein Finger 90 px: frei, die Karte bewegt sich nach der Übergabe weiter (Ziel um etwa 24 m verschoben)
  - ein Finger zieht, dann ein zweiter dazu und auseinander: die freie Kamera zoomt (vorher rot, der zweite Finger wurde verschluckt)
  - Gegenprobe ohne die Änderung in `view.ts`: Zoom und Tippen rot (`free` true)
- `npm test` 24 Dateien, 276 Tests grün. `npm run check` 0 Fehler im Projekt (17 in `Claude outputs/` und `brag-output/`). `npm run e2e` 7 von 7 grün
- Sichtprüfung bei der kleinsten Distanz 100 m über die Knöpfe: Handy hell km 12, Handy dunkel km 13,9, Desktop hell km 12. Figur und Label ganz zu sehen. Zum Vergleich 80 m und 60 m angesehen (zu nah, siehe Abweichung)

Offen: echtes Gerät nicht geprüft, nur Touch-Emulation in Chrome. Auf dem iPhone besonders prüfen: Zoom mit zwei Fingern gibt die Kamera nicht frei, Ziehen mit einem Finger geht ohne neues Ansetzen weiter.

## Review
