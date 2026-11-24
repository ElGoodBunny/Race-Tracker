# Nachprüfung Läufer, Pins und Streckenband auf /dev/live (24.11.2026)

Paket `docs/tasks/011-gemini-nachpruefung-live.md`, von Claude übernommen. Stand: `phase-2` mit den Paketen 004 bis 010, 012 und 013 (Commit `fb9db23`). Vorgänger: `docs/decisions/2026-11-24-sichtpruefung-live.md` (Paket 002).

## Vorgehen
- Seite `http://localhost:4322/dev/live?race=barcelona-2027`, eigener Dev-Server auf `phase-2`
- Aufnahme mit Playwright im installierten Chrome, Farbschema über `colorScheme`, Handy mit Touch. Sprung an den km und Modus wie im Paket beschrieben, danach 2,5 s warten
- Desktop 1280 × 900, danach auf 1200 px verkleinert. Handy 390 × 844. Am Desktop reicht die Ansicht 36 px unter den Fensterrand, dieser Streifen fehlt auf den Bildern
- Messwerte nicht geschätzt, sondern aus der Szene gerechnet: Läufer und Pins über die Projektion der Ansicht (`frame.project`), Panel, HUD und Kameraleiste über ihre Rechtecke im DOM. Rohwerte in `2026-11-24-nachpruefung-live/messwerte.json`
- Höhe in CSS-Pixeln = Abstand von Fußpunkt zu Scheitel (Läufer 38 Einheiten, Pin 41 Einheiten) auf dem Bildschirm. Von schräg oben gesehen ist das die untere Grenze, die sichtbare Figur ist etwas höher (Kopf und Körper haben Tiefe)
- "Überdeckt": Die Bildrahmen von Läufer und Pin überschneiden sich. Der Anteil ist eine obere Grenze, wer davor steht, entscheidet der Abstand zur Kamera
- Pfeile, Farben und Lage der Pins: angesehen, nicht gemessen

## Je Screenshot
Läufer und Pin in px. "Zuerst auf" nur in der Übersicht gefragt.

| Bild | Läufer px | Fällt zuerst auf | Label über ihm | Pins px | Pins kleiner | Pin überdeckt Läufer | Lage der Pins | Pfeile gelaufener Teil | Pfeile Rest | Kräftiger Teil endet unter Läufer | Unter Panel, Sheet, HUD, Leiste |
|---|---|---|---|---|---|---|---|---|---|---|---|
| `km12-folgen-hell.jpg` | 183 | – | ja | keiner im Bild | – | gar nicht | – | weiß, doppelte Winkel, gut zu sehen | sichtbar, leiser | ja | nein |
| `km12-folgen-hell-handy.jpg` | 152 | – | ja | keiner im Bild | – | gar nicht | – | weiß, doppelte Winkel, knapp über dem Sheet zu sehen | sichtbar, leiser | ja | nein |
| `km12-folgen-dunkel.jpg` | 183 | – | ja | keiner im Bild | – | gar nicht | – | dunkel, doppelte Winkel, gut zu sehen | sichtbar, leiser | ja | nein |
| `km12-folgen-dunkel-handy.jpg` | 152 | – | ja | keiner im Bild | – | gar nicht | – | dunkel, doppelte Winkel, knapp über dem Sheet zu sehen | sichtbar, leiser | ja | nein |
| `km12-uebersicht-hell.jpg` | 27 | ja, durch Label und Ring; Figur selbst klein (siehe Neu 2) | ja | Sagrada Família 16, Port Vell 14, Fòrum 16 | ja | gar nicht | auf Häusern bzw. Kai, keiner im Wasser | bei dieser Größe nicht erkennbar | nicht erkennbar | ja, kräftiger Teil bis zum Ring | nein |
| `km12-uebersicht-hell-handy.jpg` | 27 | ja, durch Label und Ring; Figur selbst klein (siehe Neu 2) | ja | Sagrada Família 16, Port Vell 15, Fòrum 16 | ja | gar nicht | auf Häusern bzw. Kai, keiner im Wasser | bei dieser Größe nicht erkennbar | nicht erkennbar | ja, kräftiger Teil bis zum Ring | Fòrum 61% unter Kameraleiste |
| `km12-uebersicht-dunkel.jpg` | 27 | ja, durch Label und Ring; Figur selbst klein (siehe Neu 2) | ja | Sagrada Família 16, Port Vell 14, Fòrum 16 | ja | gar nicht | auf Häusern bzw. Kai, keiner im Wasser | bei dieser Größe nicht erkennbar | nicht erkennbar | ja, kräftiger Teil bis zum Ring | nein |
| `km12-uebersicht-dunkel-handy.jpg` | 27 | ja, durch Label und Ring; Figur selbst klein (siehe Neu 2) | ja | Sagrada Família 16, Port Vell 15, Fòrum 16 | ja | gar nicht | auf Häusern bzw. Kai, keiner im Wasser | bei dieser Größe nicht erkennbar | nicht erkennbar | ja, kräftiger Teil bis zum Ring | Fòrum 61% unter Kameraleiste |
| `km13.9-folgen-hell.jpg` | 183 | – | ja | Sagrada Família 204 | nein, größer | gar nicht | neben dem Band auf der Straße | weiß, doppelte Winkel, gut zu sehen | sichtbar, leiser | ja | nein |
| `km13.9-folgen-hell-handy.jpg` | 152 | – | ja | Sagrada Família 169 | nein, größer | gar nicht | neben dem Band auf der Straße | gelaufener Teil fast ganz unter dem Sheet | sichtbar, leiser | ja | Sagrada Família 11% unter Kameraleiste |
| `km13.9-folgen-dunkel.jpg` | 183 | – | ja | Sagrada Família 204 | nein, größer | gar nicht; Konfetti liegt über dem Kopf | neben dem Band auf der Straße | dunkel, doppelte Winkel, gut zu sehen | sichtbar, leiser | ja | nein |
| `km13.9-folgen-dunkel-handy.jpg` | 152 | – | ja | Sagrada Família 169 | nein, größer | gar nicht | neben dem Band auf der Straße | gelaufener Teil fast ganz unter dem Sheet | sichtbar, leiser | ja | Sagrada Família 11% unter Kameraleiste |
| `km13.9-uebersicht-hell.jpg` | 27 | ja, durch Label und Ring; Figur selbst klein (siehe Neu 2) | ja | Sagrada Família 16, Port Vell 14, Fòrum 16 | ja | teilweise, Sagrada Família (19% des Rahmens, Läufer davor) | auf Häusern bzw. Kai, keiner im Wasser | bei dieser Größe nicht erkennbar | nicht erkennbar | ja, kräftiger Teil bis zum Ring | nein |
| `km13.9-uebersicht-hell-handy.jpg` | 27 | ja, durch Label und Ring; Figur selbst klein (siehe Neu 2) | ja | Sagrada Família 16, Port Vell 15, Fòrum 16 | ja | teilweise, Sagrada Família (17% des Rahmens, Läufer davor) | auf Häusern bzw. Kai, keiner im Wasser | bei dieser Größe nicht erkennbar | nicht erkennbar | ja, kräftiger Teil bis zum Ring | Fòrum 61% unter Kameraleiste |
| `km13.9-uebersicht-dunkel.jpg` | 27 | ja, durch Label und Ring; Figur selbst klein (siehe Neu 2) | ja | Sagrada Família 16, Port Vell 14, Fòrum 16 | ja | teilweise, Sagrada Família (19% des Rahmens, Läufer davor) | auf Häusern bzw. Kai, keiner im Wasser | bei dieser Größe nicht erkennbar | nicht erkennbar | ja, kräftiger Teil bis zum Ring | nein |
| `km13.9-uebersicht-dunkel-handy.jpg` | 27 | ja, durch Label und Ring; Figur selbst klein (siehe Neu 2) | ja | Sagrada Família 16, Port Vell 15, Fòrum 16 | ja | teilweise, Sagrada Família (17% des Rahmens, Läufer davor) | auf Häusern bzw. Kai, keiner im Wasser | bei dieser Größe nicht erkennbar | nicht erkennbar | ja, kräftiger Teil bis zum Ring | Fòrum 61% unter Kameraleiste |
| `km28.5-folgen-hell.jpg` | 182 | – | ja | keiner im Bild | – | gar nicht | – | weiß, doppelte Winkel, gut zu sehen | sichtbar, leiser | ja | nein |
| `km28.5-folgen-dunkel.jpg` | 182 | – | ja | keiner im Bild | – | gar nicht | – | dunkel, doppelte Winkel, gut zu sehen | sichtbar, leiser | ja | nein |
| `km28.5-uebersicht-hell.jpg` | 26 | ja, durch Label und Ring; Figur selbst klein (siehe Neu 2) | ja | Sagrada Família 16, Port Vell 14, Fòrum 16 | ja | gar nicht | auf Häusern bzw. Kai, keiner im Wasser | bei dieser Größe nicht erkennbar | nicht erkennbar | ja, kräftiger Teil bis zum Ring | nein |
| `km28.5-uebersicht-dunkel.jpg` | 26 | ja, durch Label und Ring; Figur selbst klein (siehe Neu 2) | ja | Sagrada Família 16, Port Vell 14, Fòrum 16 | ja | gar nicht | auf Häusern bzw. Kai, keiner im Wasser | bei dieser Größe nicht erkennbar | nicht erkennbar | ja, kräftiger Teil bis zum Ring | nein |

Fließen: Die Pfeile fließen mit der Uhrzeit, auch bei Pause (`scene.ts`, `FLOW_M_PER_S`). Gesehen an km 12 Folgen hell: Zwei Ausschnitte 0,3 s nacheinander zeigen die Winkel versetzt. In den Übersichten nicht zu erkennen.

## Browser-Konsole
Keine Fehler. In `2026-11-24-nachpruefung-live/console-messages.json` stehen nur `[vite] connecting...` und `[vite] connected.`, je einmal pro Seitenaufruf (4 Aufrufe). Kein `pageerror`.

## Aus 002 behoben
| Nr. | Abweichung aus 002 | Stand | Bild |
|---|---|---|---|
| 1 | Läufer-Label fehlt | behoben. Label in allen 20 Bildern über dem Kopf | `km12-folgen-hell.jpg`, `km12-uebersicht-hell.jpg` |
| 2 | Keine Bäume | behoben. Bäume an den Straßen im Folgemodus, in der Übersicht keine (gewollt, nur in der Nähe) | `km12-folgen-hell.jpg`, `km28.5-folgen-hell.jpg` |
| 3 | Läufer geht in der Übersicht unter, Pins übermächtig | teilweise. Pins sind jetzt 14 bis 16 px, der Läufer fällt durch Label und Ring zuerst auf. Die Figur selbst ist aber nur etwa 27 bis 30 px hoch (siehe Neu 2) | `km12-uebersicht-hell.jpg`, `km12-uebersicht-dunkel.jpg` |
| 4 | Band gedeckt, Pfeile blass | behoben für die Pfeile: weiße (hell) bzw. dunkle (dunkel) Doppelwinkel im gelaufenen Teil, im Rest leiser. Farbton bleibt `--route`, so entschieden | `km12-folgen-hell.jpg`, `km12-folgen-dunkel.jpg` |
| 5 | Startnummer fehlt | offen. Feld auf dem Rücken weiß ohne Ziffern | `km12-folgen-hell.jpg` |
| 6 | Pin Sagrada Família ragt bei km 13,9 in den Läufer | behoben im Folgemodus: Pin steht rechts daneben, Rahmen berühren sich nicht. In der Übersicht überschneiden sich die Rahmen zu 17 bis 19 %, der Läufer steht davor | `km13.9-folgen-hell.jpg`, `km13.9-uebersicht-hell.jpg` |
| 7 | Sagrada Família nur ein OSM-Block | offen | `km13.9-folgen-hell.jpg` |
| 8 | HUD und Steuerung nur Entwickler-Elemente | behoben. Glas-Panel rechts bzw. Bottom Sheet, Kameraleiste, HUD-Karten | `km12-folgen-hell.jpg`, `km12-folgen-hell-handy.jpg` |

## Neu aufgefallen
Sortiert nach Auffälligkeit, das Auffälligste zuerst.

1. **Konfetti bleibt bei Pause groß im Bild stehen.** An km 13,9 ist der Spot gerade passiert. Im Folgemodus stehen große, flache Konfettistücke still in der Luft: gelbe Flächen oben links (hell), ein blaues Stück quer über dem Kopf des Läufers und ein gelbes neben seinem Körper (dunkel). Die Stücke sind so groß wie der halbe Läufer. `km13.9-folgen-hell.jpg`, `km13.9-folgen-dunkel.jpg`, `km13.9-folgen-hell-handy.jpg`
2. **Läufer in der Übersicht kleiner als 40 px.** Sichtbar sind es etwa 30 px (am Ausschnitt von `km12-uebersicht-hell.jpg` gemessen), von Fuß zu Scheitel 26 bis 27 px. Der Rahmen um Figur und Grundfläche ist 38 bis 40 px hoch. Der Prüfpunkt von Schritt 9 verlangt mindestens 40 px. Alle Übersichten
3. **Streckenband liegt in der Übersicht über dem Läufer.** Die hellblaue Linie des Bands läuft sichtbar durch Kopf und Körper der Figur. `km12-uebersicht-hell.jpg`, gleiches Bild in allen Übersichten
4. **Pin im Folgemodus größer als der Läufer.** Sagrada Família 204 px gegen 183 px am Desktop, 169 gegen 152 px am Handy. In der Übersicht ist es umgekehrt, wie gewollt. `km13.9-folgen-hell.jpg`, `km13.9-folgen-hell-handy.jpg`
5. **Am Handy liegt der Pin Fòrum unter der Kameraleiste.** In allen vier Handy-Übersichten zu etwa 60 % verdeckt, am rechten Rand. `km12-uebersicht-hell-handy.jpg`
6. **Am Handy ragt der Pin Sagrada Família im Folgemodus unter die Kameraleiste** (etwa 11 %). `km13.9-folgen-hell-handy.jpg`
7. **Am Handy im Folgemodus liegt der gelaufene Teil des Bands fast ganz unter dem Sheet**, der Ring unter dem Läufer stößt an die Kante des Sheets (aus 013 bekannt). `km13.9-folgen-hell-handy.jpg`

Nicht geprüft: echte Geräte, Bewegung beim Abspielen über längere Zeit.
