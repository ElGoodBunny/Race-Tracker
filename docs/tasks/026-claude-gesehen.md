# 026 Gesehen-Button
Besitzer: claude
Status: in Arbeit
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

## Review
