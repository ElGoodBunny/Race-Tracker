# Designsystem

Übernommen aus dem Artifact (Stand 03.11.2026). Grundlage ist der Skill landing-page-design (github.com/elayadesign/ai-design-skills, MIT), Teil A (Struktur) und Teil B (Regeln). Die Tokens stehen 1:1 in `src/styles/tokens.css`.

Lehre aus dem 02.11.: Nur Regeln auf ein altes Layout legen reicht nicht. Neues Design muss sichtbar neu sein.

## Seitenaufbau einer Rennseite
1. Schwebende Navigation mit Abschnittsmarkierung, Vollbildmenü auf dem Handy
2. Hero: Status, H1, ein Satz, eine Hauptaktion, Hinweis zur Schätzung
3. Live-Bereich: Karte links, Statuskarte rechts, mobil Status zuerst
4. Tagline mit Wort-für-Wort-Einfärbung
5. "So findest du mich unterwegs": 3 Schritte, Simulation, Spot, Cheering Spots
6. Pinnwand
7. Zwischenzeiten und Strecke
8. FAQ (7 Fragen)
9. Abschluss mit derselben Hauptaktion
10. Einstellungen (nur Dima)
11. Footer mit Quellen

Hauptaktion je Phase: vor dem Start "Spot setzen" (#spots), live "Live verfolgen" (#live), im Ziel "Zeiten ansehen" (#ergebnis).

## Regeln
- Schrift: Geist, Geist Mono nur für Zahlen und Kartenbeschriftung, max. Gewicht 600, keine Kursive
- Größen nur aus der Tailwind-Skala, jede Textart als benannter Stil (`heading-1` bis `caption-5`)
- Abstände nur 2/4/8/12/16/24/32/40/48/64/80/96 px (`--s25` bis `--s900`), Radien nur Tailwind-Werte (Karten 24, Buttons rund)
- Dunkelmodus: Flächen nur #000000, #181818, #1F1F1F, #272727, #313131, #131209
- Akzente: Blau für die Route, Orange als Signal. Hauptbutton in Textfarbe
- Hintergründe flach, Verlauf nur im H1-Text
- Bewegung: cubic-bezier(0.22,1,0.36,1), 500 ms für Position, 300 ms für Farbe, nur transform und opacity
- Icons: Phosphor als Inline-SVG
- Texte ohne Bindestriche als Satzzeichen, Systemmeldungen ohne Ausrufezeichen, Formularfehler direkt am Feld

## Ergänzung 12.11.: Video als Zielbild
Für Overlays auf der Karte (HUD-Karten, Panel, Kartenbuttons, Meldungen) gilt der Look aus dem Video: halbtransparente Flächen mit Hintergrundunschärfe, wie die Navigation sie schon hat. Alle anderen Regeln bleiben. Referenz: `docs/VISION.md` und `docs/reference/munich-video/`.

## Bewusst nicht übernommen
Rechtliches, 404, Cookie-Banner: für einen privaten Tracker ohne Tracking nicht passend. Bei öffentlicher Domain neu prüfen (Fable-Checkpoint C).
