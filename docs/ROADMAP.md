# Roadmap

Stand: 12.11.2026. Zielbild ist das Video aus München, Details und Kriterien in `docs/VISION.md`. Fable 5.2 steht bis 16.11. als Advisor zur Verfügung, deshalb liegen die Entscheidungen mit dem größten Hebel (Architektur, 3D-Konzept, Security) vorne. Wann genau Fable gefragt wird: `docs/ADVISOR.md`.

## Meilenstein: Zurich Marató Barcelona, 14.03.2027
Marathon, 42,195 km, Start 8:30 an der Plaça de Catalunya. Erster echter Live-Einsatz mit Leuten an der Strecke.
- Für den Live-Einsatz müssen Phase 1, 2, 2b, 3 und 4 fertig sein
- Ziel seit 24.11.: Code fertig bis 22.12.2026. Fällt Woche 1 bei Dima aus, rutscht alles auf Mitte Januar 2027. Beides lässt bis zum Rennen Puffer
- Generalprobe mit Live-Daten bei einem langen Trainingslauf Anfang März 2027

## Plan bis 22.12.2026 (Stand 24.11.)
Lage: Die 3D-Ansicht steht auf `/dev/live`, die Rennseite `[race].astro` ist noch die statische Seite aus Phase 0. Von Phase 1 ist nur die Migration erledigt, ohne Supabase-Projekt (keine `.env`) geht dort nichts weiter. Wie Garmin LiveTrack Daten liefert, ist ungemessen. Engpass sind deshalb Dimas Aufgaben und die Zahl der Arbeitstage, nicht der Code. Annahme: 3 Arbeitstage pro Woche.

Reihenfolge nach Abhängigkeit und Risiko, nicht nach Phasennummer:
- **Woche 1 (bis 1.12.)**
  - Dima bis 27.11.: Supabase-Projekt anlegen, Migration einspielen, Anonymous Sign-in und CAPTCHA an, `.env` lokal
  - Dima bis 1.12.: Bei einem Trainingslauf LiveTrack teilen und den Link aufheben
  - Dima: Hosting-Konto (Cloudflare Pages oder Vercel), damit jeder Merge als Vorschau online steht
  - Claude: Schritt 15 und Replay-Steuerung (13): 3D aus `/dev/live` in die Rennseite. Phase 1 baut darauf auf, beides landet in `[race].astro`, deshalb nacheinander und nicht parallel
- **Woche 2 (bis 8.12.)**: Phase 1 Datenschicht, Gast-Onboarding, Cheering Spots, Pinnwand gegen Supabase. Auswertung LiveTrack, Schwelle für "geschätzt" festlegen
- **Woche 3 (bis 15.12.)**: Phase 1 Einstellungen und Splits (nur Dima), Hero, Statuskarte, Fehlertexte. Phase 2b Poller
- **Woche 4 (bis 22.12.)**: Phase 2b Client, Phase 3, Puffer. Erste Probe mit Live-Daten bei einem Trainingslauf

Bis zum Live-Einsatz zurückgestellt:
- Feinschliff an der 3D-Ansicht (Art der Pakete 013 bis 015) und Schritt 14 Sagrada Família, der OSM-Klotz bleibt
- Simulation aus Phase 1, die Replay-Steuerung ersetzt sie
- Wetter und offizielle Splits im HUD, eigene Domain, OG-Bild
- Schwebende Navigation und FAQ nur in einfacher Form

Arbeitsweise: Pakete größer schneiden, Ergebnis in einem Commit statt mehrerer `docs:`-Commits. Gemini nur für Skripte am Mac (LiveTrack), Sichtprüfungen macht Claude (Paket 011).

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
  - [x] 24.11.: Projekt in Frankfurt, drei Migrationen, Barcelona in `races`, Dima als Admin mit Profil, `.env` lokal. Gegen das Projekt geprüft: Lesen geht, `race_secrets` und `admins` leer, anonymes Schreiben scheitert mit `profile required`, `subscribeRace` lädt Barcelona und abonniert (Status `live`)
  - [ ] CAPTCHA (Cloudflare Turnstile) und Limit für anonyme Anmeldungen pro IP, kommt mit dem Gast-Onboarding
- [x] Migration: sieben Schema-Lücken aus Checkpoint A plus diese drei Entscheidungen, jede mit RLS-Test, beim LiveTrack-Link inklusive der Fälle fremder Host, Subdomain-Trick, `http`, Port und Zugangsdaten in der URL (`docs/decisions/2026-11-12-architektur.md`)
- [x] Datenschicht `src/lib/live/supabase.ts`: races/spots/messages/checkpoints laden und per Realtime abonnieren
  - [x] `subscribeRace` mit Tests gegen einen nachgebauten Client (Paket 018), gegen das echte Projekt geladen und abonniert. Offen: ein Realtime-Ereignis echt empfangen, braucht einen Schreibzugriff mit Login
- [x] Gast-Onboarding: anonym anmelden, Anzeigenamen setzen (ersetzt die Artifact-Profile) (Paket 024)
- [ ] Schwebende Navigation mit Abschnittsmarkierung, Vollbildmenü mobil
- [x] Hero mit Phase (vor dem Start, live, im Ziel) und phasenabhängiger Hauptaktion (Paket 029)
- [x] Statuskarte: km, Pace, Zielzeit-Prognose, "zuletzt gesehen" (Paket 027)
- [ ] Interaktive 2D-Karte: Läufer, gelaufener Teil, Spots, Tippen setzt Spot, Neigen-Ansicht, Mobil-Labels
- [x] Cheering Spots mit ETA, eigener Spot hervorgehoben, Konfetti bei Durchlauf (Paket 025)
- [x] Pinnwand mit Schnellnachrichten und "Gesehen"-Button (Pakete 024 und 026)
- [ ] Zwischenzeiten-Tabelle und Split-Eingabe (nur Dima)
  - [x] Tabelle mit offiziell, geschätzt, Plan und Prognose (Paket 028). Offen: Eingabe, kommt mit Dimas Anmeldung (Einstellungen)
- [ ] Einstellungen (nur Dima): Start, Ziel, Zielzeit, Startnummer, Start/Ziel zurücksetzen. LiveTrack-Link nur setzen über `set_livetrack_link` (nur `https://livetrack.garmin.com`, Liste erlaubter Hosts in der Funktion), angezeigt wird über `livetrack_link_status` nur "hinterlegt ja/nein" mit Zeitpunkt, nie der Link (`docs/decisions/2026-11-12-architektur.md`)
- [ ] Simulation mit Geschwindigkeitsstufen
- [ ] FAQ, Abschluss, Footer mit Quellen
- [ ] Fehlertexte aus dem Legacy übernehmen (Rate Limit, keine Rechte, offline)
  - [x] Texte als `errorText` in `src/lib/live/errors.ts` (Paket 019). Anzeige kommt mit dem Schreiben

## Phase 2: Video-Niveau (docs/VISION.md, Abschnitte 1 bis 5)
Ziel: Die Seite, die man Leuten zeigt. Bauschritte aus Checkpoint B (`docs/decisions/2026-11-13-3d-konzept.md`), jeder ein eigener Commit. Fokus ist Barcelona 2027: Bis Schritt 5 wurde gegen Hamburg entwickelt, ab Schritt 6 wird gegen Barcelona entwickelt und gemessen. Hamburg bleibt Testfall mit echten Replay-Daten und Archivseite.
- [x] `node scripts/fetch-osm.ts hamburg-2026` auf dem Mac ausführen, `public/data/hamburg-2026/scene.json` committen
- [x] 1. **Szenendaten reparieren.** Ringe verketten, Löcher für Wasser und Gebäude, `scene.json` aus dem Cache neu erzeugen. Prüfpunkt: Tests mit einer Relation aus mehreren Teilstücken und einer Insel. Außenalster ist eine Fläche mit einem Loch. Datei unter 5 MB. Kontrollbild der Szene von oben als SVG, Elbe und Alster haben die richtige Form
- [x] 2. **Welt und Strecke** (`world.ts`). Gemeinsame Umrechnung, `osm.ts` nutzt sie. Prüfpunkt: Test: Start liegt bei 0/0, `at(km)` weicht höchstens 1 m von `latLngAt` ab, Richtung dreht an der Wende um. `scene.json` bleibt nach dem Umbau Byte für Byte gleich
- [x] 3. **Uhr und Replay-Quelle** (`clock.ts`, `source.ts`). Die Kopie von `toLocal` in `replay.ts` wird durch `makeLocal` ersetzt. Prüfpunkt: Test "Puls ist echt": bei 1:00:00 liefert die Quelle 174. Test "Jeder Messwert kommt an": 30 s bei 10× ergeben für jeden Messpunkt einen neuen km
- [x] 4. **Geometrie als reine Funktionen** (`geometry.ts`). Kacheln, Gebäude mit Löchern, Flächen. Prüfpunkt: Tests: Dreieckszahl einer bekannten Kontur, Höhe, Hof bleibt offen. Summe über alle Kacheln lag bei 300.000 bis 320.000 Gebäude-Dreiecken, seit Schritt 5b (vereinfachte Umrisse) bei 170.000 bis 185.000
- [x] 4b. **Barcelona als Szene.** `npm run new-race`: GPX-Datei rein, JSON mit Route, kumulierten km und Bounds raus. Barcelona-Strecke aus der offiziellen GPX-Datei. OSM-Szene für Barcelona. Prüfpunkt: Skalierung der GPX zwischen 0,98 und 0,99. Sagrada Família liegt bei km 13,9 ± 0,3. `/barcelona-2027` baut und zeigt die Strecke. OSM-Szene unter 5 MB und unter 800 kB gzip. Kontrollbild `/dev/scene` für Barcelona: Die Strecke liegt auf den Straßen, Hafen und Meer sind Wasserflächen, offene Ringe werden gemeldet
  - Budget Szene pro Rennen: `scene.json` höchstens 800 kB gzip, `trees.json` höchstens 200 kB gzip (`docs/decisions/2026-11-13-meer.md`)
  - [x] Längenunterschied geklärt: Die Strava-Route (`barcelona-strava.gpx`, 42,737 km) ist 408 m länger als die goandrace-Spur 2025 (`barcelona-2025.gpx`, 42,329 km). Der Unterschied wächst gleichmäßig um etwa 10 m pro km, größter Einzelsprung 17 m, kein doppelter Abschnitt. Ursache: Die Strava-Route folgt der OSM-Straßengeometrie, die goandrace-Spur hat 50 m Punktabstand und schneidet Kurven
- [x] 5. **Statische Szene** auf `/dev/view3d` mit freier Kamera. Boden, Wasser, Parks, Gebäude, Nebel, Licht, hell und dunkel. Prüfpunkt: Sichtprüfung gegen `frame-03.jpg`. Check "Gebäude sind aus OSM": Elbphilharmonie, Hauptbahnhof und Alsterhäuser an der richtigen Stelle, unterschiedlich hoch. Erste Messung von Dreiecken, Zeichenaufrufen und Zeit pro Bild, Ergebnis in diese Notiz
  - [x] Nachtrag: mit Barcelona wiederholen
- [x] 5b. **Budget Barcelona:** Umrisse mit 2 m vereinfacht, Hochhäuser ab 50 m bleiben voll. Übersicht 377.000 statt 926.000 Dreiecke (Ziel höchstens 400.000), Folgemodus 58.000 bis 65.000 statt 130.000 bis 143.000 (Ziel höchstens 120.000). Ergebnis in `docs/decisions/2026-11-13-3d-konzept.md`
- [x] 6. **Bäume** instanziert, nur in der Nähe. Prüfpunkt: Sichtprüfung gegen `frame-05.jpg`. Dreiecke im Folgemodus unter 120.000 (gemessen höchstens 102.237 an den dichtesten Stellen, Bäume bis 300 m Kameraabstand)
- [x] 7. **Streckenband** mit fließender Textur, gelaufener Teil kräftiger. Prüfpunkt: Bei km 12 endet der kräftige Teil unter dem Läufer. Sichtprüfung gegen `frame-04.jpg`
- [x] 8. **Kamera-Rig** (`camera.ts`) und Bedienleiste. Prüfpunkt: Tests: kein Sprung im Übergang, Schwenk an der Wende höchstens 60° pro Sekunde, Berührung bricht ab. Sichtprüfung beider Modi
  - [x] Zoom mit zwei Fingern beim Folgen, ohne die Kamera freizugeben (Abstand 100 bis 400 m, Paket 014)
- [ ] 9. **Läufer** aus `figures.ts`, vom Replay bewegt, Größe je nach Abstand, Ring. Position über `toThree` aus `world.ts`. Prüfpunkt: In der Übersicht ist der Läufer mindestens 40 px hoch und fällt zuerst auf. Laufanimation passt zum Tempo
- [x] 10. **Labels** (`labels.ts`) über Läufer und Spots. Prüfpunkt: Check "Labels kleben" als Playwright-Test: Kamera per Skript schnell drehen und zoomen, Label weicht in jedem Bild höchstens 1 px vom Anker ab, keine Überdeckung
  - [ ] Spot-Namen in der Übersicht beim Antippen (gehört zu Schritt 11), km-Marken (gehört zu Schritt 7)
- [ ] 11. **Spots:** Pins, Avatare als Grüppchen, Passieren, Konfetti, Meldung, Liste "Als Nächstes". Prüfpunkt: Check "Spots werden wirklich passiert" als Test: genau beim Überschreiten, nicht doppelt, auch beim Vorspulen über mehrere Spots
- [ ] 12. **HUD und Panel** mit Replay-Daten, mobil als Bottom Sheet. Prüfpunkt: Sichtprüfung gegen `frame-01.jpg` und `frame-05.jpg`, hell und dunkel, Desktop und Handy. Zahlen in Geist Mono
  - [x] Obere Leiste, Panel und Bottom Sheet auf `/dev/live` mit Replay-Daten, Sichtprüfung hell und dunkel, Desktop und Handy (`docs/decisions/2026-11-13-3d-konzept.md`)
  - [ ] Wetter, Live-Indikator, Avatar, Startzeit und letzter offizieller Split (brauchen Supabase, Wetterquelle und offizielle Splits)
- [ ] 13. **Replay-Steuerung** ersetzt die Simulation. Mischquelle mit Rückfall auf die Schätzung. Prüfpunkt: Check "Rückfall ohne Sprung" als Test: Telemetrie 60 s abschneiden, km läuft stetig weiter, Qualität wechselt auf "geschätzt", beim Wiederkommen kein Rücksprung
  - [x] Mischquelle mit Rückfall und Check "Rückfall ohne Sprung" als Test (`mixedSource`, `tests/mixed-source.test.ts`)
  - [ ] Schwelle für "geschätzt" nach der LiveTrack-Messung festlegen (Vorschlag 90 s, Check und Demo nehmen 30 s)
  - [x] Replay-Steuerung auf der Rennseite (Paket 017)
- [ ] 14. **Wahrzeichen:** Sagrada Família modellieren, OSM-Klotz an der Stelle entfernen. Prüfpunkt: Sichtprüfung: ein Gebäude, kein doppeltes
  - [ ] Sagrada Família hat in OSM keine Höhe (30 m Pauschale)
- [ ] 15. **Einbau in die Rennseite.** Nachladen beim Sichtbarwerden, 2D-Karte als Platzhalter, Rückfall ohne WebGL und bei reduzierter Bewegung. Prüfpunkt: Bundle unter 250 kB gzip aus dem Build. Layout-Verschiebung 0 per Playwright. 60 Bilder pro Sekunde im Folgemodus auf Dimas Handy. Roadmap-Punkte von Phase 2 abhaken
  - [x] Einbau mit Nachladen, 2D-Karte als Platzhalter, Rückfall ohne WebGL. 3D-Bundle 165 kB gzip, Skript der Rennseite 1,2 kB. Layout-Verschiebung 0 per Playwright (Paket 017)
  - [ ] 60 Bilder pro Sekunde im Folgemodus auf Dimas Handy, sobald eine Vorschau online ist

## Phase 2b: Echte Live-Daten (VISION 6)
- [ ] Auf dem Mac prüfen, was ein geteilter Garmin-LiveTrack-Link liefert (Felder, Takt, Verzögerung), Ergebnis in `docs/decisions/`
- [ ] Poller als Supabase Edge Function oder kleiner Worker, schreibt `telemetry`
- [ ] Client: frische Telemetrie vor Schätzung, nahtloser Rückfall, Quelle und Alter im HUD
- Generalprobe: siehe Meilenstein oben, Anfang März 2027

## Phase 3: Neues Rennen in 10 Minuten
- [ ] Landmarks und Wasserstellen per kleiner Konfig ergänzen
- [ ] Performance-Budget an Barcelona prüfen
- [ ] Strecke am Meer (km 27 bis 30, gemessen gegen OSM-Küstenlinie, Grenze 300 m) hervorheben (Sagrada Família siehe Schritt 14)

## Phase 4: Live gehen
- [x] Hosting festlegen und `site` in `astro.config.mjs` setzen: Cloudflare Worker `race-tracker` mit statischen Assets (`wrangler.jsonc`), Production aus `main`, andere Branches als Preview unter `<branch>-race-tracker.dmitrij-helmer.workers.dev`
- [ ] Eigene Domain
- [x] CI: check, test, build, Audit, Secret- und SAST-Scan in `.gitlab-ci.yml` (GitLab statt GitHub Actions)
- [x] Env-Variablen im Hosting setzen (Build-Variablen am Worker: `NODE_VERSION`, `PUBLIC_SUPABASE_URL`, `PUBLIC_SUPABASE_ANON_KEY`)
- [ ] OG-Bild pro Rennen

## Später
- [ ] Echte Position: Garmin-LiveTrack-Link ist schon im Schema, optional eigene PWA, die GPS sendet
- [ ] PWA mit Offline-Karte
- [ ] Hamburg-Wahrzeichen (später, optional): Elbphilharmonie aus dem Legacy portieren, OSM-Klotz an der Stelle entfernen. Gebäude-Relationen mit den Rollen `outline`/`part` (u. a. Kunsthalle) übernehmen
