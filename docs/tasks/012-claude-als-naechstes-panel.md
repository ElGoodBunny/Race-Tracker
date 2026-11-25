# 012 "Als Nächstes" im Panel
Besitzer: claude
Status: erledigt
Branch: claude/012-als-naechstes-panel
Roadmap: Phase 2, Schritt 11 (Spots), Teil "Liste Als Nächstes"

## Worum es geht
Paket 001 hat die Logik gebaut (`upcomingSpots`). Jetzt kommt die Liste ins Panel auf `/dev/live`: Wer an der Strecke steht, will sehen, welcher Spot als Nächstes kommt und wann Dima dort ist.

## Auftrag
1. Im Panel ein Abschnitt "Als Nächstes" vor den Splits: höchstens 3 Spots, je Name, Strecke bis dorthin in km und Ankunft mit `fmtIn`.
2. "Passiert" kommt vom SpotTracker der Seite (`tracker.passed`), wie in 001 festgelegt.
3. Ankunft mit dem Schnitt bis jetzt (`t / km`), nicht mit der Pace des Moments. Die springt von Messpunkt zu Messpunkt, die Minuten würden flackern. Vor km 0,2 keine Ankunft.
4. Keine Spots mehr vor ihm: "Alle Spots passiert". Zahlen in Geist Mono, DOM nur ändern, wenn sich der Text ändert.
5. Am Handy wie die Splits im aufgezogenen Bottom Sheet.

## Erlaubte Dateien
- `src/pages/dev/live.astro`
- `e2e/upcoming.e2e.ts` (neu)
- `docs/tasks/012-claude-als-naechstes-panel.md`

## Prüfpunkt
- Check als Playwright-Test: bei km 12 steht Sagrada Família oben mit 1,9 km. Nach km 14 fehlt sie, Port Vell steht oben. Nach dem letzten Spot steht "Alle Spots passiert". Nach einem Sprung zurück auf km 12 steht Sagrada Família wieder oben
- `npm run check`, `npm test`, `npm run e2e` grün
- Sichtprüfung hell und dunkel, Desktop und Handy (Sheet offen)

## Nicht Teil des Pakets
Spots auf der Rennseite, Avatare, Konfetti, eigene Spots hervorheben.

## Rückfragen

## Ergebnis
Erledigt: Abschnitt "Als Nächstes" im Panel vor den Splits, bis zu 3 Spots mit Name, km bis dorthin und Ankunft (`fmtIn`, Schnitt bis jetzt). "Passiert" kommt von `tracker.passed`. Ohne Spots vor ihm steht "Alle Spots passiert". Das DOM ändert sich nur, wenn sich der Text ändert. Die Hilfsfunktion für Zahlen in Geist Mono gibt es jetzt auch für einzelne Knoten (`setMixed`), `putMixed` nutzt sie.

Geprüft:
- Check `e2e/upcoming.e2e.ts`: km 12 Sagrada Família oben mit 1,9 km und "in … min", 3 Einträge. km 14 Port Vell oben, Sagrada Família fehlt. km 31 nur "Alle Spots passiert". Rücksprung auf km 12: Sagrada Família wieder oben. `npm run e2e` 2 von 2 grün
- `npm test` 23 Dateien, 267 Tests grün. `npm run check` 0 Fehler im Projekt
- Sichtprüfung km 12: Desktop hell (Panel) und Handy dunkel mit offenem Sheet. Anzeige zum Beispiel "Sagrada Família 1,9 km · in 9 min". Nicht geprüft: Desktop dunkel, Handy hell

Abweichungen: keine. Offen für Schritt 11: Pins antippen, Avatare, Meldung im Stil des Videos.

## Review
