# 025 Cheering Spots aus Supabase
Besitzer: claude
Status: review
Branch: claude/025-cheering-spots
Roadmap: Phase 1, Cheering Spots mit ETA, eigener Spot hervorgehoben

## Worum es geht
Die Pinnwand (024) liest und schreibt schon über Supabase, die Spots nicht. Auf der Rennseite fehlt der Abschnitt "An der Strecke", und die 3D-Ansicht bekommt dort eine leere Spot-Liste. Dieses Paket holt die Spots aus Supabase, lässt Gäste eigene setzen und löschen und gibt sie live an die 3D-Ansicht weiter.

Annahmen:
- Eine Realtime-Verbindung pro Seite reicht für Pinnwand, Spots und 3D. Sonst abonniert jede Komponente denselben Kanal
- Die Gast-Anmeldung aus 024 (Name plus Turnstile) gilt seitenweit: wer sich an der Pinnwand anmeldet, ist auch bei den Spots angemeldet
- ETA kommt aus `estimate()` (1:1 aus dem Legacy). Ohne Startzeit oder Zielzeit in der Datenbank gilt der Wert aus `src/content/races/`, keine erfundene Zielzeit

## Auftrag
1. `src/lib/live/page.ts`: `watchRace(client, slug, cb)` als gemeinsame Verbindung um `subscribeRace`, später Hinzukommende bekommen sofort den letzten Stand. Dazu der Gast der Seite (laden, setzen, beobachten)
2. Namensabfrage mit Turnstile aus `pinboard.ts` in eine wiederverwendbare Komponente ziehen, Pinnwand und Spots nutzen sie
3. `src/lib/live/spots.ts` mit Tests zuerst: Name 1 bis 40 Zeichen getrimmt, km auf 0,1 gerundet und innerhalb der Renndistanz, anlegen und löschen, ETA, eigene Spots erkennen
4. Abschnitt "An der Strecke" auf der Rennseite: Liste mit km, Landmark, ETA, Autor, eigener Spot hervorgehoben und mit X löschbar, Formular mit Name und km-Regler
5. Spots live in die 3D-Ansicht, "Als Nächstes" ein- und ausblenden

## Erlaubte Dateien
- `src/lib/live/page.ts` (neu), `src/lib/live/spots.ts` (neu), `tests/spots.test.ts` (neu), `tests/page.test.ts` (neu)
- `src/components/pinboard.ts`, `src/components/Pinboard.astro`, `src/components/guest-prompt.ts` (neu), `src/components/GuestPrompt.astro` (neu)
- `src/components/spots.ts` (neu), `src/components/Spots.astro` (neu), `src/components/live-stage.ts`, `src/components/LiveStage.astro`
- `src/pages/[race].astro`, `src/styles/global.css`
- `src/lib/live/supabase.ts`, `tests/live-supabase.test.ts` (nachgetragen: Realtime filtert DELETE nicht, siehe Ergebnis)
- diese Datei, `AGENTS.md` (Paketliste), `docs/ROADMAP.md` (Checkbox)

## Prüfpunkt
- Tests zuerst, rot ohne Modul
- `npm run check`, `npm test` grün
- Sichtprüfung hell und dunkel, Desktop und Handy. `/dev/live` mit den Demo-Spots unverändert
- Gegen das echte Projekt mit zwei Tabs: Spot anlegen und löschen, beide Tabs übernehmen es ohne Neuladen, in der Liste und als Pin in 3D. Testzeilen und anonymes Konto danach nur nach Dimas Ja löschen

## Nicht Teil des Pakets
Spot ändern (Legacy hatte "Spot ändern"), Spot per Tipp auf die Karte setzen, "Gesehen"-Button, Löschen durch Dima als Admin in der Oberfläche, Schritte und Simulation aus dem Legacy-Abschnitt.

## Rückfragen

## Ergebnis
Umgesetzt:
- `watchRace` öffnet einen Kanal pro Rennen und Seite, später Hinzukommende (die 3D-Ansicht lädt erst beim Scrollen) bekommen sofort den letzten Stand. `guestStore` hält den Gast der Seite: wer sich an der Pinnwand anmeldet, ist auch bei den Spots angemeldet und umgekehrt
- `GuestPrompt.astro` und `guest-prompt.ts`: Namensabfrage mit Turnstile, von Pinnwand und Spots genutzt. Gemeinsame Stile unter `.live-sec` in `global.css`, nicht global, weil LiveStage und Startseite `.card` mit eigenem Look nutzen
- Abschnitt "An der Strecke": "Dein Platz an der Strecke" mit der Ankunft am nächsten eigenen Spot und dem Formular, daneben die Liste mit Farbe wie der Pin in 3D, km, Landmark, Autor, Ankunft. Eigene Spots hervorgehoben, mit X löschbar
- ETA aus `estimate()` mit Rennzeile und Checkpoints aus Supabase. Fehlen Start oder Zielzeit in der Datenbank, gilt die Rennen-JSON
- 3D-Ansicht auf der Rennseite nimmt die Spots aus derselben Verbindung, "Als Nächstes" erscheint, sobald es Spots gibt. `/dev/live` behält die Demo-Spots
- Fund beim Bauen: Realtime kann DELETE nicht filtern (Supabase-Doku, "Delete events are not filterable"). Mit dem Filter auf `race_slug` kamen Löschungen nie an, auch nicht an der Pinnwand. Jetzt hört der Kanal zusätzlich ungefiltert auf DELETE, `applyChange` ignoriert fremde ids

Abweichungen vom Legacy:
- Bis zu 3 eigene Spots (Datenbank-Limit) statt einem, kein "Spot ändern", kein Setzen per Tipp auf die Karte
- Ohne "am Sonntag", ohne Schritte und Simulation, ohne Hinweis auf die Karte
- Im km-Label nur die Zahl in Geist Mono, die Landmark in Geist

Geprüft:
- `tests/page.test.ts` und `tests/spots.test.ts` zuerst, rot ohne Modul, dann 25 Tests grün. Neuer Fall in `tests/live-supabase.test.ts` für DELETE, erst rot, dann grün
- `npm run check` 0 Fehler, `npm test` 339 grün
- Sichtprüfung lokal: dunkel Desktop (Barcelona) mit Fehler am Feld und Namensabfrage, hell Handy (Hamburg) mit Spots und Pinnwand. HUD-Karten der 3D-Ansicht unverändert (Padding 12/16). `/dev/live` zeigt "Als Nächstes" mit den Demo-Spots
- Gegen das echte Projekt (25.11., Dima in Chrome, zweiter Tab im Browser-Bereich der App): Namensabfrage über die neue Komponente legt ein anonymes Konto an, zwei Nachrichten gesendet und über das X gelöscht, sie verschwinden in beiden Tabs ohne Neuladen (damit ist auch der offene Punkt aus 024 erledigt). Zwei Spots angelegt, Liste mit "dein Spot", ETA "nach Plan", Farben wie die Pins. In 3D Labels und "Als Nächstes" mit beiden Spots. Spot "Tim" gelöscht: nach 153 s ohne Neuladen aus Liste, 3D-Labels und "Als Nächstes" verschwunden

## Review
