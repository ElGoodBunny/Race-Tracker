# 032 Einstellungen und Split-Eingabe
Besitzer: claude
Status: review
Branch: claude/032-einstellungen
Roadmap: Phase 1, Einstellungen (nur Dima) und Zwischenzeiten-Tabelle und Split-Eingabe

## Worum es geht
Die Datenbank kann alles schon: `races` schreiben (nur Admin), `set_race_times` und `set_official_split` (Admin und Crew), `set_livetrack_link` und `livetrack_link_status` (nur Admin). Es fehlt die Oberfläche. Im Legacy ist das die Karte "Einstellungen fürs Rennen (nur für dich)" am Seitenende (`#ownerCard`) plus das Split-Formular.

Entscheidungen von Dima (25.11.):
- Anmeldung per Magic Link über einen kleinen Link "Anmelden" im Footer, der Bereich liegt am Seitenende
- Crew sieht Split-Eingabe, Start/Ziel und die Liste der Splits. Renneinstellungen und LiveTrack-Link nur Admin
- Liste der eingetragenen Splits mit Löschen gehört dazu

Annahmen:
- `signInWithOtp` mit `shouldCreateUser: false`, damit niemand über das Formular Konten anlegt. Die Rückmeldung ist für jede Adresse gleich ("Wenn die Adresse freigeschaltet ist, kommt gleich eine Mail."), damit man nicht abfragen kann, welche Adressen es gibt
- Rollen holt der Client über `is_admin()` und `is_crew(slug)`. Das steuert nur, was angezeigt wird, Schutz kommt aus RLS und den Funktionen
- Ein Update auf `races`, das RLS wegfiltert, meldet keinen Fehler, sondern 0 Zeilen. Das gilt als "keine Rechte"
- `set_race_times` setzt immer beide Werte. Die Knöpfe sind gesperrt, bis die Rennzeile geladen ist, sonst würde "Im Ziel" den Start löschen
- Split-Punkte sind die Zeilen der Tabelle (`splitPoints`), kein freies km-Feld, sonst passt der Split nicht zur Zeile (Toleranz 0,06 km). Der km wird auf 3 Stellen abgerundet: Die Spalte ist `numeric(6,3)`, 21,0975 würde auf 21,098 gerundet und hinter dem Ziel liegen
- Startzeit im Formular in der Zeitzone des Rennens, nicht fest Hamburg. Zielzeit im Bereich der Datenbank (0:10:00 bis 10:00:00), nicht 1 bis 4 Stunden wie im Legacy
- Der LiveTrack-Link wird nie angezeigt, nur "hinterlegt seit …". Das Feld ist nach dem Speichern leer. Entfernen gibt es nicht, die Datenbank hat dafür keine Funktion

## Auftrag
1. `src/lib/live/admin.ts` mit Tests: Formularprüfung, Zeitzone, Split-km, Rollen, Speichern, Magic Link
2. `Settings.astro` und `settings.ts`: Bereich `#einstellungen` am Seitenende, Anmelden, Einstellungen, Start/Ziel/Zurücksetzen, Split-Eingabe, Split-Liste, Abmelden
3. Footer-Link "Anmelden" auf der Rennseite
4. Startnummer im Hero aus der Datenbank, wenn gesetzt

## Erlaubte Dateien
- `src/lib/live/admin.ts` (neu), `tests/admin.test.ts` (neu), `src/components/Settings.astro` (neu), `src/components/settings.ts` (neu)
- `src/components/hero.ts`, `src/pages/[race].astro`, `src/layouts/Base.astro` (Slot im Footer)
- diese Datei, `AGENTS.md` (Paketliste), `docs/ROADMAP.md` (Checkboxen)

## Prüfpunkt
- `npm run check`, `npm test` grün
- Sichtprüfung hell und dunkel, Desktop und Handy: abgemeldet, als Admin, als Crew (gegen einen nachgebauten Client, ein echter Login als Dima geht von hier nicht)
- Dimas Test am echten Projekt, siehe Ergebnis

## Nicht Teil des Pakets
Startzeit im Hero-Untertitel und Startnummer/Block im HUD aus der Datenbank, Crew eintragen (SQL Editor), Link entfernen.

## Rückfragen

## Ergebnis
Umgesetzt:
- `src/lib/live/admin.ts` mit 23 Tests (erst rot "Cannot find module", dann grün): Formularprüfung, Zeitzone des Rennens, Split-km, Rollen, Speichern mit 0 Zeilen als "nur Leserechte", Start/Ziel, Splits, LiveTrack-Link und Status, Magic Link
- `Settings.astro` und `settings.ts`: Bereich `#einstellungen`, versteckt bis zum Footer-Link "Anmelden" oder einer bestehenden Anmeldung. Abgemeldet: E-Mail-Feld mit Turnstile. Admin oder Crew: Start, Ziel, Zurücksetzen (fragt zweimal), Split-Eingabe mit Punktauswahl, Liste mit Löschen. Nur Admin: Name, Startnummer, Startblock, geplanter Start, Zielzeit, LiveTrack-Link mit Status
- Footer-Slot in `Base.astro`, Startnummer im Hero aus der Datenbank, `loadTurnstile` aus `guest-prompt.ts` exportiert

Abweichungen vom Auftrag und vom Legacy:
- Turnstile auch bei der Anmeldung: Supabase verlangt das Token bei jeder Anmeldung, nicht nur bei der anonymen. Deshalb `guest-prompt.ts` zusätzlich angefasst (nur `export`)
- Zielzeit 0:10:00 bis 10:00:00 statt 1 bis 4 Stunden, Startzeit in der Zeitzone des Rennens statt fest Hamburg
- Nach dem Abmelden lädt die Seite neu, weil Pinnwand und Spots die angemeldete Person halten

Geprüft:
- `npm run check` 0 Fehler, `npm test` 400 grün, `npm run build` ok
- Sichtprüfung lokal auf `/barcelona-2027`: abgemeldet hell Desktop (Formular, Fehler "Bestätig kurz unten, dass du kein Bot bist." ohne Token). Angemeldet als Admin hell Desktop und dunkel 375 px, Bereiche dafür per JS eingeblendet, weil ein echter Login von hier nicht geht. Gefunden und behoben: Footer-Link klebte am Text, "Abmelden" auf dem Handy volle Breite, leerer Hinweis verschob den Speichern-Knopf
- Nicht geprüft: Crew-Ansicht einzeln (gleicher Code mit ausgeblendetem Einstellungsblock), echter Login, echte Schreibzugriffe

Für Dima am echten Projekt:
1. Supabase, Authentication, URL Configuration: Site URL und Redirect URLs um die Rennseiten ergänzen (`http://localhost:4321/**` und die workers.dev-Adresse mit `/**`)
2. Auf `/barcelona-2027` unten "Anmelden", eigene Adresse, Link aus der Mail öffnen. Erwartet: "Angemeldet als …, Admin."
3. Einmal speichern (zum Beispiel Startnummer), einen Split bei 5 km eintragen und wieder löschen, LiveTrack-Link setzen. Erwartet: Startnummer im Hero, Split in der Tabelle als "offiziell", Status "Link hinterlegt seit …"
4. Start/Ziel nicht am echten Barcelona-Rennen testen, oder danach zurücksetzen

## Review
