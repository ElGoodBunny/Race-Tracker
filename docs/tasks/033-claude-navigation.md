# 033 Navigation, FAQ, Abschluss
Besitzer: claude
Status: review
Branch: claude/033-navigation (auf `claude/032-einstellungen`, weil beide `[race].astro` und den Footer ändern. Erst 032 mergen)
Roadmap: Phase 1, Schwebende Navigation mit Abschnittsmarkierung, Vollbildmenü mobil und FAQ, Abschluss, Footer mit Quellen

## Worum es geht
Der Rennseite fehlen die Teile 1, 8, 9 und 11 aus `docs/DESIGN.md` (Seitenaufbau). Im Legacy sind das `.nav-wrap` mit `#mnav`, `#faq`, die Abschluss-Sektion `.final` und der Footer.

Annahmen:
- Navigation nur auf der Rennseite, nicht auf der Startseite. Links wie im Legacy: Live, An der Strecke, Pinnwand, Zeiten, FAQ. Marke "Dima läuft Barcelona" aus `runner` und `city`
- Hauptaktion in Navigation und Abschluss wie im Hero (`heroAction`), `hero.ts` hält alle drei aktuell. Titel und Satz im Abschluss je Phase wörtlich aus dem Legacy
- FAQ in der Ich-Form wie im Legacy und in den Abschnitten "So findest du mich unterwegs" und "Was ihr mir schreibt". Fragen, die auf altem Stand beruhen, fallen weg oder werden neu geschrieben: Claude-Konto und Einladung (heute anonym mit Namen), Garmin-Link (wird Gästen nie gezeigt), Simulation (zurückgestellt), Anfahrt zu Start und Ziel (dafür gibt es keine Daten im Repo). Erfrischungspunkte nur, wenn die Rennen-JSON `waterKm` hat. Deshalb 5 bis 6 Fragen statt 7
- Glas der Navigation nach `docs/DESIGN.md`: Unschärfe 24 px, Füllung `--nav-bg`
- Footer: Quellen stehen schon im Footer (`Base.astro`), dazu "Nach oben"

## Auftrag
1. `finalText(phase)` in `src/lib/live/status.ts`, `faqItems(waterKm)` in `src/lib/live/faq.ts` (neu), beides mit Tests
2. `Nav.astro` und `nav.ts`: schwebende Leiste, Abschnittsmarkierung, Vollbildmenü unter 900 px, Escape schließt
3. FAQ und Abschluss in `[race].astro`, `hero.ts` setzt die Hauptaktion überall
4. "Nach oben" im Footer

## Erlaubte Dateien
- `src/lib/live/status.ts`, `tests/status.test.ts`, `src/lib/live/faq.ts` (neu), `tests/faq.test.ts` (neu)
- `src/components/Nav.astro` (neu), `src/components/nav.ts` (neu), `src/components/Faq.astro` (neu), `src/components/hero.ts`, `src/pages/[race].astro`
- diese Datei, `AGENTS.md` (Paketliste), `docs/ROADMAP.md` (Checkboxen)

## Prüfpunkt
- `npm run check`, `npm test` grün
- Sichtprüfung hell und dunkel, Desktop und Handy: Leiste über Karte und Text, Markierung wandert beim Scrollen, Menü öffnet und schließt, FAQ klappt auf, Abschluss je Phase

## Nicht Teil des Pakets
Tagline mit Wort-für-Wort-Einfärbung (Punkt 4), Scroll-Reveal der Abschnitte, Simulation.

## Rückfragen

## Ergebnis
Umgesetzt:
- `finalText` (1 Test) und `faqItems` (4 Tests), beide erst rot ("finalText is not a function", "Cannot find module"), dann grün
- `Nav.astro` und `nav.ts`: Leiste mit Marke "Dima läuft Barcelona", fünf Links mit Markierung des aktuellen Abschnitts, Hauptaktion. Unter 900 px Vollbildmenü, Escape schließt und gibt den Fokus an den Knopf zurück, beim Wechsel auf die breite Leiste schließt es sich. Anker landen unter der Leiste (`scroll-margin-top`)
- `Faq.astro`: FAQ mit 5 Fragen, Hamburg mit Erfrischungspunkten 6. Abschluss mit Titel und Satz je Phase und derselben Hauptaktion. `hero.ts` setzt die Hauptaktion in Leiste, Hero und Abschluss
- Footer: "Nach oben" neben "Anmelden". Quellen standen schon drin (Strecke, OSM, Wetter in der 3D-Ansicht)
- Hero auf dem Handy oben 96 statt 80 px Abstand, sonst klebt die Leiste an "Alle Rennen"

Abweichungen:
- 5 bis 6 Fragen statt 7, siehe Annahmen. Neu ist die Frage zum Button "Ich sehe Dima gerade"
- Glas mit 24 px Unschärfe ohne Sättigung wie in `docs/DESIGN.md`, Legacy hatte 16 px plus Sättigung

Geprüft:
- `npm run check` 0 Fehler, `npm test` 405 grün, `npm run build` ok, keine doppelten ids im Build
- Sichtprüfung lokal: Hamburg hell 800 px (Leiste, Markierung wandert auf "Pinnwand" und "FAQ", FAQ auf und zu, Abschluss "Danke fürs Anfeuern" mit "Zeiten ansehen"), Barcelona dunkel 375 px (Menü auf, Escape zu, Seite wieder scrollbar, kein waagrechter Überlauf), Barcelona hell 375 px, Barcelona dunkel Desktop über der 3D-Ansicht
- Nicht geprüft: Phase "live" in Leiste und Abschluss im Browser (gleicher Weg wie im Hero, `finalText` im Test)

## Review
