# 019 Fehlertexte
Besitzer: claude
Status: review
Branch: claude/019-fehlertexte
Roadmap: Phase 1, Fehlertexte aus dem Legacy übernehmen (Rate Limit, keine Rechte, offline)

## Worum es geht
Schreiben kann an Rate Limit, fehlenden Rechten, fehlendem Netz und an den Prüfungen aus der Phase-1-Migration scheitern. Die Seite braucht dafür einen Text, ohne Supabase-Projekt testbar.

## Auftrag
`errorText(error)` übersetzt einen Fehler von supabase-js in einen Text. Rate Limit, Leserechte und der allgemeine Text wörtlich aus dem Legacy, der Rest passend zu den Exceptions in `supabase/migrations`.

## Erlaubte Dateien
- `src/lib/live/errors.ts`, `tests/errors.test.ts` (neu)
- `docs/tasks/019-claude-fehlertexte.md`, `AGENTS.md` (Paketliste), `docs/ROADMAP.md`

## Prüfpunkt
Tests zuerst, `npm run check` und `npm test` grün.

## Nicht Teil des Pakets
Anzeige am Feld oder als Meldung, das kommt mit dem Schreiben.

## Rückfragen

## Ergebnis
Erledigt: `src/lib/live/errors.ts`. Zuordnung über Postgres-Code und Nachricht der Exception.
- Wörtlich aus dem Legacy: "Zu viele Aktionen auf einmal. Kurz warten.", "Du hast hier nur Leserechte.", "Speichern hat nicht geklappt. Bitte nochmal versuchen."
- Neu, weil Firebase sie nicht kannte: offline, Name fehlt, mehr als 3 Spots, km hinter dem Ziel, LiveTrack-Link nicht erlaubt
- Offline heißt: `navigator.onLine` ist falsch, `fetch` scheitert (TypeError) oder die Meldung von Chrome, Safari oder Firefox für ein gescheitertes `fetch` kommt durch
- Der Text "Speicher ist voll" aus dem Legacy entfällt, den gab es nur bei Firebase

Geprüft: `tests/errors.test.ts` zuerst, rot ohne Modul. 6 Tests, darunter kein Ausrufezeichen und kein Gedankenstrich in allen Texten. `npm run check` 0 Fehler, `npm test` 295 Tests grün.

Offen: Die Codes und Meldungen sind aus den Migrationen und den RLS-Tests abgeleitet, nicht gegen die echte PostgREST-Antwort geprüft. Beim ersten Test gegen das Projekt einmal Rate Limit und Leserechte auslösen.

## Review
