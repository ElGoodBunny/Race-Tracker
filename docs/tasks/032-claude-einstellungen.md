# 032 Einstellungen und Split-Eingabe
Besitzer: claude
Status: in Arbeit
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

## Review
