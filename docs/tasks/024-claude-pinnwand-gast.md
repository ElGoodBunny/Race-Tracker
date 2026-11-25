# 024 Pinnwand mit Gast-Anmeldung
Besitzer: claude
Status: review
Branch: claude/024-gast-onboarding
Roadmap: Phase 1, Gast-Onboarding und Pinnwand

## Worum es geht
Datenschicht (018) und Fehlertexte (019) stehen, aber nichts auf der Rennseite nutzt Supabase. Das Onboarding allein hätte keinen Auslöser. Deshalb ein durchgehendes Stück: Pinnwand lesen, beim ersten Schreiben Namen setzen und anonym anmelden, Nachricht senden.

Annahme: Die Pinnwand ist der kleinste Schreibfall und kommt deshalb zuerst. Spots und der "Gesehen"-Button bauen auf demselben Onboarding auf und kommen im nächsten Paket.

## Auftrag
1. `src/lib/live/guest.ts`: Name und Text prüfen wie die Checks in der Datenbank, Gast aus der Sitzung laden (ohne Anmeldung), anonym anmelden mit CAPTCHA-Token und Profil speichern, Nachricht senden und löschen, Pinnwand aus Nachrichten und Sichtungen
2. `Pinboard.astro` und `pinboard.ts` auf der Rennseite, Markup und Look aus dem Legacy, alles von Nutzern über `textContent`
3. Turnstile als CAPTCHA, Skript lädt erst beim ersten Schreiben (`docs/decisions/2026-11-25-turnstile.md`)

## Erlaubte Dateien
- `src/lib/live/guest.ts`, `src/components/Pinboard.astro`, `src/components/pinboard.ts` (neu), `src/pages/[race].astro`
- `src/lib/live/errors.ts`, `tests/errors.test.ts`, `tests/guest.test.ts` (neu)
- `.env.example`, `docs/decisions/2026-11-25-turnstile.md` (neu), diese Datei, `AGENTS.md` (Paketliste)

## Prüfpunkt
- Tests zuerst: kein Login beim Lesen, Anmeldung erst beim ersten Schreiben, bestehende Sitzung ohne Profil fragt nur den Namen ab, Name 1 bis 30 Zeichen getrimmt, Fehler als bekannte Texte
- `npm run check`, `npm test` grün
- Sichtprüfung hell und dunkel, Desktop und Handy
- Gegen das echte Projekt: Name setzen, senden, löschen. Testzeilen und anonymes Konto danach entfernen

## Nicht Teil des Pakets
Spots, "Gesehen"-Button, Löschen durch Dima als Admin (die Policy erlaubt es, die Oberfläche zeigt das X nur bei eigenen Nachrichten), Limit für anonyme Anmeldungen pro IP.

## Rückfragen
- Dima: Anonymous Sign-in im Supabase-Projekt einschalten (Stand 25.11. aus)
- Dima: Turnstile-Secret im Supabase-Dashboard eintragen (Authentication, Attack Protection, CAPTCHA, Anbieter Turnstile). Den Secret Key gibt es im Cloudflare-Dashboard unter Turnstile, Widget `race-tracker`

## Ergebnis
Umgesetzt:
- Lesen ohne Konto. Beim ersten Senden (Feld oder Schnellnachricht) erscheint unter dem Feld die Namensabfrage mit Turnstile. Nach dem Speichern geht die gemerkte Nachricht raus
- Wer schon eine Sitzung hat, aber nie einen Namen gespeichert hat, wird nur nach dem Namen gefragt, ohne zweites Konto und ohne CAPTCHA
- Eigene Nachrichten zeigen "Du" und ein X zum Löschen. Sichtungen aus `checkpoints` stehen als "Gesehen bei km …" mit in der Liste
- Neue Fehlertexte: CAPTCHA abgelehnt, anonyme Anmeldung abgeschaltet
- Turnstile-Widget `race-tracker` (managed, Hosts `dmitrij-helmer.workers.dev` mit Subdomains und `localhost`). Site Key als `PUBLIC_TURNSTILE_SITE_KEY` in `.env` und als Build-Variable am Worker

Abweichungen vom Legacy:
- Leertext ohne "für Sonntag", weil nicht jedes Rennen sonntags ist
- Keine Avatare, das Schema hat keine
- Das Turnstile-Kästchen spricht in der Sie-Form, den Text bestimmt Cloudflare

Geprüft:
- `tests/guest.test.ts` zuerst geschrieben, rot ohne Modul. 14 Tests grün, dazu 1 neuer Fall in `tests/errors.test.ts`
- `npm run check` 0 Fehler, `npm test` grün
- Sichtprüfung lokal: dunkel Desktop (Barcelona, Hamburg), hell Handy (Barcelona). Namensabfrage, Fehler am Feld, Turnstile sichtbar
- Offen: Ende-zu-Ende gegen das echte Projekt, weil die anonyme Anmeldung dort noch aus ist. Das Turnstile-Kästchen muss ein Mensch anklicken
