# Roadmap

Stand: 12.11.2026. Zielbild ist das Video aus München, Details und Kriterien in `docs/VISION.md`. Fable 5.2 steht bis 16.11. als Advisor zur Verfügung, deshalb liegen die Entscheidungen mit dem größten Hebel (Architektur, 3D-Konzept, Security) vorne. Wann genau Fable gefragt wird: `docs/ADVISOR.md`.

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
- [ ] Supabase-Projekt anlegen, Migration einspielen, Anonymous Sign-in + CAPTCHA aktivieren, Dima als Admin eintragen
- [ ] Datenschicht `src/lib/live.ts`: races/spots/messages/checkpoints laden und per Realtime abonnieren
- [ ] Gast-Onboarding: anonym anmelden, Anzeigenamen setzen (ersetzt die Artifact-Profile)
- [ ] Schwebende Navigation mit Abschnittsmarkierung, Vollbildmenü mobil
- [ ] Hero mit Phase (vor dem Start, live, im Ziel) und phasenabhängiger Hauptaktion
- [ ] Statuskarte: km, Pace, Zielzeit-Prognose, "zuletzt gesehen"
- [ ] Interaktive 2D-Karte: Läufer, gelaufener Teil, Spots, Tippen setzt Spot, Neigen-Ansicht, Mobil-Labels
- [ ] Cheering Spots mit ETA, eigener Spot hervorgehoben, Konfetti bei Durchlauf
- [ ] Pinnwand mit Schnellnachrichten und "Gesehen"-Button
- [ ] Zwischenzeiten-Tabelle und Split-Eingabe (nur Dima)
- [ ] Einstellungen (nur Dima): Start, Ziel, Zielzeit, Startnummer, LiveTrack-Link, Start/Ziel zurücksetzen
- [ ] Simulation mit Geschwindigkeitsstufen
- [ ] FAQ, Abschluss, Footer mit Quellen
- [ ] Fehlertexte aus dem Legacy übernehmen (Rate Limit, keine Rechte, offline)

## Phase 2: Video-Niveau (docs/VISION.md, Abschnitte 1 bis 5)
Ziel: Die Seite, die man Leuten zeigt. Fable-Checkpoint B vorher. Entwickelt wird gegen das Hamburg-Replay, dafür braucht es kein laufendes Rennen.
- [x] `node scripts/fetch-osm.ts hamburg-2026` auf dem Mac ausführen, `public/data/hamburg-2026/scene.json` committen
- [ ] View3D aus dem Legacy als TypeScript-Modul portieren, three.js aus npm, Lazy Loading behalten, Gebäude aus `scene.json`
- [ ] Läuferfigur, Pins, Avatare, Konfetti, Meldungen (VISION 2 und 3)
- [ ] HUD und Panel mit Replay-Daten (VISION 4)
- [ ] Replay-Modus ersetzt die Simulation (VISION 5)
- [ ] Performance-Budget: Mittelklasse-Handy 60 fps im Folgemodus, 3D-Bundle unter 250 kB gzip, kein Layout Shift
- [ ] Fallback ohne WebGL und bei prefers-reduced-motion

## Phase 2b: Echte Live-Daten (VISION 6)
- [ ] Auf dem Mac prüfen, was ein geteilter Garmin-LiveTrack-Link liefert (Felder, Takt, Verzögerung), Ergebnis in `docs/decisions/`
- [ ] Poller als Supabase Edge Function oder kleiner Worker, schreibt `telemetry`
- [ ] Client: frische Telemetrie vor Schätzung, nahtloser Rückfall, Quelle und Alter im HUD
- [ ] Generalprobe bei einem Trainingslauf

## Phase 3: Neues Rennen in 10 Minuten
- [ ] `npm run new-race`: GPX-Datei rein, JSON mit Route, kumulierten km und Bounds raus
- [ ] Landmarks und Wasserstellen per kleiner Konfig ergänzen
- [ ] Nächstes Rennen anlegen

## Phase 4: Live gehen
- [ ] Hosting festlegen (Vorschlag: Cloudflare Pages oder Vercel, beides kann statische Astro-Builds) und `site` in `astro.config.mjs` setzen
- [ ] Eigene Domain
- [ ] GitHub Actions: check, test, build bei jedem PR
- [ ] Env-Variablen im Hosting setzen
- [ ] OG-Bild pro Rennen

## Später
- [ ] Echte Position: Garmin-LiveTrack-Link ist schon im Schema, optional eigene PWA, die GPS sendet
- [ ] PWA mit Offline-Karte
