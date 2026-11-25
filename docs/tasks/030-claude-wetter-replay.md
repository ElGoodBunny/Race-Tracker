# 030 Wetter im HUD (Replay)
Besitzer: claude
Status: review
Branch: claude/030-wetter
Roadmap: Phase 2, Schritt 12, Wetter in der oberen Leiste (VISION 4)

## Worum es geht
Die obere Leiste des HUD soll das Wetter zeigen (VISION 4). Dima hat am 25.11. entschieden: Quelle ist Open-Meteo, live laufen die Werte später über Supabase (Paket 031), nie direkt vom Browser des Zuschauers zum Anbieter. Dieses Paket baut die reine Logik, eine feste Datei für das Replay und die Anzeige.

Welches Wetter in welchem Zustand:
- Replay eines Rennens auf seiner eigenen Strecke (Hamburg): Wetter vom Renntag zur Replay-Zeit, aus `public/data/<slug>/weather.json`
- Probelauf auf einer anderen Strecke (Barcelona mit Hamburger Daten): kein Wetter, die Karte fehlt
- Vor dem Start und live: Paket 031. Bis dahin fehlt die Karte, kein "k. A." und kein heutiges Wetter neben einem alten Rennen

Annahmen:
- Replay-Zeit `t` in Sekunden ab Start, absolute Zeit ist `plannedStart + t`. Hamburg: 08:45 UTC laut Rennen-JSON, der echte Start im Block kann einige Minuten später gewesen sein. Bei 15-Minuten-Werten fällt das nicht ins Gewicht
- Ort ist die Mitte der Streckengrenzen (`course.bounds`), ein Punkt für die ganze Strecke
- Werte sind Modellwerte (Open-Meteo, `icon_seamless`), keine Messung. Für Hamburg am Renntag um 08:45 UTC gleich wie `icon_d2` (11,2 °C, 16,6 km/h, Code 3), am 25.11. verglichen

## Auftrag
1. `src/lib/live/weather.ts` mit Tests: Antwort von Open-Meteo in eine kompakte Reihe umwandeln, Wert zu einem Zeitpunkt, außerhalb der Reihe `null`, WMO-Code zu deutschem Text und Icon
2. `scripts/fetch-weather.ts <slug>`: einmal Open-Meteo (historische Vorhersage) für den Renntag, schreibt `public/data/<slug>/weather.json`. Für Hamburg ausführen und committen
3. Dritte Karte "Wetter" in der oberen Leiste von `LiveStage`, nur wenn die Datei da ist und das Replay auf der eigenen Strecke läuft
4. Quellenangabe Open-Meteo (CC BY 4.0) nur auf Seiten, die Wetter zeigen

## Erlaubte Dateien
- `src/lib/live/weather.ts` (neu), `tests/weather.test.ts` (neu), `tests/fixtures/open-meteo-hamburg-2026-10-25.json` (neu)
- `scripts/fetch-weather.ts` (neu), `public/data/hamburg-2026/weather.json` (neu)
- `src/components/LiveStage.astro`, `src/components/live-stage.ts`, `src/pages/[race].astro` und `src/pages/dev/live.astro` (nur `plannedStart` an die Live-Ansicht geben)
- diese Datei, `AGENTS.md` (Paketliste), `docs/ROADMAP.md` (Unterpunkt Schritt 12)

## Prüfpunkt
- `npm run check`, `npm test` grün, Tests erst rot, dann grün
- Hamburg-Replay bei 0:00 (08:45 UTC): 11,2 °C, bedeckt, Wind etwa 17 km/h, wie in der Fixture
- Sichtprüfung hell und dunkel, Desktop und Handy (375 px): Hamburg mit Wetter, Barcelona ohne Karte, fehlende Datei ohne Fehler

## Nicht Teil des Pakets
Live und Vorhersage vor dem Start (031: Tabelle mit RLS-Test, Edge Function, Zeitplan, Deploy durch Dima).

## Rückfragen

## Ergebnis
Umgesetzt:
- `weather.ts`: `fromOpenMeteo`, `weatherAt`, `describeWeather` (WMO-Code zu Text und Phosphor-Icon), `weatherLine`. 9 Tests gegen eine echte Antwort von Open-Meteo als Fixture, erst rot (Modul fehlt), dann grün
- `scripts/fetch-weather.ts hamburg-2026` einmal gelaufen: 96 Werte zu 15 min, alle mit Temperatur, Punkt 53.5602/9.947854 (Open-Meteo rastet auf sein Gitter), 2,5 kB
- Dritte Karte "Wetter" in der oberen Leiste mit Icon (`aria-hidden`), Temperatur in Geist Mono, Zustand und Wind als Text. Nur bei `slug === recording` und vorhandener Datei, sonst fehlt die Karte. Quellenangabe hängt an der OSM-Zeile und erscheint nur mit Wetter: Link "Weather data by Open-Meteo.com" und Link zur Lizenz, wie die Lizenzseite von Open-Meteo es verlangt (am 25.11. gelesen), dazu "Modell ICON des DWD"
- Icons: 9 Phosphor-Icons (regular, @phosphor-icons/core 2.1.1, MIT) als `<symbol>` eingebettet, keine neue Abhängigkeit

Abweichungen:
- `src/pages/[race].astro` und `src/pages/dev/live.astro` geben zusätzlich `plannedStart` an die Live-Ansicht, sonst kennt sie die Uhrzeit des Replays nicht (Liste der erlaubten Dateien ergänzt)
- Obere Leiste endet jetzt links vom Panel und bricht um, sonst rutschte die dritte Karte bei 800 bis 1000 px unter das Panel. Auf dem Handy entfällt der Wind, sonst lief die Karte in die Kamera-Leiste
- `.stat[hidden]` zur Regel für versteckte Elemente ergänzt: `.stat { display: flex }` hatte `hidden` überschrieben, Barcelona zeigte eine leere Karte

Geprüft (nach dem letzten CSS-Stand):
- `npm run check` 0 Fehler, `npm test` 377 grün
- Hamburg bei 0:49 Rennzeit (08:45 UTC): "11 °C", "bedeckt, Wind 17 km/h", wie in der Fixture. Per `__live.seek(3600)` auf 1:00:00 (09:45 UTC): "12 °C", "teils bewölkt", Icon wechselt auf `cloud-sun`, wie in der Datei (11,9 °C, Code 2)
- Sichtprüfung `/dev/live`: Hamburg dunkel 1280 px und 375 px, Barcelona hell 1280 px und dunkel 375 px (zwei Karten, keine Quellenangabe für Wetter), hell 900 px (Wetter in zweiter Zeile, nichts unter dem Panel). Rennseite Hamburg hell 1280 px und 375 px
- Fehlende Datei: `weather.json` kurz entfernt, HUD läuft, Karte und Quellenangabe fehlen, nur der erwartete 404 in der Konsole
- Lizenz: Seite open-meteo.com/en/licence im Browser gelesen. Verlangt wird ein Link neben den Daten und ein Link zur Lizenz, beides drin

Offen:
- Vor dem Start und live: Paket 031
- Glasregel aus `docs/DESIGN.md` (Ergänzung 25.11.: höchstens drei Glasflächen, Fallbacks aus `tokens.css`) gegen das HUD: Es zeigt jetzt fünf Glasflächen (drei Karten, Panel, Kamera-Leiste), und `.card` in `LiveStage` hat eigene Unschärfe ohne die Fallbacks. Nicht Teil dieses Pakets. Dima entscheidet: Regel anpassen oder HUD umbauen
- Auf dem Handy bricht die Puls-Zeile "Ø 63, max 77" jetzt um, weil drei Karten nebeneinander stehen
- Die 403 auf Schriftdateien und der 504 der Dev-Toolbar im Dev-Server dieses Worktrees kommen nicht aus dem Paket (Pfad zu `node_modules` im Hauptordner)

## Review
