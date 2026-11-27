# 034 Spot per Tippen, 2D-Karte als Ersatz
Besitzer: claude
Status: review
Branch: claude/034-karte (auf `claude/033-navigation`, das auf 032 aufbaut. Erst 032 und 033 mergen)
Roadmap: Phase 1, Interaktive 2D-Karte: Läufer, gelaufener Teil, Spots, Tippen setzt Spot, Neigen-Ansicht, Mobil-Labels

## Worum es geht
Im Legacy war die SVG-Karte die Hauptansicht, mit Läufer, gelaufenem Teil, Spots, Tippen setzt Spot und Neigen. Heute ist die 3D-Ansicht die Hauptansicht. Sie kann Draufsicht (Knopf "2D") und Neigen und zeigt Läufer, gelaufenen Teil und Spots. Die SVG-Karte (`CourseMap.astro`) ist nur noch Platzhalter, bis 3D geladen ist, und Ersatz ohne WebGL oder ohne `scene.json`.

Entscheidung von Dima (25.11.):
- Tippen auf die Strecke in der 3D-Ansicht wählt den Kilometer für den eigenen Spot, nur in der Draufsicht wie im Legacy
- Die SVG-Karte bekommt Läufer, gelaufenen Teil und Spots, aber nur als Ersatz, wenn 3D nicht läuft
- Neigen der SVG-Karte entfällt, das macht die 3D-Ansicht

Annahmen:
- Tippen speichert nichts. Es setzt den Regler im Spot-Formular, setzt den Fokus auf "Wer steht da?" und meldet "km … gewählt" in der Ansicht. Gespeichert wird wie bisher über das Formular, mit Namensabfrage und Limit
- Ein Tippen zählt nur, wenn der Finger oder die Maus höchstens `DRAG_PX` wandert, sonst ist es Verschieben. Erkannt wird in `view.ts`, weil dort die Finger beim Folgen abgefangen werden
- Getroffen ist die Strecke, wenn der nächste Punkt auf dem Bildschirm höchstens 24 px entfernt ist. Wo die Strecke hin und zurück läuft, kann der km danebenliegen, der Regler korrigiert
- In der geneigten Ansicht meldet ein Tippen nahe der Strecke "Zum Setzen in die Draufsicht wechseln."
- Mobil-Labels: unter 640 px zeigt die SVG-Karte nur Landmarks mit `mobile: true`

## Auftrag
1. `tapSpotKm` in `src/lib/live/spots.ts`, gelaufener Teil und Position für die SVG-Karte in `src/lib/live/map.ts` (neu), beides mit Tests
2. `view.ts`: Option `onTap`, Methoden `groundAt` und `screenOf`
3. `live-stage.ts`: Tippen auswerten, Ereignis `spot-pick` an die Seite, Meldung im Toast
4. `spots.ts`: auf `spot-pick` hören
5. `CourseMap.astro` und `course-map.ts` (neu): Läufer, gelaufener Teil, Spots, nur wenn 3D nicht läuft. Mobil-Labels

## Erlaubte Dateien
- `src/lib/live/spots.ts`, `tests/spots.test.ts`, `src/lib/live/map.ts` (neu), `tests/map.test.ts` (neu)
- `src/lib/view3d/view.ts`, `src/components/live-stage.ts`, `src/components/LiveStage.astro`, `src/components/spots.ts`
- `src/components/CourseMap.astro`, `src/components/course-map.ts` (neu), `src/pages/[race].astro` (Ereignis `stage-fallback`)
- diese Datei, `AGENTS.md` (Paketliste), `docs/ROADMAP.md` (Checkboxen)

## Prüfpunkt
- `npm run check`, `npm test` grün, 3D-Bundle weiter unter 250 kB gzip
- Im Browser: `screenOf(track.at(10))` über `groundAt` und `nearestKm` ergibt etwa km 10, flach, mit Panel und auf Handybreite
- Tippen in der Draufsicht setzt den Regler, Tippen geneigt meldet den Hinweis, Ziehen setzt nichts
- SVG-Ersatz ohne WebGL: Läufer, gelaufener Teil, Spots, hell und dunkel, Desktop und Handy

## Nicht Teil des Pakets
Tippen auf der SVG-Karte, Neigen der SVG-Karte, Speichern direkt aus der Karte.

## Rückfragen

## Ergebnis
Umgesetzt:
- `tapSpotKm` (3 Tests) und `doneRoute` (3 Tests), erst rot ("tapSpotKm is not a function", "Cannot find module"), dann grün
- `view.ts`: Option `onTap`, erkannt im selben Capture-Listener wie die Finger beim Folgen, vor `onTouchDown` registriert. Zweiter Finger, mehr als `DRAG_PX` Bewegung, länger als 500 ms oder das nachgereichte `pointerdown` bei der Übergabe an MapControls zählen nicht. Dazu `groundAt` und `screenOf`
- `live-stage.ts`: Tippen auf die Strecke in der Draufsicht schickt `spot-pick`, das Spot-Formular setzt den Regler und antwortet über den Toast mit "km … gewählt. Trag unten ein, wer da steht." Geneigt: "Zum Setzen in die Draufsicht wechseln." Nur im Dev-Server hängen View und Strecke für Prüfungen an `#stage.debug`, im Build ist das weg
- `CourseMap.astro` und `course-map.ts`: Läufer, gelaufener Teil (blau wie im Legacy) und Spots, wenn 3D nicht läuft (`stage-fallback` aus `[race].astro`, auch wenn das Laden scheitert) oder wenn es keine `scene.json` gibt. Text und Marker behalten ihre Größe auf dem Bildschirm (`--k` wie `mapK` im Legacy). Unter 640 px nur Landmarks mit `mobile: true`

Abweichungen:
- Kein Fokus auf "Wer steht da?" nach dem Tippen, anders als im Legacy: Der Fokus würde von der Karte wegscrollen und auf dem Handy die Tastatur öffnen. Der Toast sagt, wo es weitergeht

Geprüft:
- `npm run check` 0 Fehler, `npm test` 411 grün, Build ok, 3D-Bundle 164 kB gzip (three 142, live-stage 12, scene 9), keine doppelten ids
- Im Browser, Barcelona, Desktop hell: `screenOf(track.at(k))` über `groundAt` und `nearestKm` ergibt für km 5, 10, 21 und 35 genau k (Abstand 0 m) in der Draufsicht. Echter Mausklick auf die Strecke vor dem Läufer (km 0,7): Regler auf 0,8, Label "km 0,8", Toast da. Geneigt: Hinweis, kein `spot-pick`. Ziehen um 30 px: nichts
- Touch beim Folgen mit nachgebauten Touch-Ereignissen: Tippen ergibt den erwarteten km (1,4), die Kamera folgt weiter. Zwei Finger: kein `spot-pick`, Kamera folgt weiter
- Ersatzkarte mit abgeschaltetem WebGL: Hamburg dunkel 375 px und Desktop (ganze Strecke gelaufen, Läufer im Ziel, Labels lesbar, auf dem Handy nur die mobilen), Barcelona hell 375 px (vor dem Start ohne Läufer)
- Nicht geprüft: Spots auf der Ersatzkarte mit echten Daten (Barcelona und Hamburg haben keine Spots in Supabase), Tippen auf einem echten Handy, Tippen mit offenem Panel auf Handybreite

## Review
