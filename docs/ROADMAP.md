# Roadmap

Stand: 12.11.2026. Zielbild ist das Video aus München, Details und Kriterien in `docs/VISION.md`. Fable 5.2 steht bis 16.11. als Advisor zur Verfügung, deshalb liegen die Entscheidungen mit dem größten Hebel (Architektur, 3D-Konzept, Security) vorne. Wann genau Fable gefragt wird: `docs/ADVISOR.md`.

## Meilenstein: Zurich Marató Barcelona, 14.03.2027
Marathon, 42,195 km, Start 8:30 an der Plaça de Catalunya. Erster echter Live-Einsatz mit Leuten an der Strecke.
- Für den Live-Einsatz müssen Phase 1, 2, 2b, 3 und 4 fertig sein
- Zwischenziele: Phase 2 bis Mitte Dezember 2026, Phase 1 bis Mitte Januar 2027, Phase 2b und 3 bis Mitte Februar 2027, Phase 4 bis Ende Februar 2027
- Generalprobe mit Live-Daten bei einem langen Trainingslauf Anfang März 2027

## Offene Fehler
- [x] `STALE_AFTER_MS` in `src/lib/estimate.ts` ist fest 4,5 h und passt nicht zum Marathon

## Phase 0: Fundament (erledigt 12.11.)
- [x] Astro 7 + TypeScript strict + three.js + Supabase-Client
- [x] Hamburg 2026 als erstes Rennen, Strecke maschinell aus dem Legacy-Code extrahiert (188 Punkte)
- [x] Schätzlogik und Geometrie als TypeScript portiert, 15 Tests
- [x] Designsystem 1:1 übernommen, Fonts selbst gehostet
- [x] Supabase-Schema mit RLS und Rate Limit, 8 RLS-Tests gegen echtes Postgres (PGlite)
- [x] Statische Rennseite mit SVG-Karte, Startseite mit Rennliste
- [x] Hamburg-Strecke durch die echte GPS-Spur ersetzt (die Rekonstruktion lag ab km 3,6 rund 0,5 km daneben, Wende ist bei km 17,0, nicht 17,5)
- [x] Replay-Daten Hamburg aus Strava: 1500 Messpunkte mit Puls, Kadenz, Höhe, auf die Strecke projiziert
- [x] Tabelle `telemetry` für Live-Daten aus beliebigen Quellen, mit RLS-Test
- [x] OSM-Skript für Gebäude, Parks, Wasser, Bäume (läuft auf dem Mac, Overpass ist aus der Cloud gesperrt)

## Phase 1: Feature-Parität mit dem Artifact
Ziel: Alles, was "Dima läuft Hamburg" konnte, läuft auf Supabase. Prüfbar über die Checkliste.
- [ ] Supabase-Projekt anlegen, Migration einspielen, Anonymous Sign-in + CAPTCHA aktivieren, Dima als Admin plus Anzeigenamen eintragen
- [x] Migration: sieben Schema-Lücken aus Checkpoint A plus diese drei Entscheidungen, jede mit RLS-Test, beim LiveTrack-Link inklusive der Fälle fremder Host, Subdomain-Trick, `http`, Port und Zugangsdaten in der URL (`docs/decisions/2026-11-12-architektur.md`)
- [ ] Datenschicht `src/lib/live/supabase.ts`: races/spots/messages/checkpoints laden und per Realtime abonnieren
- [ ] Gast-Onboarding: anonym anmelden, Anzeigenamen setzen (ersetzt die Artifact-Profile)
- [ ] Schwebende Navigation mit Abschnittsmarkierung, Vollbildmenü mobil
- [ ] Hero mit Phase (vor dem Start, live, im Ziel) und phasenabhängiger Hauptaktion
- [ ] Statuskarte: km, Pace, Zielzeit-Prognose, "zuletzt gesehen"
- [ ] Interaktive 2D-Karte: Läufer, gelaufener Teil, Spots, Tippen setzt Spot, Neigen-Ansicht, Mobil-Labels
- [ ] Cheering Spots mit ETA, eigener Spot hervorgehoben, Konfetti bei Durchlauf
- [ ] Pinnwand mit Schnellnachrichten und "Gesehen"-Button
- [ ] Zwischenzeiten-Tabelle und Split-Eingabe (nur Dima)
- [ ] Einstellungen (nur Dima): Start, Ziel, Zielzeit, Startnummer, Start/Ziel zurücksetzen. LiveTrack-Link nur setzen über `set_livetrack_link` (nur `https://livetrack.garmin.com`, Liste erlaubter Hosts in der Funktion), angezeigt wird über `livetrack_link_status` nur "hinterlegt ja/nein" mit Zeitpunkt, nie der Link (`docs/decisions/2026-11-12-architektur.md`)
- [ ] Simulation mit Geschwindigkeitsstufen
- [ ] FAQ, Abschluss, Footer mit Quellen
- [ ] Fehlertexte aus dem Legacy übernehmen (Rate Limit, keine Rechte, offline)

## Phase 2: Video-Niveau (docs/VISION.md, Abschnitte 1 bis 5)
Ziel: Die Seite, die man Leuten zeigt. Bauschritte aus Checkpoint B (`docs/decisions/2026-11-13-3d-konzept.md`), jeder ein eigener Commit. Fokus ist Barcelona 2027: Bis Schritt 5 wurde gegen Hamburg entwickelt, ab Schritt 6 wird gegen Barcelona entwickelt und gemessen. Hamburg bleibt Testfall mit echten Replay-Daten und Archivseite.
- [x] `node scripts/fetch-osm.ts hamburg-2026` auf dem Mac ausführen, `public/data/hamburg-2026/scene.json` committen
- [x] 1. **Szenendaten reparieren.** Ringe verketten, Löcher für Wasser und Gebäude, `scene.json` aus dem Cache neu erzeugen. Prüfpunkt: Tests mit einer Relation aus mehreren Teilstücken und einer Insel. Außenalster ist eine Fläche mit einem Loch. Datei unter 5 MB. Kontrollbild der Szene von oben als SVG, Elbe und Alster haben die richtige Form
- [x] 2. **Welt und Strecke** (`world.ts`). Gemeinsame Umrechnung, `osm.ts` nutzt sie. Prüfpunkt: Test: Start liegt bei 0/0, `at(km)` weicht höchstens 1 m von `latLngAt` ab, Richtung dreht an der Wende um. `scene.json` bleibt nach dem Umbau Byte für Byte gleich
- [x] 3. **Uhr und Replay-Quelle** (`clock.ts`, `source.ts`). Die Kopie von `toLocal` in `replay.ts` wird durch `makeLocal` ersetzt. Prüfpunkt: Test "Puls ist echt": bei 1:00:00 liefert die Quelle 174. Test "Jeder Messwert kommt an": 30 s bei 10× ergeben für jeden Messpunkt einen neuen km
- [x] 4. **Geometrie als reine Funktionen** (`geometry.ts`). Kacheln, Gebäude mit Löchern, Flächen. Prüfpunkt: Tests: Dreieckszahl einer bekannten Kontur, Höhe, Hof bleibt offen. Summe über alle Kacheln liegt bei 300.000 bis 320.000 Gebäude-Dreiecken
- [ ] 4b. **Barcelona als Szene.** `npm run new-race`: GPX-Datei rein, JSON mit Route, kumulierten km und Bounds raus. Barcelona-Strecke aus der offiziellen GPX-Datei. OSM-Szene für Barcelona. Prüfpunkt: Skalierung der GPX zwischen 0,98 und 0,99. Sagrada Família liegt bei km 13,9 ± 0,3. `/barcelona-2027` baut und zeigt die Strecke. OSM-Szene unter 5 MB und unter 800 kB gzip. Kontrollbild `/dev/scene` für Barcelona: Die Strecke liegt auf den Straßen, Hafen und Meer sind Wasserflächen, offene Ringe werden gemeldet
- [x] 5. **Statische Szene** auf `/dev/view3d` mit freier Kamera. Boden, Wasser, Parks, Gebäude, Nebel, Licht, hell und dunkel. Prüfpunkt: Sichtprüfung gegen `frame-03.jpg`. Check "Gebäude sind aus OSM": Elbphilharmonie, Hauptbahnhof und Alsterhäuser an der richtigen Stelle, unterschiedlich hoch. Erste Messung von Dreiecken, Zeichenaufrufen und Zeit pro Bild, Ergebnis in diese Notiz
  - [ ] Nachtrag: mit Barcelona wiederholen
- [ ] 6. **Bäume** instanziert, nur in der Nähe. Prüfpunkt: Sichtprüfung gegen `frame-05.jpg`. Dreiecke im Folgemodus unter 120.000
- [ ] 7. **Streckenband** mit fließender Textur, gelaufener Teil kräftiger. Prüfpunkt: Bei km 12 endet der kräftige Teil unter dem Läufer. Sichtprüfung gegen `frame-04.jpg`
- [ ] 8. **Kamera-Rig** (`camera.ts`) und Bedienleiste. Prüfpunkt: Tests: kein Sprung im Übergang, Schwenk an der Wende höchstens 60° pro Sekunde, Berührung bricht ab. Sichtprüfung beider Modi
- [ ] 9. **Läufer** aus `figures.ts`, vom Replay bewegt, Größe je nach Abstand, Ring. Position über `toThree` aus `world.ts`. Prüfpunkt: In der Übersicht ist der Läufer mindestens 40 px hoch und fällt zuerst auf. Laufanimation passt zum Tempo
- [ ] 10. **Labels** (`labels.ts`) über Läufer und Spots. Prüfpunkt: Check "Labels kleben" als Playwright-Test: Kamera per Skript schnell drehen und zoomen, Label weicht in jedem Bild höchstens 1 px vom Anker ab, keine Überdeckung
- [ ] 11. **Spots:** Pins, Avatare als Grüppchen, Passieren, Konfetti, Meldung, Liste "Als Nächstes". Prüfpunkt: Check "Spots werden wirklich passiert" als Test: genau beim Überschreiten, nicht doppelt, auch beim Vorspulen über mehrere Spots
- [ ] 12. **HUD und Panel** mit Replay-Daten, mobil als Bottom Sheet. Prüfpunkt: Sichtprüfung gegen `frame-01.jpg` und `frame-05.jpg`, hell und dunkel, Desktop und Handy. Zahlen in Geist Mono
- [ ] 13. **Replay-Steuerung** ersetzt die Simulation. Mischquelle mit Rückfall auf die Schätzung. Prüfpunkt: Check "Rückfall ohne Sprung" als Test: Telemetrie 60 s abschneiden, km läuft stetig weiter, Qualität wechselt auf "geschätzt", beim Wiederkommen kein Rücksprung
- [ ] 14. **Wahrzeichen:** Sagrada Família modellieren, OSM-Klotz an der Stelle entfernen. Prüfpunkt: Sichtprüfung: ein Gebäude, kein doppeltes
- [ ] 15. **Einbau in die Rennseite.** Nachladen beim Sichtbarwerden, 2D-Karte als Platzhalter, Rückfall ohne WebGL und bei reduzierter Bewegung. Prüfpunkt: Bundle unter 250 kB gzip aus dem Build. Layout-Verschiebung 0 per Playwright. 60 Bilder pro Sekunde im Folgemodus auf Dimas Handy. Roadmap-Punkte von Phase 2 abhaken

## Phase 2b: Echte Live-Daten (VISION 6)
- [ ] Auf dem Mac prüfen, was ein geteilter Garmin-LiveTrack-Link liefert (Felder, Takt, Verzögerung), Ergebnis in `docs/decisions/`
- [ ] Poller als Supabase Edge Function oder kleiner Worker, schreibt `telemetry`
- [ ] Client: frische Telemetrie vor Schätzung, nahtloser Rückfall, Quelle und Alter im HUD
- Generalprobe: siehe Meilenstein oben, Anfang März 2027

## Phase 3: Neues Rennen in 10 Minuten
- [ ] Landmarks und Wasserstellen per kleiner Konfig ergänzen
- [ ] Performance-Budget an Barcelona prüfen
- [ ] Strecke am Meer (km 26 bis 30) hervorheben (Sagrada Família siehe Schritt 14)

## Phase 4: Live gehen
- [ ] Hosting festlegen (Vorschlag: Cloudflare Pages oder Vercel, beides kann statische Astro-Builds) und `site` in `astro.config.mjs` setzen
- [ ] Eigene Domain
- [ ] GitHub Actions: check, test, build bei jedem PR
- [ ] Env-Variablen im Hosting setzen
- [ ] OG-Bild pro Rennen

## Später
- [ ] Echte Position: Garmin-LiveTrack-Link ist schon im Schema, optional eigene PWA, die GPS sendet
- [ ] PWA mit Offline-Karte
- [ ] Hamburg-Wahrzeichen (später, optional): Elbphilharmonie aus dem Legacy portieren, OSM-Klotz an der Stelle entfernen. Gebäude-Relationen mit den Rollen `outline`/`part` (u. a. Kunsthalle) übernehmen
