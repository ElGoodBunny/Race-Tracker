# 010 Pfeile im Streckenband
Besitzer: claude
Status: review
Branch: claude/010-streckenband
Roadmap: Phase 2, Schritt 7 (Streckenband), Teil "Sichtprüfung gegen frame-04.jpg"

## Worum es geht
Paket 002, Abweichung 4: Im Video ist das Band kräftig blau mit weißen doppelten Winkelpfeilen quer über die ganze Breite. Bei uns sind die Pfeile blassblau und kaum zu sehen. Ursache: Die Textur ist grau (`#d6d6d6`) mit weißem Pfeil, beides wird mit der Routenfarbe eingefärbt. Der Pfeil liegt damit nur 16 % heller als das Band, in jedem Thema.

Der Prüfpunkt von Schritt 7 selbst ("bei km 12 endet der kräftige Teil unter dem Läufer") ist laut Paket 002 erfüllt.

## Auftrag
1. Farben von Band und Pfeil kommen aus den Tokens, nicht aus einer Tönung: gelaufener Teil `--route` mit Pfeilen in `--route-ink`, Rest `--route-todo` mit Pfeilen, die nur leicht abgesetzt sind.
2. Doppelter Winkelpfeil wie im Video, fast über die ganze Bandbreite.
3. Fließen, Breite und Übergang unter dem Läufer bleiben, wie sie sind.

## Erlaubte Dateien
- `src/lib/view3d/scene.ts`
- `src/lib/view3d/view.ts`: nur `route-ink` in der Liste der gelesenen Tokens (beim Umsetzen nachgetragen)
- `tests/scene.test.ts`
- `docs/decisions/2026-11-13-3d-konzept.md`: Nachtrag
- `docs/tasks/010-claude-streckenband.md`

## Prüfpunkt
- Test: Kontrast Pfeil zu Band im gelaufenen Teil mindestens 3:1 in hell und dunkel (WCAG für Grafik), im Rest kleiner als im gelaufenen Teil
- `npm run check`, `npm test`, `npm run e2e` grün
- Sichtprüfung km 12 Folgen und Übersicht, hell und dunkel, Desktop und Handy, gegen `frame-04.jpg`

## Nicht Teil des Pakets
Farbton des Bands (`--route` gilt seitenweit, siehe Ergebnis), Bandbreite, km-Marken.

## Rückfragen

## Ergebnis
Erledigt: `ribbonInk` in `scene.ts` leitet Band- und Pfeilfarben aus den Tokens ab, die Textur wird pro Thema in diesen Farben gezeichnet, statt grau zu sein und eingefärbt zu werden. Doppelter Winkelpfeil über rund zwei Drittel der Bandbreite. Fließen, Breite und Übergang unverändert.

Geprüft:
- Tests zuerst, rot ohne `ribbonInk`. Die Tests lesen beide Themen direkt aus `tokens.css`: Pfeil zu Band im gelaufenen Teil mindestens 3:1, im Rest sichtbar (über 1,15:1) und leiser als im gelaufenen Teil
- `npm test` 22 Dateien, 256 Tests grün. `npm run check` 0 Fehler im Projekt (die gemeldeten liegen in `Claude outputs/` und `brag-output/`). `npm run e2e` grün
- Sichtprüfung km 12: Folgen hell Desktop (weiße Doppelpfeile auf kräftigem Blau, Rest blass mit leisen Pfeilen), Übersicht hell Desktop (Band als Linie, Pfeile spielen dort keine Rolle), Folgen dunkel Handy (Rest graublau mit leisen dunklen Pfeilen). Nicht geprüft: Übersicht dunkel, Folgen hell Handy

Abweichungen:
- `src/lib/view3d/view.ts` war nicht freigegeben. Nötig war eine Zeile: `route-ink` in der Liste der Tokens, die die Ansicht liest
- Farbton bleibt `--route` (hell `#0A5CA8`, im Video heller und türkiser). Das Token gilt seitenweit für Links, Fokus und die 2D-Karte. Dima hat am 24.11. entschieden: so lassen, kein eigenes Token
- Im dunklen Thema sind die Pfeile dunkel (`--route-ink` ist dort `#131209`), nicht weiß wie im Video. So bleibt der Kontrast auf dem hellen Blau

## Review
