# Race Tracker

Dimas Live-Tracker für Rennen: geschätzte Position, Cheering Spots, Pinnwand, Zwischenzeiten, 3D-Strecke.
Eine Seite pro Rennen. Nachfolger des Artifacts "Dima läuft Hamburg" (Code liegt unverändert in `legacy/hamburg-2026.html`).

## Stack
- Astro 7 (static output), TypeScript strict, three.js für die 3D-Ansicht
- Supabase: Postgres, Realtime, Anonymous Sign-in für Gäste, Magic Link für Dima, RLS
- Vitest, Tests für Schätzlogik, Streckendaten und RLS (PGlite, kein Supabase-Account nötig)
- Node >= 22.18 (Skripte in scripts/ laufen direkt als .ts)

## Befehle
- `npm run dev` lokal starten
- `npm test` alle Tests (vor jedem Commit)
- `npm run check` Typecheck
- `npm run build` statischer Build nach `dist/`

## Wo was liegt
- `src/content/races/*.json` statische Rennendaten (Strecke, km, Landmarks, Wasser). Schema in `src/content.config.ts`
- `src/lib/estimate.ts` Positionsschätzung, 1:1 aus dem Legacy-Code portiert. Verhalten ist durch `tests/estimate.test.ts` festgenagelt
- `src/lib/course.ts` Geometrie (Position bei km, nächster km, Landmark in der Nähe)
- `src/styles/tokens.css` Designsystem, 1:1 aus dem Legacy-CSS. Regeln in `docs/DESIGN.md`
- `supabase/migrations/` Schema und RLS. Jede Änderung braucht einen passenden Fall in `tests/rls.test.ts`
- `legacy/hamburg-2026.html` Referenz für den Port. Nicht bearbeiten, nicht deployen
- `docs/VISION.md` Zielbild (Video München) mit prüfbaren Kriterien, Standbilder in `docs/reference/munich-video/`
- `scripts/` Datenwerkzeuge: `course-from-track.ts` (GPS-Spur wird Strecke), `streams-to-replay.ts` (Replay), `fetch-osm.ts` (3D-Szene, nur am Mac)
- `docs/ROADMAP.md` Phasen und aktueller Stand, `docs/ARCHITECTURE.md` Entscheidungen, `docs/ADVISOR.md` wann Fable 5.2 drüberschaut

## Arbeitsregeln
- Annahmen explizit nennen. Bei mehrdeutigem Auftrag die Lesarten offenlegen statt still eine zu wählen
- Simplicity first: minimaler Code, keine ungefragten Features, keine Abstraktion für Einmal-Code
- Surgical changes: nur ändern, was der Auftrag verlangt, Stil des umliegenden Codes übernehmen, nichts nebenbei umformatieren
- Goal-driven: Aufgabe in prüfbare Kriterien übersetzen. Bug: erst reproduzierender Test, dann Fix
- Beim Port aus `legacy/`: Verhalten erhalten, erst danach verbessern. Abweichungen im PR beschreiben
- Pro Phase ein Branch und ein PR, Roadmap-Checkbox im selben PR abhaken
- UI-Arbeit ist erst fertig nach der Sichtprüfung: lokal starten, Screenshots hell und dunkel, Desktop und Handy, gegen `docs/DESIGN.md` und die Referenzbilder in `docs/reference/munich-video/` prüfen, Abweichungen beheben, dann erst melden
- Nichts erfinden: keine Fantasie-Zahlen, -Zitate, -Logos oder -Sponsoren auf der Seite. Daten kommen aus `src/content/`, `public/data/` oder Supabase
- Design-Entscheidungen mit Begründung in `docs/decisions/` festhalten

## Design und Texte (verbindlich)
- Alle Regeln aus `docs/DESIGN.md`. Kurzfassung: Geist, Geist Mono nur für Zahlen, max. Gewicht 600, keine Kursive, nur Token-Abstände, nur transform/opacity animieren, eine Easing-Kurve
- UI-Texte auf Deutsch, du-Form, keine Gedankenstriche, keine Bindestriche als Satzzeichen, kein Gendern, Systemmeldungen ohne Ausrufezeichen, Formularfehler direkt am Feld
- Texte dürfen nicht nach KI klingen

## Sicherheit
- Der Supabase anon key ist öffentlich, Schutz kommt ausschließlich aus RLS. Keine Logik, die sich auf Client-Prüfungen verlässt
- Nutzereingaben nie per innerHTML ausgeben, immer textContent (Legacy macht das schon so)
- Keine Secrets ins Repo, `.env` ist ignoriert, Vorlage in `.env.example`
- Fonts und Libraries selbst hosten (npm), keine Google-Fonts-CDNs (DSGVO)
