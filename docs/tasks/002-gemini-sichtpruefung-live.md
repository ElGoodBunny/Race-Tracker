# 002 Sichtprüfung Streckenband und Läufer
Besitzer: gemini
Status: review
Branch: gemini/002-sichtpruefung-live
Roadmap: Phase 2, Schritt 7 (Streckenband) und Schritt 9 (Läufer), jeweils der Teil "Sichtprüfung"

## Worum es geht
Auf `/dev/live` läuft die 3D-Ansicht schon mit Demo-Daten durch Barcelona. Bevor es an Bäume, Labels und HUD geht, braucht Claude einen genauen Abgleich mit dem Zielbild: Wie nah sind Streckenband und Läufer heute an den Standbildern aus dem Video? Du änderst keinen Code, du schaust, misst und beschreibst.

Lies vorher:
- `docs/VISION.md` (Zielbild)
- `docs/decisions/2026-11-13-3d-konzept.md`, Abschnitt "Durchstich" (was steht, was fehlt)
- Referenzbilder `docs/reference/munich-video/frame-04.jpg` (Streckenband, Läufer nah) und `frame-05.jpg` (Folgemodus)

## Auftrag
1. In deinem Ordner `npm run dev`, dann `<adresse>/dev/live?race=barcelona-2027` öffnen.
2. An drei Stellen anhalten. In der Browser-Konsole springst du so an einen km (Beispiel km 12):
   ```js
   const s = __live.source; let lo = 0, hi = s.duration;
   while (hi - lo > 0.5) { const m = (lo + hi) / 2; if (s.sampleAt(m).km < 12) lo = m; else hi = m; }
   __live.seek(hi); __live.pause();
   ```
   Stellen: km 12, km 13,9 (Sagrada Família), km 28,5 (am Meer).
3. An jeder Stelle: Modus "Folgen" und "Übersicht" (Knöpfe oben), jeweils hell und dunkel, jeweils Desktop 1280 × 900. Zusätzlich an km 12 im Folgemodus Handy 390 × 844, hell und dunkel. Das sind 16 Screenshots.
4. Zu jedem Screenshot im Bericht festhalten:
   - **Streckenband:** Endet der kräftige, gelaufene Teil genau unter dem Läufer? Ist der Rest sichtbar schwächer? Fließt die Textur (kurz `__live.play()`, dann wieder `__live.pause()`)? Breite und Farbe im Vergleich zu `frame-04.jpg`. Ist das Band zwischen den Häusern oder darüber zu sehen?
   - **Läufer:** Wie hoch ist er in Pixeln (ungefähr, an der Bildschirmauflösung gemessen)? Fällt er in der Übersicht als Erstes auf? Was fehlt im Vergleich zu `frame-04.jpg` (zum Beispiel Startnummer)?
   - **Sonstiges:** Was am Bild stört oder fehlt im Vergleich zu `frame-05.jpg`.
5. Fehler aus der Browser-Konsole wörtlich notieren.
6. Am Ende eine Liste "Abweichungen vom Zielbild", jede mit Stelle, Screenshot und einem Satz, was anders ist. Sortiert nach Auffälligkeit, die auffälligste zuerst. Keine Lösungen vorschlagen.

## Erlaubte Dateien
- `docs/decisions/<datum>-sichtpruefung-live.md` (neu, Datum des Prüftags, Format `2026-11-22`)
- `docs/decisions/<datum>-sichtpruefung-live/` mit den Screenshots (JPEG, Qualität 80, höchstens 1200 px breit)
- `docs/tasks/002-gemini-sichtpruefung-live.md`: Status und Ergebnis

## Prüfpunkt
- 16 Screenshots liegen im Ordner, Dateinamen nennen Stelle, Modus, Thema und Gerät (`km12-folgen-hell.jpg`, `km12-folgen-hell-handy.jpg`)
- Der Bericht beantwortet jede Frage aus Schritt 4 für jeden Screenshot, mit Verweis auf die Datei
- Die Liste "Abweichungen vom Zielbild" ist da
- Konsolenfehler sind notiert, oder es steht ausdrücklich "keine"
- Keine Datei außerhalb der erlaubten geändert (`git status` vor dem letzten Commit prüfen)

## Nicht Teil des Pakets
Jede Änderung an Code, Styles oder Roadmap. Lösungsvorschläge. Messung von Dreiecken und Bildrate (das macht Schritt 5b).

## Rückfragen

## Ergebnis
Erledigt am 24.11.2026.
- **Sichtprüfung:** 16 Screenshots (JPEG, max. 1200 px breit, Qualität 80) in `docs/decisions/2026-11-24-sichtpruefung-live/` abgelegt.
- **Bericht:** Vollständige Einzelbewertung aller Screenshots und Beantwortung aller Fragen in `docs/decisions/2026-11-24-sichtpruefung-live.md`.
- **Konsolenfehler:** Keine Fehler oder Warnungen in der Browser-Konsole (nur `[vite] connecting...` / `[vite] connected.`).
- **Abweichungen vom Zielbild:** 8 Punkte nach Auffälligkeit sortiert im Bericht dokumentiert (u. a. fehlendes Läufer-Label, fehlende Bäume, Pins dominieren Übersicht, Streckenband-Farbe, fehlende Startnummer, Pin-Kollision bei km 13,9).
- **Offen / Abweichungen vom Auftrag:** Keine.

## Review
