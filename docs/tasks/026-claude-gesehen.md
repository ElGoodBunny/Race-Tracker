# 026 Gesehen-Button
Besitzer: claude
Status: review
Branch: claude/026-gesehen
Roadmap: Phase 1, Pinnwand mit Schnellnachrichten und "Gesehen"-Button

## Worum es geht
Pinnwand (024) und Spots (025) laufen über Supabase, die Sichtung fehlt noch. Im Legacy meldet "Ich sehe Dima gerade" eine Sichtung als Checkpoint mit `src='seen'`. Die Schätzung nimmt sie als Anker, die Pinnwand zeigt sie als "Gesehen bei km …". Dieses Paket bringt den Button auf die Rennseite.

Annahmen:
- Datenbank ist fertig: RLS erlaubt jedem Gast `src='seen'`, der Server setzt `seen_at`, Autor und Besitzer, Rate Limit und Distanz-Check greifen (`tests/rls.test.ts`). Keine Migration nötig
- Sichtbar nur in den Phasen `run` und `arriving`, wie im Legacy. Vor dem Start, im Ziel und bei veralteter Schätzung (`stale`) gibt es keinen Button, deshalb auch keine neuen Fehlertexte dafür
- km wie im Legacy: Liegt ein eigener Spot höchstens 2,5 km von der Schätzung entfernt, gilt der Spot, sonst die Schätzung auf 0,1 km gerundet. Bei bis zu 3 eigenen Spots der nächstgelegene
- Der km bleibt zwischen 0,1 und dem letzten Zehntel im Rennen. In den ersten Metern ergäbe die Rundung 0,0, das lehnt die Datenbank ab (`km > 0`), am Ziel eines Marathons 42,2, das liegt hinter 42,195
- Der Platz im Legacy ist die Statuskarte im Live-Bereich. Die gibt es noch nicht (Roadmap "Statuskarte" offen), deshalb sitzt der Button direkt unter der Strecke in `#live`

## Auftrag
1. `src/lib/live/seen.ts` mit Tests zuerst: `sightingKm(est, mySpots, distanceKm)` (null außerhalb von `run` und `arriving`), `reportSeen(client, slug, km)`, `deleteSighting(client, id)`. Fehler über `errorText`
2. `Seen.astro` mit `seen.ts` unter der Strecke: Button "Ich sehe Dima gerade", dieselbe Gast-Anmeldung über `guestPrompt` und `guestStore`, dieselbe Verbindung über `watchRace`. Der km wird erst nach der Anmeldung berechnet, Turnstile kann dauern. Bestätigung im Hinweis darunter
3. Pinnwand: eigene Sichtungen mit X löschbar. Ein Fehltipp verschiebt sonst für alle die Schätzung
4. Roadmap: "Pinnwand …", "Datenschicht" (Paket 018) und "Gast-Onboarding" (Paket 024) abhaken

## Erlaubte Dateien
- `src/lib/live/seen.ts` (neu), `tests/seen.test.ts` (neu)
- `src/components/Seen.astro` (neu), `src/components/seen.ts` (neu), `src/components/pinboard.ts`
- `src/pages/[race].astro`
- diese Datei, `AGENTS.md` (Paketliste), `docs/ROADMAP.md` (Checkboxen)

## Prüfpunkt
- Tests zuerst, rot ohne Modul
- `npm run check`, `npm test` grün
- Sichtprüfung hell und dunkel, Desktop und Handy
- Gegen das echte Projekt: Sichtung melden, Zeile per SQL und Insert in den Logs prüfen, Pinnwand zeigt sie, Spot-ETAs und "Dein Platz an der Strecke" rechnen neu. Testzeilen, anonymes Konto und vorübergehende Änderungen an der Rennzeile nur nach Dimas Ja

## Nicht Teil des Pakets
Statuskarte, Hero mit Phase, Zwischenzeiten-Tabelle, Simulation.

## Rückfragen

## Ergebnis
Umgesetzt:
- `src/lib/live/seen.ts`: `sightingKm` (null außerhalb von `run` und `arriving`, eigener Spot unter 2,5 km gewinnt, sonst Schätzung auf 0,1 km, Grenzen 0,1 und letztes Zehntel im Rennen), `reportSeen` schreibt nur `race_slug`, `km`, `src`, `deleteSighting`. Fehler über `errorText`, keine neuen Texte nötig: Der Button ist vor dem Start, im Ziel und bei veralteter Schätzung unsichtbar wie im Legacy
- `Seen.astro` mit `seen.ts` direkt unter der Strecke in `#live`. Dieselbe Namensabfrage (`GuestPrompt`, `guestStore`) und dieselbe Verbindung (`watchRace`). Sichtbarkeit wird bei jedem Realtime-Stand und alle 15 s neu geprüft, der km erst im Moment der Meldung berechnet. Bestätigung "Danke, Sichtung bei km … gespeichert." im Hinweis darunter, Fehler darunter in Rot
- Pinnwand: eigene Sichtungen haben jetzt ein X ("Sichtung löschen")
- Roadmap: Datenschicht, Gast-Onboarding und Pinnwand abgehakt

Abweichungen vom Legacy:
- Platz unter der Strecke statt in der Statuskarte, die gibt es noch nicht
- Bei bis zu 3 eigenen Spots zählt der nächstgelegene
- km nie 0,0 und nie hinter dem Ziel, das Legacy hätte hier einen Datenbankfehler bekommen
- Keine zweite Pinnwand-Zeile: Sichtungen stehen nur in `checkpoints`, die Pinnwand liest sie dort (Migration Phase 1)
- Eigene Sichtungen löschbar, im Legacy nicht

Geprüft:
- `tests/seen.test.ts` zuerst, rot ohne Modul, dann 8 Tests grün
- `npm run check` 0 Fehler, `npm test` 347 grün
- Sichtprüfung lokal auf Hamburg: dunkel 800 px mit Namensabfrage, hell Handy 375 px mit Namensabfrage (kein seitliches Scrollen), hell Desktop 1280 px. In Phase `stale` blendet sich der Button selbst aus
- Gegen das echte Projekt (25.11., mit Dimas Ja `races.actual_start` von `hamburg-2026` vorübergehend auf jetzt minus 30 min, vorher null): Dima in Chrome legt Spot "Test" bei km 8,5 an (Anmeldung mit Turnstile, ein anonymes Konto), dann "Ich sehe Dima gerade". Per SQL: 4 Zeilen `src='seen'` bei km 8,500 (Spot-Regel griff, Schätzung stand bei etwa km 7), `seen_at` gleich `created_at` vom Server, `author_name` aus dem Profil. Zweiter Tab ohne Anmeldung zeigt die Sichtungen auf der Pinnwand und den Spot als "vorbei, geschätzt", die ETA hat sich also neu gerechnet. Edge-Logs: `POST /rest/v1/checkpoints` 201 um 01:26:09 UTC, die drei weiteren Inserts stehen in der Datenbank, waren in den Logs beim Prüfen noch nicht zu sehen
- Beobachtung: Mehrfaches Tippen erzeugt mehrere Sichtungen am selben km (wie im Legacy), das Rate Limit greift erst ab 10 in 10 Minuten. Für die Schätzung harmlos, auf der Pinnwand sichtbar

Offen bis Dimas Ja: Testzeilen (4 Sichtungen, Spot "Test"), anonymes Konto "popo" löschen, `actual_start` von `hamburg-2026` wieder auf null

## Review
