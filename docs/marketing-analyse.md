# Race Tracker: Positionierung, Texte, Ideen

Stand 25.11.2026. Grundlage: `src/pages/index.astro`, `src/pages/[race].astro`, `src/layouts/Base.astro`, `src/content/races/hamburg-2026.json`, `docs/VISION.md`, `docs/DESIGN.md`, `docs/ROADMAP.md`, Entscheidung `2026-11-25-titel-rennseite.md`, Legacy-Texte. Alle Zahlen unten stammen aus `hamburg-2026.json` (Start 25.10.2026, 09:45 Uhr Ortszeit, 21,1 km, Startnummer 14821, Block B, Zielzeit 1:40:00, Netto 1:47:05, also 5:05/km).

## 1. Diagnose

**Was trägt**
- Die Unterzeile der Startseite trifft den Kern: "wann er bei dir vorbeikommt". Das ist der eigentliche Nutzen, nicht "live verfolgen". Den Satz behalten oder nach oben ziehen.
- Der Legacy-Satz in der Tagline ist das beste Stück Text im ganzen Projekt: "Du stehst an der Strecke, ich laufe vorbei. Diese Seite sorgt dafür, dass du in dem Moment nicht gerade aufs Handy schaust." Er beschreibt ein echtes Problem in Alltagssprache. Gehört beim Port unbedingt mit.
- Ehrlichkeit als Haltung (VISION 5: "geschätzt" offen anzeigen, Kartenquelle im Footer) ist ein echtes Unterscheidungsmerkmal gegenüber Veranstalter-Apps. Daraus lässt sich Vertrauen bauen, ohne etwas zu behaupten.
- Die Zahlen im Hero (Distanz, Startnummer, Netto, Pace) sind konkret und glaubwürdig.

**Was nicht trägt**
- **Positionierung unklar für Fremde.** Die Seite sagt, was sie tut ("Rennen live verfolgen"), aber nicht für wen. Wer den Link in WhatsApp bekommt, kennt den Läufer, aber die Seite nennt ihn nirgends. Seit der Titel-Entscheidung steht auf der Rennseite kein Name mehr. Für die Startseite ist das richtig, auf der Rennseite fehlt dem Besucher die wichtigste Information: wessen Rennen ist das.
- **Die Rennseite ist die eigentliche Landingpage.** Fast alle kommen über einen geteilten Link direkt auf `/hamburg-2026`. Die Startseite sieht kaum jemand. Text und Vorschau der Rennseite sind deshalb wichtiger als jede Zeile auf `/`.
- **Keine Hauptaktion.** Startseite und Rennseite haben heute keinen Button. DESIGN.md sieht je Phase eine vor ("Spot setzen", "Live verfolgen", "Zeiten ansehen"), umgesetzt ist sie noch nicht (Phase 1). Bis dahin endet der erste Bildschirm am Handy in einer Faktenzeile.
- **Titel in Kleinschreibung.** "hella hamburg halbmarathon 2026" ist die offizielle Schreibweise des Veranstalters, wirkt aber in einer WhatsApp-Vorschau und als 48-px-H1 auf drei bis vier Zeilen wie ein Fehler. Vorschlag: im Seitentext so lassen, für `og:title` und Browsertitel einen lesbaren Namen nutzen (siehe 3).
- **Label "Ziel" vor dem Start ist mehrdeutig.** Ziel kann Ort oder Zeit heißen. Besser "Zielzeit".
- **Meta-Description ist eine Feature-Liste.** "geschätzte Position, Zwischenzeiten, Cheering Spots und Pinnwand" ist eine Aufzählung ohne Nutzen und ohne Person. Genau das klingt nach Vorlage.
- **WhatsApp-Vorschau heute:** Titel "hella hamburg halbmarathon 2026", darunter die Feature-Liste, kein Bild, keine kanonische URL. `og:image` und `og:url` werden in `Base.astro` erst ausgegeben, wenn `site` keine Platzhalterdomain mehr ist. Ohne Bild zeigt WhatsApp nur eine kleine graue Textkarte, die im Gruppenchat untergeht.
- **Statische Beschreibung bei wechselnder Phase.** Die Seite wird gebaut, die Description steht also fest. WhatsApp cacht Vorschauen zusätzlich. Ein Text, der nur vor dem Start stimmt, steht dann auch nach dem Rennen noch da. Entweder phasenneutral formulieren oder beim Statuswechsel neu bauen.

**Erster Eindruck am Handy (375 px)**
Oben "Alle Rennen", dann die H1 in 48 px über mehrere Zeilen, Datum, Faktenzeile. Die Karte beginnt erst unter dem Falz. Es gibt keinen Satz, der erklärt, was man hier tun kann, und keinen Daumen-Button. Im Zielbild gehört an diese Stelle: eine Statuszeile mit Phase, ein Satz, eine Hauptaktion.

## 2. Positionierung

**Heute (Zuschauer)**
- Positionierung: Ein Link pro Rennen, mit dem Freunde und Familie an der Strecke sehen, wo der Läufer gerade ist und wann er bei ihnen vorbeikommt.
- Das eine Nutzenversprechen: **Du verpasst den Moment nicht, in dem er an dir vorbeiläuft.**

**Später (Läufer als Nutzer)**
- Positionierung: Ein Tracker für dein eigenes Rennen, den du deinen Leuten schickst, damit sie wissen, wo sie stehen sollen und wann du kommst.
- Das eine Nutzenversprechen: **Deine Leute stehen an der richtigen Stelle, wenn du vorbeikommst.**

Beide Versprechen hängen am selben Moment: dem Vorbeilaufen. Das ist der Kern, um den Texte, Bilder und später der Name kreisen sollten. Live-Position, Splits und 3D sind Mittel dazu, nicht die Botschaft.

## 3. Textvorschläge (kopierfertig)

Empfehlung jeweils mit **(E)** markiert. `{Name}` ist der Vorname des Läufers. Dafür braucht es ein neues Feld `runner` in den Renndaten (siehe Ideen). Bis dahin "Dima" fest eintragen.

### Startseite
| Stelle | Variante A | Variante B |
|---|---|---|
| H1 | **(E)** Wo ist dein Läufer gerade? | Rennen live verfolgen (heutiger Stand) |
| Unterzeile | **(E)** Sieh auf der Strecke, wo er gerade ist und wann er bei dir vorbeikommt. | Du stehst an der Strecke, er läuft vorbei. Hier siehst du, wann es so weit ist. |
| Hauptaktion | **(E)** Zum nächsten Rennen (führt auf das jüngste Rennen) | Hamburg noch mal ansehen (sobald das Replay steht) |

Begründung A: Die Frage ist genau das, was Zuschauer am Renntag in den Gruppenchat schreiben. Die Unterzeile ist die heutige, leicht gekürzt.

### Rennseite je Phase
Statuszeile steht über der H1 als kleiner Text (`caption-4`), Zahlen in Geist Mono.

**Vor dem Start**
| Stelle | Variante A | Variante B |
|---|---|---|
| Statuszeile | **(E)** {Name} startet am Sonntag um 09:45 Uhr · Block B | Noch 2 Tage bis zum Start · Startnummer 14821 |
| Satz | **(E)** Setz deinen Spot an der Strecke. Am Renntag siehst du, wann {Name} bei dir vorbeikommt. | Sag {Name}, wo du stehst. Er sieht deinen Spot auf seiner Karte. |
| Hauptaktion | **(E)** Spot setzen | Wo stehst du? |

Hinweis B: "Er sieht deinen Spot" nur verwenden, wenn der Läufer die Spots tatsächlich unterwegs sieht. Sonst A.

**Live**
| Stelle | Variante A | Variante B |
|---|---|---|
| Statuszeile | **(E)** Live · km 12,4 · zuletzt vor 20 s | Geschätzt · km 12,4 · letzte Zwischenzeit bei km 10 |
| Satz | **(E)** {Name} ist gerade kurz hinter den Landungsbrücken. Bei deinem Spot in etwa 14 Minuten. | {Name} läuft gerade 5:05 pro km. Deinen Spot erreicht er gegen 10:58 Uhr. |
| Hauptaktion | **(E)** Live verfolgen | Wann kommt er bei mir an? |

Die Beispielwerte sind Platzhalter für die Laufzeitwerte aus `estimate.ts` und `telemetry`, nicht als feste Texte gedacht. Ohne eigenen Spot entfällt der zweite Satz.

**Im Ziel**
| Stelle | Variante A | Variante B |
|---|---|---|
| Statuszeile | **(E)** Im Ziel · Netto 1:47:05 · 5:05 pro km | Im Ziel nach 1:47:05 |
| Satz | **(E)** Danke fürs Mitfiebern. Hier sind alle Zwischenzeiten und das ganze Rennen zum Nachschauen. | {Name} ist angekommen. Schau dir an, wie das Rennen gelaufen ist. |
| Hauptaktion | **(E)** Zeiten ansehen | Rennen noch mal ansehen (Replay) |

Hinweis: Die Zielzeit (1:40:00) wurde verfehlt. Im Ziel nicht neben das Ergebnis stellen, das liest sich wie ein Urteil. Ob überhaupt, entscheidet der Läufer.

### Meta-Description
| Seite | Variante A | Variante B |
|---|---|---|
| Startseite | **(E)** Sieh am Renntag, wo dein Läufer gerade ist und wann er an deinem Platz an der Strecke vorbeikommt. | Ein Link pro Rennen für Freunde und Familie. Du siehst die Position auf der Strecke und wann er bei dir ankommt. |
| Rennseite (phasenneutral) | **(E)** {Name} beim {Kurzname} am {Datum}. Setz deinen Spot an der Strecke und sieh, wann er bei dir vorbeikommt. | {Strecke in km} km durch {Stadt} am {Datum}. Hier siehst du, wo {Name} gerade ist und wann er bei dir vorbeikommt. |

Ausgefüllt für Hamburg (E): "Dima beim Hamburg Halbmarathon am 25. Oktober 2026. Setz deinen Spot an der Strecke und sieh, wann er bei dir vorbeikommt."
Beide Varianten behaupten keine Phase und stimmen deshalb auch nach dem Bau noch. `{Kurzname}` ("Hamburg Halbmarathon") steht nicht in den Daten. Entweder neues Feld `shortTitle` oder aus `city` und Distanz bilden.

### WhatsApp-Vorschau (`og:title` + `og:description`)
`og:title` darf vom H1 abweichen. Die Titel-Entscheidung betrifft Seitentitel und H1, nicht die Vorschau. Das sollte im Entscheidungsdokument ergänzt werden, wenn A gewählt wird.

| | Variante A **(E)** | Variante B |
|---|---|---|
| og:title | Dima läuft den Hamburg Halbmarathon | hella hamburg halbmarathon 2026 |
| og:description | Sonntag, 25. Oktober, Start 09:45 Uhr. Setz deinen Spot und sieh, wann er bei dir vorbeikommt. | Dima läuft mit. Hier siehst du, wo er gerade ist und wann er an deinem Platz vorbeikommt. |

A wirkt im Gruppenchat, weil der Name vorne steht. Nachteil: "läuft" stimmt nach dem Rennen nicht mehr (Grund der Titel-Entscheidung). Für die Vorschau ist das vertretbar, weil sie fast nur vor und am Renntag geteilt wird. Nach dem Rennen beim Neubau auf "Dima im Ziel beim Hamburg Halbmarathon" wechseln.

## 4. Ideen mit hoher Wirkung

### 4.1 Vorschaubild pro Rennen aus der Strecke
- **Was:** 1200 × 630 px, flacher Hintergrund in `--bg`, die Route aus `course.route` als blaue Linie, darunter Name, Datum, Distanz in Geist Mono. Im Ziel zusätzlich Netto und Pace. Hell als Standard, weil WhatsApp das Bild auf hellem und dunklem Grund zeigt.
- **Warum:** Die Vorschau ist der erste Kontakt für fast alle Besucher. Eine erkennbare Streckenform ist persönlicher als jedes Stockfoto und braucht keine erfundenen Inhalte. Ohne Bild geht der Link im Gruppenchat unter.
- **Aufwand:** etwa ein Tag. SVG im Build aus den Routendaten erzeugen, mit `sharp` oder `@resvg/resvg-js` zu PNG rendern, Schrift lokal aus `@fontsource`. Erst wirksam mit echter Domain (`og:image` braucht eine absolute URL).
- **Daten:** vorhanden (`course.route`, `course.bounds`, `title`, `date`, `distanceKm`, `result`). Neu nur `runner` (Vorname), siehe 4.5.

### 4.2 Countdown mit "In den Kalender"
- **Was:** Vor dem Start zeigt die Statuszeile "Start in 2 Tagen" bzw. am Renntag "Start in 1:12 h". Daneben eine `.ics`-Datei mit Startzeit, Link zur Rennseite und Ort.
- **Warum:** Zuschauer vergessen den Link zwischen Teilen und Renntag. Der Kalendereintrag bringt sie zur richtigen Zeit zurück, ohne Push oder Konto. Das ist der billigste Weg, am Renntag mehr Leute auf der Seite zu haben.
- **Aufwand:** klein, ein halber Tag. `.ics` lässt sich statisch im Build erzeugen.
- **Daten:** vorhanden (`plannedStart`, `timezone`, `city`). Startort als Text fehlt, `landmarks[0].name` ("Start Reeperbahn") reicht.

### 4.3 "Ich stehe hier" teilen
- **Was:** Nach dem Setzen eines Spots ein Button "In die Gruppe schicken" (Web Share API, sonst Link kopieren). Text: "Ich stehe bei km 6,6 an den Landungsbrücken. Dima kommt dort gegen 10:20 Uhr vorbei." plus Link.
- **Warum:** Jeder geteilte Spot ist eine neue Einladung im Chat, mit konkretem Grund zu klicken. Zuschauer koordinieren sich ohnehin, wer wo steht. Die Seite liefert ihnen dafür den Satz.
- **Aufwand:** klein bis mittel, sobald Spots und Schätzung aus Phase 1 laufen.
- **Daten:** vorhanden nach Phase 1 (Spots in Supabase, `estimate.ts`, `landmarks` für den Ortsnamen). Keine neuen Felder.

### 4.4 Zielmoment als Bild zum Teilen
- **Was:** Im Ziel eine Karte im Format 4:5 oder 9:16: Strecke, Netto, Pace, Splits als kleine Balken, Anzahl der Spots und Pinnwand-Nachrichten ("12 Leute an der Strecke"). Button "Bild teilen" über die Web Share API mit Datei.
- **Warum:** Der Läufer postet nach dem Rennen sowieso. Wenn das Bild aus dem Tracker kommt, sehen genau die Leute den Tracker, die beim nächsten Rennen selbst laufen. Das ist der natürliche Weg zu Nutzern für das spätere Produkt.
- **Aufwand:** mittel, ein bis zwei Tage. Clientseitig per Canvas, gleiche Gestaltung wie 4.1.
- **Daten:** vorhanden (`result.netSec`, Splits, Spots, Nachrichten). Die Zahl der Zuschauer nur zählen, nicht schätzen.

### 4.5 Name des Läufers als Datenfeld
- **Was:** Neues Feld `runner` (Vorname) in `src/content.config.ts` und den Renndaten. Wird genutzt in Statuszeile, Description, `og:title`, Vorschaubild und Teilen-Texten.
- **Warum:** Fast alle Textvorschläge oben brauchen den Namen. Fest eingetragenes "Dima" wäre der nächste Port-Rest, den man später wieder ausbaut. Mit dem Feld ist die Seite für Freunde des Läufers schon vorbereitet.
- **Aufwand:** sehr klein. Ein Schemafeld, ein Wert pro Rennen.
- **Daten:** neu, aber eindeutig benannt.

## 5. Namensideen (spätere Marke)

Vor jeder Nutzung Markenregister (DPMA, EUIPO), Domains und App-Store-Namen prüfen. Das ist hier nicht passiert.

1. **Vorbei**: Der Name ist der Moment, um den es geht. Kurz, deutsch, als Verb im Alltag ("er ist gerade vorbei").
2. **Streckenrand**: Benennt den Ort der Zuschauer und damit die heutige Zielgruppe. Klingt nach Sport, nicht nach Technik.
3. **Zuruf**: Was man am Streckenrand tut. Passt zu Pinnwand und Cheering Spots.
4. **Mitfiebern**: Beschreibt das Gefühl der Freunde, nicht die Funktion. Gut für Texte wie "Danke fürs Mitfiebern".
5. **Läuft**: Doppelsinn aus Laufen und "läuft bei dir". Nachteil: schwer zu suchen, schwer als Marke zu schützen.
6. **Cheerline**: Englisch, für ein späteres internationales Produkt. Cheering plus Linie der Strecke.
7. **Spotter**: Die Zuschauer setzen Spots und halten Ausschau. Funktioniert auf Deutsch und Englisch.
8. **Kilometerstein**: Ruhig und deutsch, verweist auf Zwischenzeiten. Eher lang für ein App-Icon.

Persönliche Favoriten für ein deutsches Produkt: Vorbei und Streckenrand.

## 6. SEO, sobald indexiert werden soll

- **Erst entscheiden, was indexiert wird.** Rennseiten enthalten Vorname, Startnummer, Ergebnis und später Pinnwand-Nachrichten von Gästen. Das sind personenbezogene Daten. Vorschlag: Startseite bzw. spätere Produktseite indexieren, Rennseiten standardmäßig `noindex` lassen und pro Rennen freischalten. Passt zu Checkpoint C in DESIGN.md.
- **Technik:** echte Domain in `astro.config.mjs` (`site`), dann erscheinen `canonical`, `og:url` und `og:image` automatisch. `noindex` pro Seite über die vorhandene Prop abschalten. `@astrojs/sitemap` nur für freigegebene Seiten, `robots.txt` mit Verweis auf die Sitemap.
- **Titel und Description:** jede Seite eindeutig. Browsertitel der Rennseite lesbar schreiben (z. B. "Hamburg Halbmarathon 2026 · Dima"), Description wie in Abschnitt 3.
- **Strukturierte Daten:** `SportsEvent` als JSON-LD nur mit Werten, die sichtbar auf der Seite stehen (Name, Datum, Ort). Nichts ergänzen, was die Seite nicht zeigt (DESIGN.md).
- **Ladezeit:** 3D bleibt lazy, Fonts sind schon selbst gehostet. Vor dem Freischalten Lighthouse am Handyprofil laufen lassen.
- **Search Console** für die Domain einrichten, Vorschau mit dem Facebook Sharing Debugger auf der echten URL prüfen (WhatsApp nutzt dieselben OG-Tags).
- Keine Keyword-Recherche ohne echte Daten. Wenn nötig, nach Freischaltung die Suchanfragen aus der Search Console auswerten.
