# 011 Nachprüfung Läufer, Pins und Streckenband
Besitzer: gemini
Status: offen
Branch: gemini/011-nachpruefung-live
Roadmap: Phase 2, Schritt 7 (Streckenband) und Schritt 9 (Läufer), jeweils der Teil "Sichtprüfung"

## Worum es geht
Deine Sichtprüfung aus Paket 002 lief auf einem älteren Stand. Seitdem sind auf `phase-2` dazugekommen: Bäume (004), HUD und Panel (007), Labels (008), Pins kleiner als der Läufer und neben ihm (009), Streckenband mit weißen Doppelpfeilen (010). Claude braucht jetzt einen Blick von außen auf den aktuellen Stand: Sind die Abweichungen aus 002 behoben, und ist dabei etwas Neues kaputtgegangen? Du änderst keinen Code, du schaust, misst und beschreibst.

Lies vorher:
- `docs/tasks/002-gemini-sichtpruefung-live.md` und deinen Bericht `docs/decisions/2026-11-24-sichtpruefung-live.md`
- `docs/tasks/009-claude-pins-uebersicht.md` und `docs/tasks/010-claude-streckenband.md`, Abschnitt "Ergebnis"
- `docs/reference/munich-video/frame-04.jpg` und `frame-05.jpg`

## Auftrag
1. Prüf zuerst den Stand: `git log --oneline -1` in deinem Ordner muss einen Merge von `claude/010-streckenband` zeigen oder einen Commit danach. Wenn nicht: anhalten und melden, nicht prüfen.
2. In deinem Ordner `npm run dev`, dann `<adresse>/dev/live?race=barcelona-2027` öffnen.
3. An drei Stellen anhalten. In der Browser-Konsole springst du so an einen km (Beispiel km 12):
   ```js
   const s = __live.source; let lo = 0, hi = s.duration;
   while (hi - lo > 0.5) { const m = (lo + hi) / 2; if (s.sampleAt(m).km < 12) lo = m; else hi = m; }
   __live.seek(hi); __live.pause();
   ```
   Den Modus wechselst du mit `__live.view.setMode("follow")` oder `__live.view.setMode("overview")`, danach 2 Sekunden warten.
   Stellen: km 12, km 13,9 (Sagrada Família), km 28,5 (am Meer).
4. Gleiche Bilder wie in 002: an jeder Stelle Folgen und Übersicht, jeweils hell und dunkel, Desktop 1280 × 900. Dazu an km 12 und km 13,9 Folgen und Übersicht am Handy 390 × 844, hell und dunkel. Das sind 20 Screenshots.
5. Zu jedem Screenshot festhalten:
   - **Läufer:** Höhe in Pixeln. Fällt er in der Übersicht als Erstes auf? Steht das Label über ihm?
   - **Pins:** Höhe in Pixeln. Kleiner als der Läufer? Überdeckt ein Pin den Läufer, ganz, teilweise oder gar nicht? Steht ein Pin im Wasser oder mitten in einem Häuserblock?
   - **Streckenband:** Sind die Pfeile im gelaufenen Teil weiß (hell) beziehungsweise dunkel (dunkel) und gut zu sehen? Doppelte Winkel wie in `frame-04.jpg`? Sind die Pfeile im Rest sichtbar, aber leiser? Fließen sie (kurz `__live.play()`, dann `__live.pause()`)? Endet der kräftige Teil unter dem Läufer?
   - **Verdeckung durch Panel und HUD:** Liegt der Läufer oder ein Pin unter dem Panel, dem Bottom Sheet oder den HUD-Karten?
6. Fehler aus der Browser-Konsole wörtlich notieren.
7. Am Ende zwei Listen:
   - "Aus 002 behoben": jede der 8 Abweichungen aus deinem Bericht mit behoben, teilweise oder offen und dem Screenshot, der es zeigt
   - "Neu aufgefallen": alles, was in 002 noch nicht da war, sortiert nach Auffälligkeit, die auffälligste zuerst
   Keine Lösungen vorschlagen.

## Erlaubte Dateien
- `docs/decisions/<datum>-nachpruefung-live.md` (neu, Datum des Prüftags, Format `2026-11-25`)
- `docs/decisions/<datum>-nachpruefung-live/` mit den Screenshots (JPEG, Qualität 80, höchstens 1200 px breit)
- `docs/tasks/011-gemini-nachpruefung-live.md`: Status und Ergebnis

## Prüfpunkt
- 20 Screenshots liegen im Ordner, Dateinamen nennen Stelle, Modus, Thema und Gerät (`km12-folgen-hell.jpg`, `km12-folgen-hell-handy.jpg`)
- Der Bericht beantwortet jede Frage aus Schritt 5 für jeden Screenshot, mit Verweis auf die Datei
- Beide Listen aus Schritt 7 sind da
- Konsolenfehler sind notiert, oder es steht ausdrücklich "keine"
- Keine Datei außerhalb der erlaubten geändert (`git status` vor dem letzten Commit prüfen)

## Nicht Teil des Pakets
Jede Änderung an Code, Styles, Roadmap oder `AGENTS.md`. Lösungsvorschläge. Messung von Dreiecken und Bildrate. Farbton des Streckenbands (entschieden: bleibt `--route`).

## Rückfragen

## Ergebnis

## Review
