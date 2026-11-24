# 010 Pfeile im Streckenband
Besitzer: claude
Status: in Arbeit
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

## Review
