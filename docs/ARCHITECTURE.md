# Architektur

## Grundidee
Statisch, was statisch ist. Live, was sich am Renntag ändert.

- **Statisch im Repo** (`src/content/races/<slug>.json`): Strecke, kumulierte km pro Punkt, Landmarks, Wasserstellen, Kartenflächen, Datum, Startnummer, Ergebnis. Wird zur Build-Zeit validiert (Zod-Schema) und als HTML/SVG vorgerendert. Die Seite ist ohne JavaScript und ohne Backend lesbar.
- **Live in Supabase**: tatsächliche Startzeit, Zielzeit, Zielzeit-Vorgabe, Spots, Pinnwand, Zwischenzeiten und Sichtungen. Der Browser lädt und abonniert per Realtime.
- **Telemetrie** (`telemetry`): echte Messwerte von der Uhr, egal aus welcher Quelle (LiveTrack, später Connect IQ, Apple Watch, Coros). Frische Telemetrie schlägt die Schätzung, sonst läuft die Schätzung weiter.
- **Replay** (`public/data/<slug>/replay.json`): aufgezeichnete Streams, auf die Strecke projiziert. Gleiches Format wie Telemetrie, dient als Demo und Entwicklungsdaten.
- **Szene** (`public/data/<slug>/scene.json`): OSM-Gebäude, Parks, Wasser, Bäume in lokalen Metern, einmal pro Rennen erzeugt.
- **Schätzung im Browser**: `estimate()` rechnet aus Startzeit, Zielpace und Checkpoints die Position. Keine Serverlogik nötig.

## Abbildung der alten Artifact-Collections
| Artifact | Supabase |
|---|---|
| `race/config` | `races` (eine Zeile pro Rennen, `slug` = Dateiname) |
| `spots` | `spots` |
| `msgs` | `messages` (`text` heißt jetzt `body`) |
| `checkpoints` | `checkpoints` (`net` → `net_sec`, `at` → `seen_at`) |
| Artifact-Login, `isOwner` | `admins` + `is_admin()` |
| Artifact-Profile (Name, Avatar) | `profiles` (Anzeigename) |

## Rollen
- **Besuch ohne Login**: liest alles.
- **Gast** (anonymer Supabase-Account mit Anzeigenamen): setzt Spots, schreibt auf die Pinnwand, meldet Sichtungen, löscht nur Eigenes. Max. 10 Einträge pro Tabelle in 10 Minuten.
- **Dima** (Magic Link, in `admins`): alles, inklusive offizieller Splits und Renneinstellungen.

Dima als Admin eintragen (einmalig im SQL Editor, nach dem ersten Magic-Link-Login):
```sql
insert into public.admins (user_id)
select id from auth.users where email = 'DEINE-MAIL';
```

## Entscheidungen
- **Astro statt SPA-Framework**: Rennseiten sind größtenteils statisch, Live-Teile sind Inseln. Kleinster JS-Footprint, schnellster erster Eindruck.
- **three.js aus npm** statt CDN: Versionen fest, kein Drittanbieter-Request, Lazy Loading per dynamic import.
- **Fonts selbst gehostet** (`@fontsource-variable/geist`): keine Google-Fonts-Requests (DSGVO, LG München 2022).
- **RLS wird getestet** statt nur geschrieben: `tests/rls.test.ts` spielt die Migration in PGlite ein und prüft jede Regel.
- **Offene Punkte** für Fable-Checkpoint A: siehe `docs/ADVISOR.md`.
