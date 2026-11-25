# 031 Wetter live über Supabase
Besitzer: claude
Status: offen
Branch: claude/031-wetter-live
Roadmap: Phase 2, Schritt 12, Wetter vor dem Start und live (VISION 4)

## Worum es geht
030 zeigt das Wetter im Replay aus einer festen Datei. Vor dem Start und am Renntag braucht es aktuelle Werte. Dima hat am 25.11. entschieden: Ein Server holt sie bei Open-Meteo und legt sie in Supabase ab, die Seite liest sie von dort. Der Browser der Zuschauer spricht nie direkt mit dem Anbieter (keine IP-Weitergabe, gleiche Linie wie selbst gehostete Fonts).

Welches Wetter in welchem Zustand:
- Vor dem Start: Vorhersage für die Startzeit, sobald Open-Meteo sie liefert (Vorhersage reicht etwa 16 Tage). Davor fehlt die Karte
- Live: aktueller Wert mit Alter. Älter als 45 min: Karte ausblenden
- Im Ziel: Werte vom Renntag, wie im Replay

## Auftrag
1. Migration: Tabelle `weather` (Rennen, Zeitpunkt, Werte wie in `WeatherSeries`, Modell, Abrufzeit). Lesen für alle, Schreiben nur mit Service-Rolle. Fall in `tests/rls.test.ts`: anonym und als Gast nicht schreibbar, lesbar für alle
2. Edge Function `weather` (Deno): für Rennen im Fenster "2 Tage vor dem Start bis 6 Stunden nach dem Start" Open-Meteo abfragen und die nächsten Stunden in `weather` schreiben. Reine Logik (Fenster, Umwandlung) in `src/lib/live/weather.ts` mit Tests, die Funktion nutzt sie
3. Zeitplan alle 15 min (pg_cron plus pg_net oder Supabase Scheduler). Einrichten und Deploy macht Dima, Anleitung hier im Paket
4. Datenschicht: `weather` in `subscribeRace` aufnehmen (Realtime), HUD-Karte aus 030 nimmt diese Werte, wenn kein Replay läuft

## Erlaubte Dateien
- `supabase/migrations/<neu>_weather.sql`, `tests/rls.test.ts` (nur neuer Fall)
- `supabase/functions/weather/index.ts` (neu)
- `src/lib/live/weather.ts`, `tests/weather.test.ts`, `src/lib/live/supabase.ts`, `tests/live-supabase.test.ts`
- `src/components/live-stage.ts`, `src/components/LiveStage.astro`
- diese Datei, `AGENTS.md`, `docs/ROADMAP.md`

## Prüfpunkt
- `npm run check`, `npm test` grün, RLS-Fall erst rot, dann grün
- Nach Dimas Deploy: eine Zeile in `weather` für Barcelona, sobald der Start im Fenster liegt. Bis dahin per Testaufruf mit einem vorgezogenen Fenster
- Sichtprüfung vor dem Start, live (vorgestellte Uhr wie in 029) und mit veralteten Werten

## Nicht Teil des Pakets
Der LiveTrack-Poller aus Phase 2b. Beide Funktionen sollen später denselben Zeitplan nutzen können, das wird dort entschieden.

## Rückfragen

## Ergebnis

## Review
