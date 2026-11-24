# 021 Funktionsrechte
Besitzer: claude
Status: review
Branch: claude/021-funktionsrechte
Roadmap: Phase 1, Supabase-Projekt (Sicherheit)

## Worum es geht
Der Security-Advisor von Supabase meldete am 24.11. elf `SECURITY DEFINER`-Funktionen, die ohne Login aufrufbar sind. Ursache: Supabase gibt jeder neuen Funktion in `public` direkt `EXECUTE` an `anon` und `authenticated`. Unsere Migrationen nahmen das Recht nur `public` weg. Die RLS-Tests merkten es nicht, weil PGlite diese Standardrechte nicht kennt.

Nicht ausnutzbar: Die RPCs prüfen Admin oder Crew selbst, Trigger-Funktionen lassen sich nicht direkt aufrufen. Es entsprach aber nicht der Absicht der Migrationen. Dima hat freigegeben, es so zu lösen, wie es richtig und sicher ist.

## Auftrag
1. Test, der die Standardrechte von Supabase nachstellt und den Befund rot zeigt
2. Migration: RPCs und Helfer nur für Angemeldete, Trigger-Funktionen für niemanden, künftige Funktionen standardmäßig nicht für `anon`
3. Über den Connector einspielen, im Projekt nachprüfen

## Erlaubte Dateien
- `supabase/migrations/20261124000000_function_privileges.sql` (neu), `tests/rls.test.ts`
- `docs/tasks/021-claude-funktionsrechte.md`, `AGENTS.md` (Paketliste)

## Prüfpunkt
Neue Tests rot ohne Migration, grün mit. Alle übrigen RLS-Tests grün (Trigger laufen weiter). Im Projekt: `has_function_privilege` wie im Test, Lesen ohne Login geht, RPC ohne Login abgelehnt.

## Nicht Teil des Pakets
`rls_auto_enable()` gehört Supabase (Häkchen "Enable RLS on new tables automatically"), bleibt unverändert. Schutz vor geleakten Passwörtern: irrelevant, Anmeldung läuft über Magic Link und anonym.

## Rückfragen

## Ergebnis
Erledigt:
- `tests/rls.test.ts`: Setup gibt wie Supabase `execute on functions` per Standardrecht an `anon` und `authenticated`. Drei neue Tests: ohne Login keine Funktion, angemeldet RPCs und Helfer aber keine Trigger-Funktion, Trigger laufen trotzdem (Autor wird gesetzt)
- Migration `20261124000000_function_privileges.sql`: `revoke` für `anon` bei den vier RPCs und `is_admin`, `is_crew`. `revoke` für alle bei den sechs Trigger-Funktionen. `alter default privileges … revoke execute on functions from anon`
- Keine Policy für `anon` ruft `is_admin` oder `is_crew` auf, geprüft per `grep` über die Migrationen

Geprüft:
- Vor der Migration 2 Tests rot (genau der Befund), danach `npm test` 298 grün, `npm run check` 0 Fehler
- Per Connector eingespielt (`apply_migration`, Erfolg). Im Projekt: `anon` darf keine der 12 eigenen Funktionen, `authenticated` darf die vier RPCs und die zwei Helfer, keine Trigger-Funktion
- Über die API ohne Login: `races` lesen 200, `rpc/livetrack_link_status` → `42501 permission denied for function`, `rpc/set_author` nicht auffindbar, Insert in `spots` scheitert weiter mit `profile required` (Trigger läuft)

Offen: Advisor nach der Migration nicht neu abgerufen (ein Hook blockiert den zweiten Abruf). Das Ergebnis ist über `has_function_privilege` direkt geprüft.

## Review
