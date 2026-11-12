# Zielbild: so soll die Seite werden

Referenz ist das Video "How we track our friend's Munich marathon in realtime" (Marathon München, 11.10.2026), Standbilder in `docs/reference/munich-video/`. Ziel: mindestens dieses Niveau, an den markierten Stellen besser. Jeder Punkt ist ein prüfbares Kriterium.

## 1. 3D-Stadt
- [ ] Echte Gebäude aus OpenStreetMap entlang der Strecke (`scripts/fetch-osm.ts`), weiß/hellgrau extrudiert, im Dunkelmodus die Flächenfarben aus `docs/DESIGN.md`
- [ ] Low-Poly-Bäume (OSM-Baumpunkte, sonst in Parks gestreut), Parks grün, Wasser blau
- [ ] Mindestens ein modelliertes Wahrzeichen pro Rennen (Video: Siegestor; Hamburg: Elbphilharmonie, gibt es im Legacy schon)
- [ ] Route als breites blaues Band mit fließender Textur in Laufrichtung, gelaufener Teil kräftiger als der Rest

## 2. Läufer
- [ ] Comicfigur mit Laufanimation und Startnummer auf dem Shirt
- [ ] Label über der Figur: `DIMA 17.3 km · 5:05/km`, Zahlen in Geist Mono
- [ ] Kamera: Folgemodus schräg von hinten, Übersicht über die ganze Stadt, weicher Übergang, Zoom +/−, Zentrieren, Umschalter 2D/3D (Video: Buttonleiste links vom Panel)

## 3. Cheering Spots
- [ ] Große glänzende Pins in den sechs Flaggenfarben, sichtbar auch in der Übersicht
- [ ] Kleine Avatare der Freunde am Spot
- [ ] Konfetti und Meldung oben beim Passieren: "Dima ist gerade an Crew Landungsbrücken vorbei · km 6,6"
- [ ] Liste "Als Nächstes": kommende Spots mit Abstand und ETA

## 4. HUD und Panel
- [ ] Obere Leiste: Puls live mit Kurve (aktuell, Schnitt, Max), Rennzeit mit Zielprognose, Wetter, Live-Indikator
- [ ] Panel rechts: Avatar, Startnummer, Block, Startzeit, Name, Ort ("hinter Landungsbrücken"), Status, Fortschrittsbalken km/Gesamt
- [ ] Werte: Pace jetzt, Schnittpace, Kadenz, Höhe, Datenquelle mit Alter ("Garmin · vor 5 s"), letzter offizieller Split
- [ ] Split-Balken pro km
- [ ] Mobil: Panel als Bottom Sheet, Karte bleibt sichtbar

## 5. Besser als das Video
- [ ] **Ehrliche Datenquelle mit nahtlosem Rückfall.** Live-Daten, solange sie frisch sind. Bricht LiveTrack ab, läuft die Schätzung aus Splits und Pace ohne Sprung weiter und das HUD sagt "geschätzt"
- [ ] **Replay mit echten Daten.** Hamburg 2026 komplett mit Puls, Kadenz und Höhe aus der Uhr (`public/data/hamburg-2026/replay.json`), abspielbar in 1×/10×/30×/60×. Ersetzt die künstliche Simulation und ist die Demo, solange kein Rennen läuft
- [ ] **Spot-Alarm.** Benachrichtigung, wenn Dima noch 1 km vor deinem Spot ist (Web Push, auf dem iPhone über "Zum Home-Bildschirm")
- [ ] **Ergebnisseite.** Nach dem Rennen: Strecke eingefärbt nach Puls oder Pace, Splits, Replay
- [ ] **Hell und dunkel.** Das Video kann nur hell
- [ ] **Mittelklasse-Handy flüssig.** Folgemodus mit 60 fps, 3D wird erst geladen, wenn es sichtbar wird

## Abkürzungs-Checks
Je ein Test, der die typische Abkürzung entlarvt. Erst wenn alle bestehen, gilt die Phase als fertig.
- [ ] **Puls ist echt.** Replay auf 1:00:00 stellen: Das HUD zeigt den Wert aus `replay.json` an dieser Stelle (174 bpm), keine erfundene Kurve
- [ ] **Labels kleben.** Kamera schnell drehen und zoomen: Läufer-Label und Spot-Namen bleiben an ihrem Objekt und überdecken sich nicht
- [ ] **Jeder Messwert kommt an.** 30 s Replay in 10×: Jeder neue Messpunkt verändert km, Pace und Fortschrittsbalken, nichts bleibt stehen
- [ ] **Spots werden wirklich passiert.** Konfetti und Meldung kommen genau, wenn der Läufer den Spot-km überschreitet, nicht vorher und nicht doppelt, auch beim Vorspulen
- [ ] **Rückfall ohne Sprung.** Telemetrie mitten im Replay 60 s abschneiden: Der Läufer läuft geschätzt weiter, das HUD wechselt auf "geschätzt", beim Wiederkommen kein Rücksprung
- [ ] **Gebäude sind aus OSM.** Elbphilharmonie, Hauptbahnhof und Alsterhäuser stehen an der richtigen Stelle und haben unterschiedliche Höhen

## 6. Woher die Live-Daten kommen
Jede Quelle schreibt in dieselbe Tabelle `telemetry` (Zeit, km, Position, Puls, Kadenz, Höhe, Quelle). Die Seite liest nur diese Tabelle und weiß nicht, welche Uhr dahintersteht.

| Quelle | Wann | Wie | Risiko |
|---|---|---|---|
| Garmin LiveTrack | jetzt | Du teilst den LiveTrack-Link aus der Connect-App, ein Server-Poller liest die Session alle paar Sekunden und schreibt `telemetry` | Inoffizielle Schnittstelle, kann sich ändern. Vor dem Bau auf dem Mac verifizieren (von der Cloud aus gesperrt) |
| Schätzung aus Splits | immer | gibt es schon (`src/lib/estimate.ts`) | keins, nur ungenauer |
| Replay | jetzt | `scripts/streams-to-replay.ts` aus Strava | keins |
| Eigene Connect-IQ-App | später | Watch-App auf der Forerunner sendet über das Handy direkt an Supabase | offiziell, aber eigene Lauf-App statt der Garmin-App |
| Apple Watch | später | watchOS-App mit HealthKit-Workout sendet an Supabase | braucht native App |
| Coros | später | prüfen, ob es eine Live-Schnittstelle gibt; Aktivitäten nach dem Lauf gehen über deren API | unklar |
| Native iOS/Android-App | später | dieselbe Seite als PWA, bei Bedarf mit Capacitor verpackt | gering, Code bleibt derselbe |

Reihenfolge: Website zuerst, LiveTrack als erste echte Quelle, alles Weitere später als zusätzlicher Schreiber in `telemetry`.
