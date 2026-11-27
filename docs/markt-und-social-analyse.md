# Race Tracker: Markt, Wettbewerb, Social Media

Stand 25.11.2026. Baut auf `docs/marketing-analyse.md` auf (Positionierung, Texte, Ideen 4.1 bis 4.5) und wiederholt sie nicht. Quellen stehen als [n] im Text, Liste am Ende, alle abgerufen am 25.11.2026.
Kennzeichnung: **F** = Fakt mit Quelle, **S** = eigener Schluss, **E** = Empfehlung. **ALT** = Daten älter als zwölf Monate.
Reddit war für die Recherche technisch gesperrt (Abruf abgelehnt). Nutzerstimmen kommen deshalb aus App-Store-Bewertungen und Herstellerforen.

## Kurzfassung

- **S:** Das Problem "Zuschauer finden ihren Läufer" ist gelöst, aber zerstückelt: Veranstalter-Apps zeigen Splits an Matten, Uhren und Strava zeigen einen Punkt ohne Strecke und ohne Ankunftszeit.
- **F/S:** Zwei junge Anbieter bauen fast genau das Kernversprechen: RaceRoar (Link, Spot wählen, Ankunftszeit im Browser, kostenlos) [15][16] und Cheerlify (Link ohne App, Ankunftszeit je km, Sprach-Cheers, ab 0 €) [9][10]. Ein Startjahr nennt keiner der beiden. Store-Versionen und Artikeldaten sprechen für 2026 (Schluss). Der Platz "Spot plus ETA per Link" ist nicht mehr leer.
- **S:** Unterschiede, die nach heutigem Stand bleiben: eine gemeinsame Karte mit allen Spots der Gruppe (bei keinem Wettbewerber gefunden), Schätzung ohne Läufer-App, deutsche Oberfläche, ehrliche Datenquelle. 3D und Replay sind schön, aber kein Grund, das Produkt zu wechseln.
- **F:** Der Markt wächst: Die 15 größten deutschen Marathons hatten 2026 laut Portalauswertung zusammen 123.608 Finisher, ein Allzeitrekord (+15 % zu 2025) [19]. Dimas Halbmarathon war mit 24.000 Plätzen ausverkauft [21].
- **Gesamtbewertung: mittel.** Für Läufer im eigenen Umfeld trägt das Produkt, als eigenständiges Geschäft mit Erlösen ist das Potenzial niedrig. Größtes Risiko: kostenlose, fast gleiche Angebote plus geringe Nutzungsfrequenz (wenige Rennen pro Läufer und Jahr).

## Bewertungskriterien

| Kriterium | Frage | Gewicht |
|---|---|---|
| Problemgröße und Häufigkeit | Wie viele haben das Problem, wie oft? | hoch |
| Zahlungs- oder Teilungsbereitschaft | Zahlt jemand oder teilt er wenigstens? | mittel |
| Wettbewerbsdruck | Wie viele lösen es gut und gratis? | hoch |
| Differenzierung | Was kann nur dieses Produkt? | hoch |
| Virale Schleife | Bringt jeder Nutzer neue Läufer? | hoch |
| Aufwand bis zum Test | Wie weit ist der Code vom ersten fremden Läufer? | mittel |
| Rechtliche Risiken | DSGVO, fremde Schnittstellen | mittel |

Ergebnis je Kriterium in Abschnitt 6.

## 1. Markt und Wettbewerb

### 1.1 Anbieter im Überblick

| Anbieter | Was es wirklich kann | Preis | Schwächen aus Nutzersicht | Quelle |
|---|---|---|---|---|
| **Mika timing** (Apps für Berlin und Hamburg geprüft) | Favoriten verfolgen (Berlin bis 25, Hamburg bis 30), Push bei Splits, Bestenliste, Karte. Berlin: Läufer kann Tracking per Code auf Unterstützer beschränken | Berlin-App gratis, keine In-App-Käufe gelistet. Hamburg: Tracking per In-App-Kauf, in Bewertungen 1,99 € genannt | Berlin 2,8 von 5 bei 21 Bewertungen (US-Store). Hamburg-App im deutschen Store 1,6 von 5 bei 86 Bewertungen. Kritik: Zahlschranke für Tracking, "funktioniert nicht zuverlässig" (Bewertung 2019, **ALT**) | [3][4] |
| **RaceJoy** (RunSignup, USA) | GPS über das Handy des Läufers oder Chip-Splits, "Send-a-Cheer" als Audio, Fortschrittsmeldungen. Live-Karte bei Chip-Tracking nur, wenn der Zeitnehmer Vorhersage aktiviert | App gratis, In-App-Käufe | 3,9 von 5 bei rund 1.200 Bewertungen. Cheers spielen nur, wenn das Handy in der Hand ist. Akku. Ein Nutzer nennt Life360 als Alternative | [1][2] |
| **RACE RESULT** (my.raceresult) | Store-Eintrag nennt "participant live tracking on race weekend", Kartenansicht | nicht angegeben | Wie Zuschauer Läufer auswählen, ist öffentlich nicht beschrieben. Nicht belegbar | [5] |
| **davengo** | Anmeldung, Einwegchip-Zeitmessung, Ergebnisdienst, Startnummerndruck | B2B, kein Preis | Kein Live-Tracking oder Zuschauer-App auf der Website erwähnt | [6] |
| **MAXFUN** | Kein Treffer in Suche und Stores | | Nicht belegbar, Stand 25.11.2026 | |
| **Racemap** (DE) | Tracking-App für Teilnehmer und Zuschauer, Leih-Tracker für Veranstalter | Tracker ab 22 € je Gerät, Paket 100 € | B2B, nur wenn der Veranstalter bucht | [18] |
| **Strava Beacon** | Live-Standort, Startpunkt, Akku, Update etwa alle 15 s, bis zu drei Kontakte | Gratis aus der Handy-App, von der Uhr nur mit Abo (seit 2021, **ALT**) | Keine Strecke, keine Ankunftszeit, als Sicherheitsfunktion gebaut | [7][8][9] |
| **Garmin LiveTrack** | Live-Position, Pace, geladene Strecke. Zuschauer können während des Laufs Nachrichten schicken. Beta 2026: Auto-Start je Aktivitätstyp | Basis gratis, Connect+ für Komfort | Braucht gekoppeltes Handy. Forenberichte: Link fehlt oder ist kaputt, Gmail entfernt Links, Karte ohne Spur (meist mehrere Jahre alt, **ALT**). Changelog 2026 nennt behobene Abstürze bei LiveTrack | [9][11][12] |
| **Apple Wo ist? / Personen finden** | Standort von iPhone oder Cellular-Watch | gratis | Nur ein Punkt, keine Pace, keine Strecke. Beide Seiten brauchen Apple-Geräte. Netz am Renntag kann überlastet sein (London 2018, **ALT**) | [9][13][14] |
| **Life360** | Familienortung. Keine Funktion für Rennen gefunden, Preisseite nicht abrufbar (403) | nicht belegbar | Nicht für Rennen gebaut | [1] (Nutzerstimme) |
| **Livio** (Belgien) | Live-Karte, Alarm an Verpflegungsstellen und 1 km vor dem Ziel, Fokus Trail und Gravel | Folgen gratis, Läufer 5,95 € je Rennen oder ab 17,50 € im Jahr | Keine Ankunftszeit am eigenen Spot erwähnt | [17] |
| **RaceRoar** (Lostium, Spanien) | Läufer startet App, teilt Link oder QR. Zuschauer öffnen im Browser, wählen einen Spot, sehen die geschätzte Ankunft. "no sign-up and no personal data" | gratis, kein Geschäftsmodell sichtbar | Noch keine Bewertungen im Store. Version 1.0 am 18. März (Jahr nicht angezeigt). Laut Store 13 Sprachen, ob Deutsch dabei ist, nicht geprüft. Website nur Englisch | [15][16] |
| **Cheerlify** | Läufer-App, Zuschauer mit Link, Code und Name im Browser. Punkt auf der Strecke, Pace, Ankunft je km und im Ziel. Sprach- und Video-Cheers ins Ohr des Läufers. Im 12,99-€-Paket "CheerChat" (Inhalt nicht beschrieben) | Gratis bis 3 Zuschauer, 4,99 € (7 Zuschauer) oder 12,99 € (50 Zuschauer) je Rennen | Ab dem vierten Zuschauer kostenpflichtig. Firma und Land nicht angegeben. Vergleichsartikel ist Eigenwerbung | [9][10] |
| **CheerMyRun** | Laut Store-Suchauszug: ein Link, Zuschauer ohne App und Konto | nicht belegbar | Store-Seite nicht lesbar, nicht geprüft | [42] |
| **Veranstalter-Apps USA** (Chicago, Race Roster) | Chicago 2025: gratis, unbegrenztes Tracking, digitale Cheers. Race Roster: Vorhersage im Browser ohne App | gratis für Zuschauer | Nur für das jeweilige Rennen | [38][39] |

### 1.2 Was daraus folgt
- **S:** Es gibt zwei Lager. Zeitnahme-Apps sind offiziell und decken alle Läufer ab, zeigen aber nur Matten-Splits und sind oft schlecht bewertet [3]. Läufer-Apps (Beacon, LiveTrack, RaceRoar, Cheerlify) zeigen die echte Position, hängen aber am Handy des Läufers und an dessen Akku.
- **S:** RaceRoar und Cheerlify sind die eigentliche Konkurrenz, nicht Mika oder Strava. Beide brauchen eine Läufer-App. Eine gemeinsame Gruppenkarte mit allen Spots der Freunde ist bei keinem der beiden beschrieben. Die FAQ-Antworten von RaceRoar waren aber nicht sichtbar, und Cheerlify hat einen "CheerChat" [10].
- **S:** Cheerlify setzt die Zahlschranke genau bei der Gruppengröße an: Gratis sehen nur drei Zuschauer zu [10]. Für Familien mit vielen Leuten an der Strecke ist das der Punkt, an dem ein kostenloser Gruppen-Tracker stark wäre.
- **Gegenbeleg:** Für beide gibt es keine Bewertungen und keine unabhängigen Nutzerzahlen. Ein Social-Post von Lostium nennt über 160 Installationen an einem Wochenende (nur im Suchauszug gesehen, Firmenangabe). Das heißt zweierlei: Sie sind leicht einzuholen, aber auch die Nachfrage ist unbewiesen.

## 2. Lücke und Potenzial

### 2.1 Echt oder Wunschdenken

| Behaupteter Vorteil | Urteil | Begründung |
|---|---|---|
| Ankunftszeit am eigenen Spot | **nicht mehr einzigartig** | RaceRoar und Cheerlify können das [9][15] |
| Gruppe sieht alle Spots und wer wo steht | **bei keinem gefunden** | Bei keinem geprüften Wettbewerber öffentlich beschrieben. Löst das reale Koordinationsproblem im Gruppenchat. Cheerlify verlangt ab dem vierten Zuschauer Geld [10] |
| Läuft ohne App beim Läufer (Schätzung aus Pace und Splits) | **echt, aber schwächer** | Kein Akkuproblem, keine Installation. Ohne Live-Daten ist die Schätzung nur so gut wie die Zielpace. Splits trägt heute nur Dima selbst ein, im Rennen also niemand |
| Garmin LiveTrack als Quelle | **riskant** | Inoffizielle Schnittstelle, laut VISION.md noch nicht geprüft. Forenberichte über kaputte Links [11] |
| Pinnwand und "Gesehen" | **nicht einzigartig, Details offen** | Garmin und RaceJoy schicken Nachrichten an den Läufer [1][11]. Cheerlify hat "CheerChat" im großen Paket, Umfang unklar [10] |
| 3D-Stadt und Replay | **Wunschdenken als Kaufgrund** | Strava hat Flyover seit 2023, seit Anfang 2025 teilbar zu Instagram (Abo, **ALT**) [31]. Für das Teilen nach dem Rennen trotzdem wertvoll |
| Deutsch, DSGVO, kein Konto | **teilweise echt** | RaceRoar-Website nur Englisch, Deutsch in der App ungeprüft. Cheerlify verlangt Code und Name [9][15]. RaceRoar wirbt selbst mit "no personal data" [16] |

### 2.2 Marktgröße DACH (nur mit Quellen)
- **F:** 15 größte deutsche Marathons 2026: 123.608 Finisher (2025: 107.624, 2022: 65.776). Berlin 50.167, Hamburg 15.523, Frankfurt 13.334, Köln 9.625, München 9.134 [19]. Das ist eine Auswertung des Portals HDsports, keine Veranstalterzahl.
- **F:** Berlin 2026: über 56.000 Gemeldete aus 162 Nationen [20]. Für Berlin 2025 nennt eine Eventseite "rund 55.000 Finisher" [22], das passt nicht zu den 48.334 bei HDsports [19]. Die Eventseite ist auch in anderen Angaben fehlerhaft, deshalb hier HDsports.
- **F:** hella hamburg halbmarathon 2026: 24.000 von 24.000 Plätzen vergeben, zum zweiten Mal in Folge ausverkauft [21]. Wegen angekündigter Hitze vom 29.06. auf den 25.10.2026 verlegt, Gemeldete konnten umbuchen oder zurücktreten [41]. Eine AIMS-Meldung spricht von wieder geöffneter Anmeldung (nur Überschrift gesehen). Wie groß das Feld im Oktober war, ist unbekannt.
- **F:** Etwa 38 % der Deutschen laufen zumindest gelegentlich (Statista, zitiert von Hessenschau, 10.11.2025) [26].
- **Nicht gefunden:** eine Gesamtzahl für Halbmarathons oder alle Volksläufe in DACH. Die Statista-Reihe ist kostenpflichtig, die German-Road-Races-Tabelle 2024/2025 war nicht lesbar. Zahl der Zuschauer pro Läufer: keine Quelle, deshalb keine Hochrechnung.
- **S:** Allein die großen deutschen Marathons und der Hamburger Halbmarathon ergeben weit über 100.000 Starts im Jahr. Wie viele davon Freunde an der Strecke haben und ein eigenes Werkzeug wollen, ist unbekannt. Genau das sollen die Tests in Abschnitt 5 messen.
- **Gegenbeleg Häufigkeit:** Ein Läufer braucht den Tracker nur für die Rennen, bei denen jemand zuschaut. Bei den meisten Hobbyläufern sind das wenige Termine im Jahr. Das drückt Bindung und Zahlungsbereitschaft.

## 3. Trends 2025/2026

| Trend | Beleg | Bedeutung für den Tracker |
|---|---|---|
| Laufboom bei Rennen | Rekord bei Marathon-Finishern 2026 [19]. Gen Z: +31 % Halbmarathon, +33 % Marathon im Vorjahresvergleich (Strava, weltweit, Dez. 2025, **ALT** knapp) [23][24] | Mehr Erstläufer, deren Familien den Ablauf nicht kennen |
| Rennen als Motivation | Gen Z nennt ein Rennen um 75 % häufiger als Gen X als Hauptmotivation [24] | Renntag ist Höhepunkt, also teilenswert |
| Run-Clubs | Weltweit: neue Clubs auf Strava 2025 fast vervierfacht, Laufclubs 3,5-fach, insgesamt 1 Mio. Clubs [25]. Hessen: rund 15 neue Communities in zwei Jahren allein in Frankfurt, Kraft Runners bis 60 Leute pro Termin [26] | Fertige Gruppen, die gemeinsam zu Rennen fahren und sich gegenseitig anfeuern |
| Gegenbeleg Run-Clubs | Laut Umfrage SportsShoes 2026 ist Gruppenlaufen in der Praxis selten [27]. 25 % der Gen Z empfinden Clubs als exklusiv (eine Quelle, Paywall) [24] | Clubs sind ein Kanal, kein Massenmarkt |
| Supporter-Kultur | Schilder und Verkleidungen als Content: "John"-Schild auf TikTok (NYC, Nov. 2024, **ALT**) [32], Schilder-Galerien NYC 2025 [35]. Chicago 2025 zeigt digitale Cheers an der Strecke [38] | Zuschauer sind selbst Akteure. Der Tracker sollte ihnen eine Rolle geben, nicht nur eine Karte |
| Wearables und Abos | Garmin Connect+ (Anfang 2025, **ALT**) mit KI-Auswertung hinter der Zahlschranke [29]. LiveTrack-Auto-Start in Beta 2026 [12] | Mehr Läufer haben LiveTrack schon an. Gut für die Datenquelle |
| KI-Coaches | Strava kauft Runna (April 2025, **ALT**) [28] | Kein direkter Bezug. Nicht in diese Richtung bauen |

## 4. Social Media

### 4.1 Was rund um Rennen gepostet wird (beobachtet, keine Leistungsdaten)
Zu Aufrufen oder Interaktionen einzelner Formate gibt es keine öffentlichen Zahlen. Die Liste zeigt, was es gibt, nicht was am besten läuft.
- **Statistik-Sticker:** Strava "Sticker Stats" seit 09.04.2025 (**ALT**), transparente Grafik mit Distanz, Zeit und Streckenlinie für Instagram-Stories [30].
- **3D-Flug über die Strecke:** Strava Flyover, seit Anfang 2025 zu Instagram teilbar (**ALT**), nur mit Abo [31]. Drittanbieter wie Slid legen Werte über Videos [40].
- **Schilder und Zuschauer-Clips:** "John"-Schild (TikTok @bharrishudson, NYC 2024) [32], Galerien der besten Schilder NYC 2025 [35].
- **Run-Club-Content:** Clubs filmen ihre Läufe für eigene Kanäle [26].
- **POV aus Zuschauersicht:** als eigenes Format nicht belegt gefunden. Nicht als Trend behaupten.

### 4.2 Accounts im DACH-Raum
- **Communities (Runner's World, 30.07.2025, ALT):** @kraftrunners, @runnershamburg, @runnersberlin, @runnersfrankfurt, @colognerunningcrew, @0711.runners, @meenzrunners [33].
- **Creator nach Followern (Modash, 11.11.2026):** @pius_saier (119,7 Tsd.), @shirleys.miles (43,6 Tsd.), @heikobald (42,9 Tsd.), @themiles.mom (42,4 Tsd.) [34]. Rankings von Anbietern, Methode nicht offen.
- **Hashtags:** Keine verlässlichen Zahlen gefunden. Instagram und TikTok zeigen keine belastbaren Zählungen. **E:** Vor einer Kampagne die Rennhashtags (offizielle Tags der Veranstalter) von Hand prüfen statt generischer Tags.

### 4.3 Inhalte, die der Tracker liefern kann
Baut auf 4.3 ("Ich stehe hier" teilen) und 4.4 (Zielbild) der Marketing-Analyse auf. Neu ist hier der Blick der Zuschauer, denn sie sind die künftigen Läufer.

| Format | Wer postet | Inhalt | Textvorschlag |
|---|---|---|---|
| **Crew-Karte** (Story 9:16) | Läufer nach dem Rennen | Strecke mit allen Spots als Pins und Vornamen, darunter Netto | "Hier standen meine Leute." |
| **Mein Vorbeilauf-Moment** (Story 9:16) | Zuschauer | Spot auf der Karte, Uhrzeit des Vorbeilaufs, km | "Bei km {km} kam {Name} um {Uhrzeit} vorbei. Ich hab ihn gesehen." (Werte aus den Renndaten, keine festen Zahlen) |
| **Spot-Einladung** vor dem Rennen (Quadrat für WhatsApp-Status) | Läufer | Strecke, leere Pins, Startzeit | "Sonntag laufe ich durch Hamburg. Such dir einen Platz an der Strecke." |
| **Replay-Clip** (10 bis 15 s, 9:16) | Läufer | 3D-Flug mit Läuferfigur, Konfetti an jedem Spot | "21,1 km in 15 Sekunden. Jeder Pin ist einer von euch." |
| **Pinnwand-Collage** | Läufer | Die schönsten Nachrichten als Karte | "Das kam während des Rennens rein." |

**S:** Der Replay-Clip ist das einzige Format, das 3D zum Vorteil macht. Er braucht aber Video-Export, das ist deutlich mehr Aufwand als ein Bild. Erst die Crew-Karte bauen, sie nutzt nur vorhandene Daten.
**E:** Auf jedem geteilten Bild klein die Domain und der Satz "Deinen eigenen Tracker gibt es hier." Ohne diesen Rückweg ist das Teilen Reichweite ohne Nutzer.

## 5. Go-to-Market für die ersten 100 Läufer

**Voraussetzung (F aus ROADMAP.md):** Phase 1 ist größtenteils offen, ein zweiter Läufer ist nicht vorgesehen, "Neues Rennen in 10 Minuten" (Phase 3) fehlt, LiveTrack ist ungeprüft. **S:** Alle Tests laufen deshalb als Handbetrieb: Dima legt Rennen und Läufer selbst an. Live-Daten sind kein Testkriterium, die Schätzung reicht.

### 5.1 Hauptweg: Zuschauer werden Läufer
Jeder Tracker erreicht Freunde und Familie eines Läufers. Unter ihnen sind Läufer, die selbst Rennen haben. Der Weg zu 100 Läufern führt über diese Zuschauer, nicht über Werbung.
- Rennseite und Teilen-Bilder tragen den Rückweg "Deinen eigenen Tracker gibt es hier".
- Anfrage über ein kurzes Formular ohne Konto (Rennen, Datum, Vorname). Dima legt den Tracker in Handarbeit an.
- Startpunkt sind Dimas eigenes Umfeld und Hamburger Run-Clubs (@runnershamburg und andere Communities [33]) vor großen Frühjahrsrennen.
- **E, Schwellen als Empfehlung, nicht als Daten:** Weiter, wenn bis Ende der Frühjahrssaison 2027 mindestens 30 fremde Läufer einen Tracker genutzt haben und mindestens jeder fünfte davon über einen Zuschauer kam. Stopp oder Neuausrichtung, wenn nach drei großen Rennterminen weniger als zehn Anfragen von Fremden da sind.

### 5.2 Test A: Handbetrieb mit zehn Läufern
- **Was:** Zehn Läufer aus dem erweiterten Umfeld bekommen für ein Rennen einen Tracker, angelegt von Dima. Danach fünf Minuten Gespräch.
- **Kosten:** Zeit, kein Geld. Supabase-Freikontingent reicht laut Annahme, vorher prüfen.
- **Messen:** Zuschauer pro Tracker (Seitenaufrufe am Renntag), gesetzte Spots, Pinnwand-Nachrichten, ob der Läufer ein Bild teilt.
- **Weiter, wenn:** im Mittel mindestens fünf Zuschauer pro Tracker einen Spot setzen und mindestens sechs von zehn Läufern es beim nächsten Rennen wieder wollen.
- **Stopp, wenn:** die Mehrheit der Zuschauer keinen Spot setzt und nur die Position anschaut. Dann reicht LiveTrack oder RaceRoar und der Gruppenvorteil trägt nicht.

### 5.3 Test B: Ein Run-Club, ein Rennen
- **Was:** Ein Hamburger Club, der gemeinsam bei einem Rennen startet, bekommt eine Seite mit mehreren Läufern. Club-Mitglieder, die nicht laufen, setzen Spots.
- **Messen:** Anzahl Läufer pro Club-Seite, Posts des Clubs mit Tracker-Bild, Anfragen anderer Clubs danach.
- **Weiter, wenn:** der Club die Seite selbst in seinem Kanal teilt und ein zweiter Club innerhalb von vier Wochen fragt.
- **Stopp, wenn:** der Club nach dem Rennen nicht postet. Dann ist der Kanal Run-Club zu schwach.
- **Hinweis:** Mehrere Läufer pro Seite gibt es im Code noch nicht. Für den Test reichen mehrere Rennseiten mit einem gemeinsamen Link-Verzeichnis.

### 5.4 Datenschutz: Chance und Risiko
- **Chance (S):** Ein kurzes Datenschutzversprechen auf Deutsch ist ein Vertrauensargument für Familien. RaceRoar wirbt ähnlich ("no personal data") [16]. Nur versprechen, was gebaut und geprüft ist. Heute gilt nur "kein Konto für Zuschauer". Serverstandort und Löschfrist sind noch offen (Supabase-Projekt ist laut ROADMAP noch nicht angelegt). Textvorschlag, sobald beides steht: "Du brauchst kein Konto. Nach dem Rennen löschen wir deine Daten."
- **Risiko Haushaltsausnahme (F):** Die Ausnahme für rein private Tätigkeiten wird eng ausgelegt. Laut EuGH (Lindqvist, bestätigt 2019 im Fall Buivids) verlässt eine Veröffentlichung im Internet für unbegrenzt viele Personen den privaten Rahmen [36]. **S:** Sobald fremde Läufer den Dienst nutzen, ist Dima Verantwortlicher im Sinne der DSGVO. Impressum, Datenschutzerklärung, Löschkonzept und ein Auftragsverarbeitungsvertrag mit Supabase sind dann Pflicht.
- **Risiko Puls (F/S):** Herzfrequenz aus Wearables wird in der Literatur meist als Gesundheitsdatum nach Art. 9 eingeordnet. Eine Entscheidung der finnischen Aufsicht in der EDPB-Datenbank betrifft laut Suchauszug einen Pulsmesser-Hersteller und einen Verstoß gegen Art. 9 [37]. Das PDF selbst war nicht lesbar, Datum und Folge sind deshalb nicht geprüft. Eine Leitlinie der Behörden speziell zu Puls wurde nicht gefunden. **E:** Puls für fremde Läufer standardmäßig aus und nur nach ausdrücklicher Einwilligung zeigen. Bei Dima ist es seine eigene Entscheidung.
- **Risiko Standort (S):** Live-Position plus Name plus Startnummer auf einer öffentlichen Seite macht die Person auffindbar. **E:** Rennseiten `noindex` (deckt sich mit der Marketing-Analyse), Link nur per Teilen, Live-Position nur während des Rennens.
- **Risiko Gäste-Pinnwand (S):** Anonyme Einträge sind personenbezogen, sobald ein Name drinsteht. Moderation (Löschen durch den Läufer) und eine kurze Löschfrist nach dem Rennen einplanen.
- **Risiko Teilen-Bilder (S):** Crew-Karte und Pinnwand-Collage zeigen Vornamen und Nachrichten von Gästen. Beim Setzen eines Spots fragen, ob der Name auf geteilten Bildern erscheinen darf. Ohne Zustimmung nur Pins ohne Namen.
- **Risiko LiveTrack (S):** Das Auslesen einer inoffiziellen Garmin-Schnittstelle kann jederzeit brechen oder gegen Nutzungsbedingungen verstoßen. Für ein beworbenes Produkt nicht als Hauptquelle verkaufen.

## 6. Bewertung

| Kriterium | Ergebnis | Begründung |
|---|---|---|
| Problemgröße und Häufigkeit | mittel | Über 100.000 Marathon-Finisher allein in Deutschland [19], aber wenige Renntage je Läufer |
| Zahlungs- oder Teilungsbereitschaft | niedrig bis mittel | Kritik an 1,99 € für Tracking [3], Wettbewerber gratis [15]. Cheerlify verlangt ab dem vierten Zuschauer Geld [10]. Teilen ist wahrscheinlicher als Zahlen (S) |
| Wettbewerbsdruck | hoch | Offizielle Apps, Garmin, Strava, dazu zwei neue Startups mit Spot und ETA |
| Differenzierung | mittel | Gruppenkarte, Pinnwand und App-freie Schätzung sind echt. Spot plus ETA allein nicht mehr |
| Virale Schleife | mittel, unbewiesen | Jeder Tracker erreicht mehrere Zuschauer, wie viele davon Läufer werden, ist offen |
| Aufwand bis zum Test | mittel | Phase 1 offen, Handbetrieb nötig |
| Rechtliche Risiken | mittel | Verantwortlicher ab dem ersten Fremden, Puls als Art.-9-Frage, inoffizielle Schnittstelle |

**Gesamtbewertung: mittel.** Das gilt für den Plan "Freunde und ihr Umfeld nutzen es". Als Geschäft mit Erlösen ist es niedrig, solange RaceRoar gratis ist und Veranstalter-Apps besser werden.
**Größtes Risiko:** Zuschauer wollen nur einen Punkt auf der Karte. Dann gewinnen die kostenlosen Lösungen, und Gruppenkarte, Pinnwand und 3D bleiben Extras, für die niemand wechselt. Test A beantwortet genau diese Frage zuerst.

## Quellen (alle abgerufen am 25.11.2026)
1. RaceJoy, App Store: https://apps.apple.com/us/app/racejoy/id596132953
2. RunSignup, Webinar RaceJoy Tracking, Mai 2026: https://info.runsignup.com/wp-content/uploads/sites/3/2026/05/WebinarRaceJoyTracking1016.05.07.pdf
3. Haspa Marathon Hamburg, App Store DE (Mika timing): https://apps.apple.com/de/app/haspa-marathon-hamburg/id1370188102
4. BMW Berlin-Marathon, Race day for runners: https://www.bmw-berlin-marathon.com/en/your-race/race-day-for-runners und App Store: https://apps.apple.com/us/app/id6575377429
5. RACE RESULT Timing, Google Play: https://play.google.com/store/apps/details?id=com.tracx.raceresult
6. davengo: https://www.davengo.com
7. Strava Support, Beacon: https://support.strava.com/hc/en-us/articles/224357527-Strava-Beacon
8. Cycling Weekly, Beacon gratis (2021): https://cyclingweekly.com/products/strava-makes-beacon-feature-free-to-all-users
9. Cheerlify, Marathon tracking apps compared (25.09.2026, Eigenwerbung): https://cheerlify.com/blog/marathon-tracking-apps-compared
10. Cheerlify, Preise: https://cheerlify.com/pricing
11. Garmin Forums, LiveTrack: https://forums.garmin.com/sports-fitness/running-multisport/f/forerunner-965/380733/livetrack-messages-are-not-appearing-until-much-later und https://forums.garmin.com/sports-fitness/running-multisport/f/forerunner-945-lte/344730/spectator-messaging-no-send-message
12. Notebookcheck, LiveTrack Beta: https://www.notebookcheck.net/Multiple-Garmin-smartwatches-get-new-LiveTrack-feature-in-beta-update.1275474.0.html
13. Apple, Apple Watch Benutzerhandbuch, Personen finden: https://support.apple.com/guide/watch/apd1132106dc
14. TechRadar, Smart ways to track your friends at the London Marathon 2018 (**ALT**): https://techradar.com/news/smart-ways-to-track-your-friends-at-the-london-marathon-2018
15. RaceRoar, App Store: https://apps.apple.com/app/id6760315978 und https://raceroar.app
16. Lostium Innovation Studio: https://lostium.com/en/
17. Livio: https://liviolive.com/
18. Racemap, Preise: https://go.racemap.com/pricing
19. HDsports, Marathon-Rekordwelle 2026 (30.10.2026): https://www.hdsports.org/marathon/marathon-rekordwelle-2026-so-viele-finisher-gab-es-in-deutschland-noch-nie
20. Runner's World, Berlin-Marathon 2026: https://www.runnersworld.de/news-fotos/berlin-marathon-2026/
21. hella hamburg halbmarathon, ausverkauft (28.04.2026): https://www.hamburg-halbmarathon.com/2026/04/28/24000-of-24000-entries-sold-out/ und Verschiebung: https://www.hamburg-magazin.de/artikel/hella-hamburg-halbmarathon
22. Festivals in Deutschland, Berlin-Marathon 2025 (unzuverlässig): https://www.festivalsindeutschland.de/festival/bmw-berlin-marathon/2025
23. Strava, Year in Sport 2025 (02.12.2025): https://www.endurancesportswire.com/strava-releases-12th-annual-year-in-sport-trend-report-revealing-that-doomscrolling-is-out-movement-is-in/
24. Athletech News, Year in Sport 2025: https://athletechnews.com/running-walking-strength-training-strava-year-in-sport-report/
25. Bike Magazin, Strava-Jahresbericht 2025: https://www.bike-magazin.de/en/magazine/backgrounds/strava-s-2025-annual-report-specialized-is-the-number-1-biker/
26. Hessenschau, Social Run Clubs (10.11.2025): https://www.hessenschau.de/panorama/instagram-hype-social-run-club-viel-mehr-als-der-lauf-treff-von-frueher-v1,running-clubs-hessen-100.html
27. SportsShoes, Running Report 2026: https://www.sportsshoes.com/de-de/advice/running-hub/health-wellbeing/running-report
28. the5krunner, Strava kauft Runna (17.04.2025): https://the5krunner.com/2025/04/17/strava-acquires-runna-training-app/
29. Marathon Handbook, Strava und Abo-Modelle: https://marathonhandbook.com/strava-acquires-the-breakaway-to-deepen-its-subscription-based-fitness-ecosystem/
30. BikeRadar, Strava Sticker Stats (09.04.2025): https://www.bikeradar.com/news/strava-sticker-stats-spring-2025-updates
31. Strava Support, Flyover: https://support.strava.com/hc/de/articles/19900004650125-Flyover
32. Upworthy, "John"-Schild (07.11.2024): https://scoop.upworthy.com/man-cheered-for-every-participant-named-john-at-a-marathon-and-the-johns-totally-lapped-it-up
33. Runner's World, Insta-Accounts für Läufer (30.07.2025): https://www.runnersworld.de/lauftraining/die-besten-insta-accounts-fuer-laeufer-tipps-und-motivation-fuer-dein-training/
34. Modash, German Running Influencers (11.11.2026): https://www.modash.io/find-influencers/germany/running
35. Time Out New York, Schilder NYC-Marathon 2025: https://www.timeout.com/newyork/news/here-are-some-of-the-most-hilarious-and-downright-best-signs-from-the-2025-nyc-marathon-110325
36. Dr. Datenschutz, Die Haushaltsausnahme der DSGVO (08.10.2020, **ALT**, Rechtslage unverändert zitiert): https://www.dr-datenschutz.de/die-haushaltsausnahme-der-dsgvo/
37. EDPB, Zusammenfassung einer Entscheidung der finnischen Aufsicht (PDF nicht lesbar, Inhalt nur aus Suchauszug): https://www.edpb.europa.eu/system/files/2024-03/fi-2022-12-summarypublic.pdf
41. hamburg magazin, Neuer Termin für den hella hamburg halbmarathon 2026: https://www.hamburg-magazin.de/artikel/hella-hamburg-halbmarathon
42. CheerMyRun, Google Play (nicht lesbar): https://play.google.com/store/apps/details?id=com.app.cheer_my_run&hl=en_US
38. NBC Chicago, Chicago Marathon 2025 tracken: https://www.nbcchicago.com/news/sports/chicago-marathon/track-a-runner-in-the-2025-chicago-marathon-heres-how-to-do-it/3835066/
39. Race Roster, Live Predictive Tracking: https://raceroster.com/go/live-predictive-tracking
40. Slid: Strava Video & Stats, App Store: https://apps.apple.com/app/id1484705784
