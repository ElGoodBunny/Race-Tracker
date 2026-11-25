# 025 Cheering Spots aus Supabase
Besitzer: claude
Status: in Arbeit
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

## Review
