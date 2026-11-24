# Sichtprüfung Streckenband und Läufer auf /dev/live (24.11.2026)

Prüfung des Durchstichs der 3D-Ansicht (`/dev/live?race=barcelona-2027`) gegen das Zielbild aus München (`docs/reference/munich-video/frame-04.jpg` und `frame-05.jpg`), gemäß Paket `docs/tasks/002-gemini-sichtpruefung-live.md`.

## Setup und Messumgebung
- **URL:** `http://localhost:4321/dev/live?race=barcelona-2027`
- **Auflösungen:**
  - Desktop: 1280 × 900 (Screenshots auf max. 1200 px Breite skaliert, Qualität 80)
  - Handy: 390 × 844
- **Themen:** Hell und dunkel (emuliert via `prefers-color-scheme`)
- **Stellen:**
  - km 12,0
  - km 13,9 (Sagrada Família)
  - km 28,5 (am Meer)
- **Modi:** Folgen (`follow`) und Übersicht (`overview`)
- **Browser-Konsole:** Keine Fehler oder Ausnahmen (wörtlich: nur `[vite] connecting...` und `[vite] connected.`).

---

## Einzelbewertung der Screenshots

### 1. Stelle: km 12,0

#### Desktop Folgen Hell (`km12-folgen-hell.jpg`)
- **Streckenband:** Der kräftige gelaufene Teil (`#1664C0`) endet mit einer geraden Kante exakt unter den Füßen des Läufers. Der davor liegende Teil ist deutlich blasser (mattes Graublau). Die Pfeiltextur fließt bei laufender Wiedergabe (`play()`) kontinuierlich in Laufrichtung. Die Pfeilspitzen sind blassblau statt strahlend weiß. Das Band verläuft zwischen den Hauswänden auf der Straße, lässt aber zu den Gebäuden breite Lücken frei (schmaler als in `frame-04.jpg`).
- **Läufer:** Höhe ca. 148 px (Kopf ca. 45 px, Körper ca. 103 px). Die Beine und Arme sind in Laufbewegung. Die Startnummerfläche auf dem Rücken ist ein leeres weißes Rechteck ohne Ziffern. Der Läufer hat keine Kappe, Ohren oder Gesichtszüge. Am Boden pulsiert ein doppelter oranger Ring (Durchmesser ca. 175 px).
- **Sonstiges:** Keine Bäume vorhanden; Gebäude sind einfache weiße/graue Monolithen. Es fehlt das Läufer-Label (`DIMA 12.0 km · 5:00/km`). Das HUD besteht nur aus den vier Entwickler-Karten oben links.

#### Desktop Folgen Dunkel (`km12-folgen-dunkel.jpg`)
- **Streckenband:** Gelaufener Teil in hellem Mittelblau (`#4DA3EE`), ungelaufener Teil in dunklem Graublau. Scharfer Übergang genau unter den Füßen. Textur fließt vorwärts.
- **Läufer:** Körper und Trikot wechseln in dunkle/weiße Farbtöne (`figurePalette`), Startnummerfeld bleibt unbeschriftet. Höhe ca. 148 px.
- **Sonstiges:** Schwarzer Himmel und dunkle Häuserschluchten. Guter Farbkontrast der Route, aber sehr kahles Gesamtbild ohne Straßenelemente oder Bewuchs.

#### Desktop Übersicht Hell (`km12-uebersicht-hell.jpg`)
- **Streckenband:** Das Streckenband wird über der gesamten Stadt gerendert (`depthTest = false`, `renderOrder = 4.5`), sodass es über den Dächern der Häuser liegt und den gesamten 42-km-Kurs zeigt. Gelaufener Teil (12 km) kräftig dunkelblau, Rest blass.
- **Läufer:** Höhe ca. 42 px (hält die Untergrenze `FIGURE_MIN_PX = 40`). Er fällt in der Übersicht **nicht** als Erstes auf: Die drei großen Ballon-Pins (rot, gelb, blau) dominieren die Szene massiv.
- **Sonstiges:** Häusermeer aus 22.489 Gebäuden ohne Bäume oder Grünflächen-Struktur.

#### Desktop Übersicht Dunkel (`km12-uebersicht-dunkel.jpg`)
- **Streckenband:** Blaue Linie liegt gut sichtbar über der dunklen Stadt. Gelaufenes Band hebt sich klar vom ungelaufenen Rest ab.
- **Läufer:** Höhe ca. 42 px. Geht im dunklen Häusermeer fast vollständig unter; nur der orange Ring gibt einen kleinen optischen Hinweis.
- **Sonstiges:** Sehr dunkle Szene; Wasserflächen heben sich kaum vom schwarzen Hintergrund ab.

#### Handy Folgen Hell (`km12-folgen-hell-handy.jpg`)
- **Streckenband:** Nimmt horizontal ca. ein Drittel der sichtbaren Canvas-Breite ein. Kräftiger Teil endet sauber unter den Füßen.
- **Läufer:** Höhe ca. 145 px, wirkt im schmalen Hochformat (390 px) sehr präsent und groß. Startnummer fehlt.
- **Sonstiges:** Die vier HUD-Karten verdecken im oberen Drittel die Straße voraus.

#### Handy Folgen Dunkel (`km12-folgen-dunkel-handy.jpg`)
- **Streckenband:** Blauer Pfad leuchtet im Kontrast zur schwarzen Umgebung. Ende exakt unter der Figur.
- **Läufer:** Höhe ca. 145 px. Keine Startnummer.
- **Sonstiges:** HUD-Boxen dunkel hinterlegt. Unten verdecken Entwickler-Buttons ("Folgen", "Übersicht") den unteren Rand.

#### Handy Übersicht Hell (`km12-uebersicht-hell-handy.jpg`)
- **Streckenband:** Liegt vollständig über der Stadt. Route klar erkennbar.
- **Läufer:** Höhe ca. 40 px. Pins sind die dominierenden Elemente.
- **Sonstiges:** Karte wirkt im Handy-Hochformat gedrängt; HUD verdeckt den oberen Teil der Stadt.

#### Handy Übersicht Dunkel (`km12-uebersicht-dunkel-handy.jpg`)
- **Streckenband:** Hellblaue Route über schwarzem Stadtmodell.
- **Läufer:** Höhe ca. 40 px. Fast unsichtbar hinter dem HUD und zwischen den Kacheln.
- **Sonstiges:** Ballon-Pins ziehen die gesamte Aufmerksamkeit auf sich.

---

### 2. Stelle: km 13,9 (Sagrada Família)

#### Desktop Folgen Hell (`km13.9-folgen-hell.jpg`)
- **Streckenband:** Kräftiges Band endet präzise unter dem Läufer. Pfeile zeigen in Laufrichtung. Band verläuft zwischen den Häuserblöcken.
- **Läufer:** Höhe ca. 148 px.
- **Sonstiges:** Direkt rechts neben dem Läufer steht der rote Ballon-Pin des Spots "Sagrada Família". Der Pin ragt optisch in den Läufer hinein bzw. berührt ihn fast. Die Sagrada Família ist im Hintergrund als einfacher 30-Meter-Block zu sehen, ohne architektonische Details oder Türme.

#### Desktop Folgen Dunkel (`km13.9-folgen-dunkel.jpg`)
- **Streckenband:** Blaues Band endet unter dem Läufer, Rest blass.
- **Läufer:** Höhe ca. 148 px, ohne Startnummer.
- **Sonstiges:** Roter Pin glänzt stark; kollidiert visuell mit der rechten Schulter der Figur.

#### Desktop Übersicht Hell (`km13.9-uebersicht-hell.jpg`)
- **Streckenband:** Liegt über den Gebäuden. Der Abzweig der Schleife um die Sagrada Família ist sauber als gelaufen markiert.
- **Läufer:** Höhe ca. 42 px. Steht direkt am roten Pin und verschmilzt optisch mit dessen Sockel.
- **Sonstiges:** Keine bauliche Hervorhebung der Sagrada Família in der Stadtmasse.

#### Desktop Übersicht Dunkel (`km13.9-uebersicht-dunkel.jpg`)
- **Streckenband:** Route kontrastreich über der Stadt.
- **Läufer:** Höhe ca. 42 px. Wird vom roten Pin fast vollständig verdeckt.
- **Sonstiges:** Dichtes Kachelnetz ohne Baumstrukturen.

---

### 3. Stelle: km 28,5 (am Meer)

#### Desktop Folgen Hell (`km28.5-folgen-hell.jpg`)
- **Streckenband:** Kräftiger blauer Abschnitt endet genau unter dem Läufer. Rechts schließt sich eine grüne Parkfläche an, links flacher Boden. Band liegt flach am Boden.
- **Läufer:** Höhe ca. 148 px. Keine Startnummer, kein Label.
- **Sonstiges:** Die Umgebung wirkt extrem kahl: keine Gebäude direkt an der Strecke, keine Bäume, keine Uferpromenade oder Begrenzungen. Nur flache graue und grüne Farbflächen.

#### Desktop Folgen Dunkel (`km28.5-folgen-dunkel.jpg`)
- **Streckenband:** Hebt sich gut vom schwarzen Untergrund ab.
- **Läufer:** Höhe ca. 148 px.
- **Sonstiges:** Sehr leere Szene; außer der Straße und einer dunkelgrünen Fläche rechts ist kaum Geometrie im Sichtfeld.

#### Desktop Übersicht Hell (`km28.5-uebersicht-hell.jpg`)
- **Streckenband:** Gelaufener Teil umfasst nun mehr als die Hälfte der Strecke (28,5 von 42,2 km). Der blaue Küstenabschnitt ist klar markiert.
- **Läufer:** Höhe ca. 42 px. Befindet sich an der Küstenlinie nahe dem gelben und blauen Pin.
- **Sonstiges:** Meerfläche rechts ist als hellblaue Wasserfläche gut erkennbar.

#### Desktop Übersicht Dunkel (`km28.5-uebersicht-dunkel.jpg`)
- **Streckenband:** Gelaufene Route leuchtet blau über dem schwarzen Barcelona und entlang der Küste.
- **Läufer:** Höhe ca. 42 px. Durch den orangefarbenen Ring am Strandabschnitt lokalisierbar.
- **Sonstiges:** Wasserfläche und Landmasse verschwimmen farblich stark im Dunkeln.

---

## Browser-Konsole
Wortlaut aus `console-messages.json`:
- `[vite] connecting...`
- `[vite] connected.`
- **Fehler:** Keine. Weder Three.js-Warnungen noch Shader-Kompilierungsfehler oder JavaScript-Exceptions.

---

## Liste der Abweichungen vom Zielbild (sortiert nach Auffälligkeit)

1. **Fehlendes Läufer-Label (über allen Stellen):**
   In `frame-04.jpg` schwebt direkt über dem Kopf der Figur ein Pill-Label mit Name, km und Pace (`MAX 37.3 km · 5:14/km`). Auf `/dev/live` gibt es keinerlei Label über der Figur.
2. **Vollständiges Fehlen von Bäumen:**
   Entlang der Straßen und in Parks fehlen Bäume komplett. Die Stadt wirkt dadurch kahl und steril im Vergleich zu `frame-04.jpg` und `frame-05.jpg`, wo dicht gesetzte Low-Poly-Bäume die Straßenzüge säumen.
3. **Läufer geht in der Übersicht unter / Ballon-Pins übermächtig:**
   In der Übersicht fallen als Erstes die riesigen Ballon-Pins (rot, gelb, blau) ins Auge. Die Läuferfigur (40 px) mit unbeleuchtetem Rücken und mattem Ring ist kaum auffindbar und zieht den Blick nicht auf sich.
4. **Farbe und Textur des Streckenbands:**
   In `frame-04.jpg` ist das Band leuchtendes Cyan-Blau mit strahlend weißen doppelten Winkelpfeilen (`>>`). Im aktuellen Stand ist es ein gedecktes Royalblau mit blassblauen, schwach sichtbaren Pfeilspitzen.
5. **Fehlende Startnummer auf dem Trikot:**
   In `frame-04.jpg` hat die Figur eine schwarze Startnummer auf weißem Grund. Auf `/dev/live` ist das Feld auf Brust und Rücken unbedruckt weiß bzw. grau.
6. **Spot-Pin kollidiert mit Läufer bei km 13,9 (Sagrada Família):**
   Im Folgemodus ragt der rote Ballon-Pin bei km 13,9 direkt in den Körper des Läufers hinein und verdeckt seine rechte Seite.
7. **Wahrzeichen Sagrada Família ist nur ein Standard-OSM-Block:**
   An km 13,9 steht statt eines markanten 3D-Modells (wie das Siegestor in München) ein flacher, unstrukturierter Quader aus den OSM-Daten.
8. **HUD und Steuerung sind reine Entwickler-Elemente:**
   Statt des vertikalen Glassmorphism-Panels rechts und der schwebenden Kameraleiste links aus `frame-05.jpg` gibt es nur vier simple Info-Karten oben links und HTML-Buttons am unteren Rand.
