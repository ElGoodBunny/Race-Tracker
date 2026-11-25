# 028 Zwischenzeiten
Besitzer: claude
Status: review
Branch: claude/028-zwischenzeiten
Roadmap: Phase 1, Zwischenzeiten-Tabelle und Split-Eingabe (nur Dima), hier nur die Tabelle

## Worum es geht
Im Legacy zeigt "Zwischenzeiten und Strecke" für jeden Punkt Nettozeit, Uhrzeit, Pace auf dem Abschnitt und woher die Zeit kommt (offiziell, geschätzt, Plan, Prognose). Auf der Rennseite fehlt das.

Annahmen:
- Punkte alle 5 km vor dem Ziel, dazu die Wende aus `turnKm` und das Ziel. Im Legacy waren sie für Hamburg fest (5, 10, 15, Wende, 20, Ziel), das ergibt sich so auch
- Die Eingabe offizieller Splits braucht Dimas Anmeldung per Magic Link, die gibt es noch nicht (Roadmap "Einstellungen"). Sie kommt mit dem Paket, das die Anmeldung bringt. `set_official_split` und RLS sind schon da
- Die Karte "Die Strecke" daneben hatte feste Texte für Hamburg. Ohne Daten dafür in `src/content/` bleibt sie weg

## Auftrag
1. `src/lib/live/splits.ts` mit Tests: `splitPoints(distanceKm, turnKm)`, `splitRows(est, points, tz)` nach `renderSplits()` im Legacy
2. `Splits.astro` mit `splits.ts` als Abschnitt `#ergebnis` nach der Pinnwand, gleiche Verbindung über `watchRace`

## Erlaubte Dateien
- `src/lib/live/splits.ts` (neu), `tests/splits.test.ts` (neu), `src/components/Splits.astro` (neu), `src/components/splits.ts` (neu)
- `src/pages/[race].astro`
- diese Datei, `AGENTS.md` (Paketliste), `docs/ROADMAP.md` (Unterpunkt)

## Prüfpunkt
- `npm run check`, `npm test` grün
- Sichtprüfung hell und dunkel, Desktop und Handy

## Nicht Teil des Pakets
Split-Eingabe (mit Dimas Anmeldung), Karte "Die Strecke", Ergebnisseite aus `docs/VISION.md`.

## Rückfragen

## Ergebnis
Umgesetzt:
- `splitPoints` und `splitRows`: offizieller Split, wenn einer höchstens 60 m neben dem Punkt liegt, im Ziel die Zielzeit, vorbei "geschätzt" (interpoliert mit `estPassTime`), sonst "Plan" vor dem Start und "Prognose" danach. Pace je Abschnitt
- Abschnitt "Zwischenzeiten" (`#ergebnis`) nach der Pinnwand, eine Karte mit Tabelle, alle Texte per `textContent`

Abweichungen vom Legacy:
- Punkte aus Distanz und Wende statt fest für Hamburg
- Keine Split-Eingabe, keine Karte "Die Strecke"
- Überschrift "Zwischenzeiten" statt "Zwischenzeiten und Strecke", der Hinweis "netto ab Startmatte" steht über der Tabelle

Geprüft:
- `tests/splits.test.ts` 7 grün (Tests vor dem Modul geschrieben, aber nicht vorher rot laufen lassen)
- `npm run check` 0 Fehler, `npm test` 365 grün
- Sichtprüfung lokal: Hamburg im Ziel hell 1280 px (Ziel 1:47:05 um 11:32, alles andere geschätzt mit 5:05), Barcelona vor dem Start dunkel 375 px (9 Zeilen mit Plan). Gefunden und behoben: doppelte Überschrift, am Handy lief die Tabelle 6 px über

## Review
