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
1. Projekt anlegen, Region Frankfurt (eu-central-1). "Grant API access to new tables automatically" anhaken, die Migrationen vergeben keine Tabellenrechte, ohne das liest die Seite nichts
2. Alle Dateien aus `supabase/migrations/` in der Reihenfolge ihrer Namen im SQL Editor ausführen, jede in einem leeren Tab. Der Editor führt alles als einen Block aus, ein Rest alten Textes rollt die ganze Datei zurück
3. Jedes Rennen außer Hamburg als Zeile in `public.races` anlegen (siehe "Neues Rennen")
4. Authentication: Anonymous Sign-ins und E-Mail (Magic Link) aktivieren, CAPTCHA einschalten
5. Dima unter Authentication › Users › Add user › Create new user anlegen ("Auto Confirm User"), dann als Admin eintragen (SQL in `docs/ARCHITECTURE.md`). Eine Login-Seite gibt es dafür noch nicht
6. `.env` aus `.env.example`: Project URL und der publishable Key (`sb_publishable_…`) oder der alte anon Key. Nie den secret oder service_role Key
7. Kostenlose Projekte pausieren nach 7 Tagen ohne Zugriff. Vor einem Rennen prüfen

## Neues Rennen
JSON nach dem Muster von `src/content/races/hamburg-2026.json` anlegen und eine Zeile in `public.races` mit demselben `slug` und `distance_km` gleich `distanceKm` aus der JSON. Ab Phase 3 per `npm run new-race` aus einer GPX-Datei.

## Doku
- `CLAUDE.md` Regeln für Claude Code
- `docs/ROADMAP.md` Phasen und Stand
- `docs/ARCHITECTURE.md` Aufbau und Entscheidungen
- `docs/DESIGN.md` Designsystem
- `docs/ADVISOR.md` Review-Checkpoints mit Fable 5.2

Kartendaten: © OpenStreetMap-Mitwirkende, ODbL.
