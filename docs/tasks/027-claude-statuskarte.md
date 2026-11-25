# 027 Statuskarte
Besitzer: claude
Status: review
Branch: claude/027-statuskarte
Roadmap: Phase 1, Statuskarte: km, Pace, Zielzeit-Prognose, "zuletzt gesehen"

## Worum es geht
Im Legacy sagt die Statuskarte "Wo ist Dima?", wie weit er ist, wie schnell, wann er ankommt und worauf die Schätzung beruht. Auf der Rennseite fehlt sie, der Gesehen-Button (026) steht deshalb lose unter der Strecke.

Annahmen:
- Platz unter der 3D-Ansicht statt daneben, Begründung in `docs/decisions/2026-11-25-statuskarte.md`
- Fehlt das Ziel in der Datenbank, gilt das Ergebnis aus `src/content/races/` (`result.netSec`), sobald Start plus Nettozeit vorbei ist. Sonst stünde Hamburg auf "Keine Daten", obwohl oben "Netto 1:47:05" steht. Wie in 025 bei Start und Zielzeit
- Name des Läufers aus `races.runner_name`, sonst "Dima"

## Auftrag
1. `src/lib/live/status.ts` mit Tests zuerst: `statusView(est, …)` liefert Phase, große Zahl, drei Werte, Grundlage und Fortschritt, Texte aus `renderStatus()` im Legacy
2. `raceEstimate` nimmt das Ergebnis aus der Rennen-JSON, Test zuerst
3. `Status.astro` mit `status.ts` in `#live`, Gesehen-Button in die Karte, am Handy vor der 3D-Ansicht
4. Spots und Gesehen-Button bekommen dasselbe Ergebnis

## Erlaubte Dateien
- `src/lib/live/status.ts` (neu), `tests/status.test.ts` (neu), `src/lib/live/spots.ts`, `tests/spots.test.ts`
- `src/components/Status.astro` (neu), `src/components/status.ts` (neu), `src/components/Seen.astro`, `src/components/Spots.astro`
- `src/pages/[race].astro`
- `docs/decisions/2026-11-25-statuskarte.md` (neu), diese Datei, `AGENTS.md` (Paketliste), `docs/ROADMAP.md` (Checkbox)

## Prüfpunkt
- Tests zuerst, rot ohne Modul
- `npm run check`, `npm test` grün
- Sichtprüfung hell und dunkel, Desktop und Handy, in den Phasen vor dem Start, live und im Ziel

## Nicht Teil des Pakets
Streckenband mit Markierungen und Spot-Fähnchen aus dem Legacy, Garmin-Button, Hero mit Phase (029), Zwischenzeiten (028).

## Rückfragen

## Ergebnis
Umgesetzt:
- `statusView` für alle Phasen: vor dem Start Tage oder Countdown mit Plan, live km mit Laufzeit, Pace und Zielprognose, "Gleich im Ziel", "Keine Daten", im Ziel Nettozeit mit Zieleinlauf, Ø Pace und Distanz. Grundlage als Chip (Plan, Sichtung, Offizieller Split, Ziel) mit Satz aus dem Legacy
- `raceEstimate` nimmt `result.netSec` aus der Rennen-JSON, wenn die Datenbank kein Ziel hat und die Zeit vorbei ist. Hamburg steht damit auf "Im Ziel", auch in "Dein Platz an der Strecke"
- `Status.astro` unter der 3D-Ansicht, zwei Spalten ab 900 px, darunter eine. Am Handy vor der 3D-Ansicht. Uhr und Countdown jede Sekunde. Gesehen-Button in der rechten Spalte

Abweichungen vom Legacy:
- Platz unter statt neben der Karte (Entscheidung oben)
- Fortschritt als schlichter Balken ohne Kilometermarken und Spot-Fähnchen, die zeigt die 3D-Ansicht
- "1 Tag" statt "1 Tage", Distanz aus den Daten statt fest "21,1 km", kein Fall "Von Dima" (gibt es in der Datenbank nicht)
- Kein Garmin-Button: Der Link wird nie an Gäste ausgeliefert (`docs/decisions/2026-11-12-architektur.md`)

Geprüft:
- `tests/status.test.ts` zuerst, rot ohne Modul, dann 8 grün. 3 neue Fälle in `tests/spots.test.ts`, der erste rot vor der Änderung
- `npm run check` 0 Fehler, `npm test` 358 grün
- Sichtprüfung lokal: Barcelona vor dem Start hell 642 px (Karte vor der 3D-Ansicht), Hamburg im Ziel dunkel 1280 px (Zieleinlauf 11:32 = 9:45 plus 1:47:05), Barcelona live dunkel 375 px und hell 1280 px mit Gesehen-Button. Live nur mit im Browser vorgestellter Uhr, ohne Änderung an der Datenbank. Gefunden und behoben: am Handy stießen "5:20 /km" und "12:15" aneinander, Werte unter 400 px jetzt 16 px
- Gegen das echte Projekt (25.11., mit Dimas Ja, Seite im Browser-Bereich der App offen, ohne Neuladen): `actual_start` von `barcelona-2027` auf jetzt minus 60 min gesetzt, Hero und Karte springen auf "Live · geschätzt", 11,3 km, Gesehen-Button erscheint. Dann per SQL ein offizieller Split bei km 5 (25:00) und eine Sichtung bei km 10 unter Dimas Konto: Karte zeigt 10,0 km, Pace 6:38, Chip "Sichtung", "Zuletzt bestätigt bei km 10,0, gerade eben. Prognose 4:33:44.", Pinnwand "Gesehen bei km 10,0". Namensabfrage öffnet sich in der Karte. Nach dem Löschen beider Zeilen und `actual_start` zurück auf null springt alles ohne Neuladen auf "Start in 109 T 5 Std". Danach per SQL: `checkpoints`, `spots`, `messages`, anonyme Konten 0, beide `actual_start` null
- Nachgezogen in 029 (Commit bc3c988): Werte und Chips mit benannten Textstilen (`caption-4`, `title-1`) statt fester Größen

## Review
