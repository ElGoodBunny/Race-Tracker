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
- Die Flächenregel gilt für UI-Flächen, nicht für 3D-Figuren. Haut und Haare der Figuren haben eine eigene Palette in `tokens.css` (`--figure-skin-1` bis `-3`, `--figure-hair-1` bis `-3`, hell und dunkel)
- Akzente: Blau für die Route, Orange als Signal. Hauptbutton in Textfarbe
- Hintergründe flach, Verlauf nur im H1-Text
- Bewegung: cubic-bezier(0.22,1,0.36,1), 500 ms für Position, 300 ms für Farbe, nur transform und opacity
- Icons: Phosphor als Inline-SVG
- Texte ohne Bindestriche als Satzzeichen, Systemmeldungen ohne Ausrufezeichen, Formularfehler direkt am Feld

## Ergänzung 12.11.: Video als Zielbild
Für Overlays auf der Karte (HUD-Karten, Panel, Kartenbuttons, Meldungen) gilt der Look aus dem Video: halbtransparente Flächen mit Hintergrundunschärfe, wie die Navigation sie schon hat. Alle anderen Regeln bleiben. Referenz: `docs/VISION.md` und `docs/reference/munich-video/`.

## Ergänzung 25.11.: Regeln aus Apples HIG
Ausgewählt aus dem Skill apple-design (github.com/dickwu/apple-design-skill), Seiten Liquid Glass, Materials, Accessibility, Dark Mode, Motion, Maps, Charts und Charting Data. In eigenen Worten, nur was für eine Webseite mit Karte passt. Bei Widerspruch gelten die Regeln oben. Begründung: `docs/decisions/2026-11-25-apple-hig.md`.

### Glas (Overlays auf der Karte)
- Zwei Ebenen: Inhalt (Karte, 3D-Szene, Abschnitte der Seite) ist nie Glas. Glas gibt es nur für Bedienelemente, die über der Karte schweben: Navigation, HUD-Karten, Panel, Kartenbuttons, Meldungen
- Sparsam: höchstens drei Glasflächen gleichzeitig sichtbar, nie Glas auf Glas
- Zwei Stärken. Normal für alles mit Text (HUD, Panel, Meldungen): Unschärfe 24 px, Füllung 72 % wie `--nav-bg`. Klar nur für reine Icon-Buttons über der Karte: Unschärfe 12 px, Füllung 40 %. Liegt helles Kartenmaterial darunter, bekommt klares Glas eine dunkle Abdunklung von 35 %
- Rand: 1 px in `--line` mit 50 % Deckkraft, damit die Fläche sich vom Kartengrund löst. Keine zusätzlichen Schatten im Dunkelmodus
- Farbe auf Glas sparsam: Text und Icons in `--ink` und `--muted`. Farbig nur Status (Live, geschätzt) und höchstens eine Hauptaktion je Ansicht, dann farbiger Hintergrund statt farbiger Schrift
- Kontrast gilt an der ungünstigsten Stelle: Text auf Glas muss auch über Wasser, Parks und der Route 4,5:1 schaffen. Prüfen mit der Karte in der Ruhelage und beim Mitfahren
- Fallbacks: bei `prefers-reduced-transparency: reduce` und bei `prefers-contrast: more` werden Glasflächen deckend (`--surface`), der Rand wird voll `--line`. Safari kennt `prefers-reduced-transparency` nicht, deshalb muss die Fläche auch ohne diese Abfrage lesbar sein
- Performance: `backdrop-filter` über der laufenden 3D-Szene ist teuer. Glasflächen klein halten, keine Glasfläche über die ganze Breite auf dem Handy

### Barrierefreiheit
- Kontrast mindestens 4,5:1 für Text, 3:1 für Icons und Linien, in hell und dunkel
- Nie nur über Farbe: Route erledigt und offen, Live und geschätzt, Fahnen der Spots haben zusätzlich Form, Muster oder Text
- Tippflächen mindestens 44 × 44 px, auch wenn das Icon kleiner ist. Abstand zwischen Kartenbuttons mindestens `--s100`
- Alles, was per Geste geht (Karte ziehen, zoomen, Kamera wechseln), hat auch einen Button und geht per Tastatur
- Keine Meldungen, die von selbst verschwinden, bevor man sie lesen kann. Wichtige Meldungen bleiben, bis man sie schließt
- Karte und 3D-Szene haben eine Textalternative: wo Dima gerade ist, als Satz mit km und Uhrzeit

### Dunkelmodus
- Kein eigener Hell/Dunkel-Schalter auf der Seite, der Tracker folgt dem System. `data-theme` bleibt nur für Tests und Screenshots
- Beide Modi gleich gut. Abnahme auch mit erhöhtem Kontrast und reduzierter Transparenz, einzeln und zusammen
- Bilder mit weißem Grund (Fotos auf der Pinnwand) im Dunkelmodus leicht abdunkeln, damit sie nicht leuchten

### Bewegung
- Bewegung nur mit Zweck: Position des Läufers, Kamerawechsel, Zustandswechsel. Nichts animiert nur zur Zierde
- Häufige Bedienung (Buttons, Tabs, Panel auf und zu) bekommt höchstens die Farbüberblendung von 300 ms, keine Wege
- Jede Animation lässt sich unterbrechen. Niemand wartet auf eine Animation, bevor er weiterklicken kann
- Bei `prefers-reduced-motion: reduce`: Kameraflüge werden Schnitte, der Läufer springt statt zu gleiten, keine Einblendungen beim Scrollen. Information darf nie nur in Bewegung stecken
- Nichts blinkt. Der Live-Punkt pulsiert höchstens langsam und nur über opacity

### Karte
- Die Karte bleibt bedienbar. Overlays verdecken nie dauerhaft die Mitte und nie die Quellenangabe der Kartendaten
- Ausgewählte Elemente (Spot, Landmark, Läufer) bekommen Umriss und Farbwechsel, nicht nur Farbe
- Spots, die sich überlappen, werden zu einer Markierung mit Zahl zusammengefasst und lösen sich beim Hineinzoomen auf
- Details nach Zoomstufe: weit weg nur Route, Start, Ziel und Läufer, nah dran Landmarks und Spots mit Namen
- Umgebung neben der Strecke gedämpft, damit die Route führt
- Eigene Buttons auf der Karte heben sich durch Glas oder Rand ab, nie durch kräftige Farbe

### Diagramme (Zwischenzeiten, Pace, Puls, Höhe)
- Bekannte Formen: Linie für Verlauf über die Strecke, Balken für Abschnitte. Keine neuen Diagrammtypen
- Jedes Diagramm hat einen Titel, der sagt, was man sieht, und einen Satz mit der Kernaussage in echten Zahlen
- Alle Diagramme gleich aufgebaut: gleiche Achse für km, gleiche Farben, gleiche Schrift (Zahlen in Geist Mono)
- Balken starten bei null. Achsen mit runden Schritten (0, 5, 10 km), wenige Gitterlinien
- Wichtiges ist ohne Hover oder Antippen sichtbar. Antippen zeigt nur Details
- Barrierefrei: Text oder Tabelle mit denselben Werten als Alternative. Beschreibungen mit echten Werten statt "schnell" oder "fast", Datum und Einheiten ausgeschrieben

## Bewusst nicht übernommen
Rechtliches, 404, Cookie-Banner: für einen privaten Tracker ohne Tracking nicht passend. Bei öffentlicher Domain neu prüfen (Fable-Checkpoint C).
