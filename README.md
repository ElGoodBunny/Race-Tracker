# Race Tracker

Live-Tracker für meine Rennen: wo ich gerade bin, wann ich bei dir vorbeikomme, Cheering Spots, Pinnwand und eine 3D-Strecke.

Astro 7, TypeScript, three.js, Supabase.

## Lokal starten
```sh
npm install
npm test
npm run dev
```
Ohne `.env` läuft die Seite statisch (Strecke, Karte). Für Live-Daten `.env.example` nach `.env` kopieren und die Supabase-Werte eintragen.

## Supabase einrichten
1. Projekt anlegen (Region Frankfurt)
2. Alle Dateien aus `supabase/migrations/` in der Reihenfolge ihrer Namen im SQL Editor ausführen
3. Authentication: Anonymous Sign-ins und E-Mail (Magic Link) aktivieren, CAPTCHA einschalten
4. Einmal per Magic Link einloggen, dann als Admin eintragen (SQL in `docs/ARCHITECTURE.md`)

## Neues Rennen
JSON nach dem Muster von `src/content/races/hamburg-2026.json` anlegen und eine Zeile in `public.races` mit demselben `slug` und `distance_km` gleich `distanceKm` aus der JSON. Ab Phase 3 per `npm run new-race` aus einer GPX-Datei.

## Doku
- `CLAUDE.md` Regeln für Claude Code
- `docs/ROADMAP.md` Phasen und Stand
- `docs/ARCHITECTURE.md` Aufbau und Entscheidungen
- `docs/DESIGN.md` Designsystem
- `docs/ADVISOR.md` Review-Checkpoints mit Fable 5.2

Kartendaten: © OpenStreetMap-Mitwirkende, ODbL.
