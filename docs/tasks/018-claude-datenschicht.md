# 018 Datenschicht Supabase
Besitzer: claude
Status: review
Branch: claude/018-datenschicht
Roadmap: Phase 1, Datenschicht `src/lib/live/supabase.ts`

## Worum es geht
Die Rennseite braucht Rennen, Spots, Pinnwand und Checkpoints aus Supabase, live per Realtime. Ein Supabase-Projekt gibt es noch nicht (keine `.env`, lokal weder Docker noch Supabase-CLI). Die Schicht wird deshalb gegen einen nachgebauten Client getestet und erst angeschlossen, wenn Dimas Projekt steht.

## Auftrag
1. `subscribeRace(client, slug, onState)`: lädt Rennzeile, Spots, die letzten 120 Nachrichten (wie Legacy) und Checkpoints, abonniert Änderungen dieser Tabellen nur für das eine Rennen
2. Änderungen landen über eine reine Funktion im Zustand: Einfügen, Ändern, Löschen, keine Doppelten (Realtime kann ein Insert liefern, das schon geladen ist), feste Sortierung
3. Nach einem Verbindungsabbruch wird beim erneuten Abonnieren alles neu geladen, damit nichts fehlt
4. Ausdrücklich ausgewählte Spalten, kein `select *`
5. Schreiben bleibt dünn und kommt mit dem Onboarding (Paket danach)

## Erlaubte Dateien
- `src/lib/live/supabase.ts` (neu), `tests/live-supabase.test.ts` (neu)
- `docs/tasks/018-claude-datenschicht.md`, `AGENTS.md` (Paketliste)

## Prüfpunkt
- Tests zuerst: Laden, Insert, Update, Delete, doppeltes Insert, fremdes Rennen wird ignoriert, Neuladen nach Abbruch, Nachrichten auf 120 begrenzt
- `npm run check`, `npm test` grün

## Nicht Teil des Pakets
Anschluss an die Rennseite, Onboarding, Schreiben, Fehlertexte. Prüfung gegen ein echtes Projekt (sobald `.env` da ist).

## Rückfragen

## Ergebnis
Erledigt: `src/lib/live/supabase.ts` mit `subscribeRace`, `applyChange`, `emptyState`, `MESSAGE_LIMIT` (120) und den Zeilentypen.
- Ein Kanal `race:<slug>` mit vier Abos (`races` gefiltert auf `slug`, die anderen auf `race_slug`). Geladen wird erst bei `SUBSCRIBED` und bei jedem erneuten `SUBSCRIBED`. Änderungen während des Ladens werden gesammelt und danach angewendet
- `CHANNEL_ERROR`, `TIMED_OUT`, `CLOSED` und Ladefehler setzen `status: "offline"`, die letzten Daten bleiben
- Löschen geht nur über die id: Realtime filtert DELETE nicht nach Spalten und schickt ohne `replica identity full` nur den Schlüssel. Fremde ids sind im Zustand nicht vorhanden, das Löschen läuft ins Leere
- `numeric` wird zur Zahl, falls es als Text kommt. Spalten stehen ausdrücklich in `COLUMNS`

Geprüft:
- `tests/live-supabase.test.ts` zuerst geschrieben, rot ohne Modul. 12 Tests: Einfügen mit Sortierung, kein Doppel, Ändern, Löschen nur mit id, fremdes Rennen, numeric als Text, 120 Nachrichten, Rennzeile, Laden erst nach dem Abonnieren mit Spalten und Filtern, Änderung während des Ladens, Neuladen nach Abbruch, Ladefehler, Abbestellen
- Gegenprobe: ohne das Nachziehen der gesammelten Änderungen 1 Test rot, ohne Doppelschutz 2 Tests rot
- `npm run check` 0 Fehler, `npm test` 289 Tests grün

Offen:
- Nicht gegen ein echtes Supabase-Projekt geprüft. Sobald `.env` da ist: Laden, Realtime für alle vier Tabellen und das Verhalten nach Funkloch einmal echt durchspielen
- Realtime braucht die Tabellen in der Publikation `supabase_realtime`. Steht in den Migrationen für `races`, `spots`, `messages`, `checkpoints`


## Review
