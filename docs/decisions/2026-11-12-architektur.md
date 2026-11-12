# Checkpoint A: Architektur und Datenmodell (12.11.2026)

Fable-Checkpoint aus `docs/ADVISOR.md`. Gelesen: `CLAUDE.md`, `docs/ARCHITECTURE.md`, `docs/VISION.md`, beide Migrationen in `supabase/migrations/`, `src/content.config.ts`, `src/lib/estimate.ts`, `src/lib/replay.ts`, `tests/rls.test.ts` und die Schreibpfade im Legacy.

Stand: Nur Empfehlungen. Am Code und am Schema ist nichts geändert. Der Abschnitt "Übernommen" am Ende wird gefüllt, wenn die Punkte umgesetzt sind.

Was nicht geprüft ist: Angaben zu Supabase-Limits und zur Garmin-Schnittstelle stammen aus meinem Wissen, nicht aus einem Test. Sie sind im Text mit "prüfen" markiert.

## Kurzfassung
1. Die Trennung trägt. Drei Regeln ergänzen: Phase zur Laufzeit aus Supabase ableiten, Telemetrie nach dem Rennen als Replay ins Repo archivieren, Slug-Abgleich automatisch prüfen.
2. Anonymous Sign-in bleibt, aber erst beim ersten Schreiben. Lesen bleibt ohne Login.
3. Ein Channel pro Rennen mit Filter auf `race_slug`. Wichtiger als die Channel-Frage: nach jedem Verbinden den Stand neu laden.
4. Sieben Lücken im Schema, die vor Phase 1 in eine Migration gehören. Die wichtigste: Namen der Autoren stehen nicht in den Zeilen, und beim Aufräumen anonymer Konten würde die Pinnwand alter Rennen gelöscht.
5. Poller als Supabase Edge Function mit Cron, derselbe Code läuft als Ausweichlösung auf dem Mac. Robustheit kommt vom Client: Er verlässt sich nur auf das Alter des letzten Messpunkts.

## 1. Trägt "statische Strecke im Repo, Live-Zustand in Supabase"?

**Empfehlung: Ja, beibehalten.** Mit drei Ergänzungen.

**Begründung**
- Die Strecke ändert sich am Renntag nicht, sie wird per Zod geprüft und vorgerendert. Fällt Supabase aus, bleibt die Seite lesbar. Das ist der größte Vorteil und er gilt für jedes weitere Rennen genauso.
- Spots speichern `km`, keine Koordinaten. Sie hängen damit an der Strecke und nicht an einer Kartenprojektion. Das ist richtig so.
- Mehrere Rennen kosten nichts: eine JSON-Datei plus eine Zeile in `races`, alle Live-Tabellen hängen über `race_slug` daran.

**Ergänzungen**
- **Phase zur Laufzeit ableiten.** `status` im JSON (`upcoming`, `live`, `finished`) wird beim Build festgelegt. Am Renntag will niemand neu bauen. Die Phase folgt aus `actual_start` und `finished_at` in Supabase, `status` im JSON ist nur der Rückfall ohne Backend und die Sortierung der Startseite.
- **Telemetrie wird nach dem Rennen statisch.** Während des Rennens liegt sie in `telemetry`. Danach erzeugt ein Skript daraus `public/data/<slug>/replay.json` (gleiches Format wie heute aus Strava), die Zeilen werden gelöscht. So wächst die Datenbank nicht und die Ergebnisseite braucht kein Backend. Menge pro Rennen: bei einem Punkt alle 5 s und 2 Stunden rund 1440 Zeilen, das ist unkritisch.
- **Slug-Abgleich prüfen.** Heute muss jemand von Hand eine Zeile in `races` mit demselben Slug anlegen. `npm run new-race` (Phase 3) soll das SQL dafür mit ausgeben. Bis dahin: Der Client zeigt für Dima einen klaren Hinweis, wenn zur Seite keine Zeile existiert.

**Doppelte Felder klären.** `bib`, `block`, `plannedStart` und `targetSec` stehen im JSON und in `races`. Regel: JSON ist der Vorgabewert, ein Wert in Supabase gewinnt, sobald er nicht `null` ist. Der Seed in der Migration sollte deshalb nur den Slug setzen, sonst laufen beide Stellen auseinander.

**Echte GPS-Daten und die Strecke.** Wer aus Position einen Strecken-km macht, braucht die Strecke. Die kennt heute nur der Browser. Empfehlung für Phase 2b: Der Poller bleibt dumm und schreibt Rohwerte (Position, Distanz der Uhr), der Client projiziert auf die Strecke. Bei Hamburg ist das wegen der Wende bei km 17 nicht eindeutig, die Distanz der Uhr muss als Anhaltspunkt in die Projektion eingehen. Erst der Spot-Alarm (VISION 5) braucht den Strecken-km auf dem Server. Dann zieht die Projektion aus `src/lib/course.ts` in die Edge Function um und die Strecke wird als statische JSON-Route der Seite ausgeliefert. Dafür muss `course.ts` frei von Browser-APIs bleiben.

## 2. Anonymous Sign-in oder Lesen ohne Login und Schreiben mit Namen plus CAPTCHA?

**Empfehlung: Anonymous Sign-in behalten, aber erst beim ersten Schreiben anmelden.** Lesen geht schon jetzt ohne Login, die Select-Policies gelten für `anon`.

**Begründung**
- Schreiben braucht eine Identität: eigener Spot hervorgehoben, nur Eigenes löschen, Rate Limit pro Person. Mit Anonymous Sign-in liefert RLS das über `auth.uid()`, ohne eigenen Servercode.
- Die Alternative (Schreiben über eine Edge Function, die CAPTCHA prüft und mit der Service Role schreibt) verlagert die gesamte Rechteprüfung in eigenen Code. Das widerspricht der Regel aus `CLAUDE.md`, dass Schutz nur aus RLS kommt, und es wäre mehr Code für weniger Funktion.
- Erst beim ersten Schreiben anmelden heißt: Wer nur zuschaut, erzeugt kein Konto und sieht kein CAPTCHA. Das CAPTCHA fällt einmal pro Gerät an, beim Setzen des Namens.

**Was dazugehört**
- Das Rate Limit zählt pro Konto. Wer sich immer neue anonyme Konten holt, umgeht es. Davor schützen nur CAPTCHA und das Limit für anonyme Anmeldungen pro IP im Supabase-Dashboard. Beides vor dem ersten Rennen einschalten und prüfen. Details gehören in Checkpoint C.
- Die Sitzung liegt im Browser. Wer den Speicher löscht oder das Gerät wechselt, kann den alten Spot nicht mehr löschen. Das ist vertretbar, Admins können löschen.
- **Zweiter Admin.** Dima läuft und kann keine Splits eintragen. `admins` kann mehrere Personen aufnehmen. Vor dem Renntag eine Person aus der Crew per Magic Link anmelden und eintragen, und beide Anmeldungen am Vortag testen.

## 3. Realtime: vier Tabellen einzeln oder ein Channel pro Rennen?

**Empfehlung: Ein Channel pro Rennen (`race:<slug>`) mit je einem Listener pro Tabelle, gefiltert auf `race_slug=eq.<slug>` (bei `races` auf `slug`).**

**Begründung**
- Technisch laufen alle Channels über dieselbe WebSocket-Verbindung. Der Unterschied liegt im Code: ein Channel hat einen Status, eine Stelle für Verbindungsabbrüche, ein Aufräumen beim Verlassen der Seite.
- Der Filter sorgt dafür, dass ein zweites Rennen keine Ereignisse an die Seite des ersten schickt.

**Wichtiger als die Channel-Frage**
- **Realtime liefert verpasste Ereignisse nicht nach.** Reihenfolge deshalb: erst abonnieren, dann den Stand laden, Ereignisse per `id` in eine Map einsortieren (doppelt angewendet ändert nichts). Bei jedem `SUBSCRIBED`, also auch nach einem Funkloch, den Stand neu laden. Am Streckenrand ist schlechtes Netz der Normalfall.
- **Löschungen.** Bei aktivem RLS enthält ein DELETE-Ereignis nur den Primärschlüssel und lässt sich nicht nach `race_slug` filtern (prüfen). Der Client muss also per `id` löschen und unbekannte IDs ignorieren.
- **Telemetrie** läuft im selben Channel. Ein Punkt alle paar Sekunden ist für `postgres_changes` unkritisch. Erst bei sehr vielen Zuschauern wäre Broadcast die bessere Wahl, das ist jetzt keine Baustelle.
- **Betrieb.** Kostenlose Supabase-Projekte werden nach einer Woche ohne Aktivität pausiert und haben ein Limit für gleichzeitige Realtime-Verbindungen (beides im Dashboard prüfen). Vor jedem Rennen: Projekt wecken, Limit ansehen. `src/lib/live.ts` muss jeden Fehler beim Laden als "kein Backend" behandeln und statisch weiterlaufen.

Die Datenschicht `src/lib/live.ts` bekommt damit eine kleine, testbare Form: eine reine Funktion, die einen Stand und ein Ereignis nimmt und den neuen Stand liefert, plus eine dünne Hülle für Supabase.

## 4. Was fehlt im Schema, das wir in Phase 1 bereuen würden?

Nach Dringlichkeit. Alles gehört in eine neue Migration vor Phase 1, jeder Punkt mit einem Fall in `tests/rls.test.ts`.

1. **Autorenname in der Zeile, Konto darf verschwinden.** `spots`, `messages` und `checkpoints` verweisen mit `on delete cascade` auf `auth.users`. Wer später alte anonyme Konten aufräumt, löscht damit Pinnwand und Spots vergangener Rennen. Außerdem zeigt `created_by` auf `auth.users` und nicht auf `profiles`, PostgREST kann den Namen also nicht mitladen, und ein Realtime-Ereignis enthält ihn nie.
   Empfehlung: Spalte `author_name`, per Trigger beim Einfügen aus `profiles` gesetzt (nicht vom Client, sonst kann man unter fremdem Namen schreiben), dazu `created_by ... on delete set null`. Dann ist jede Zeile für sich vollständig, auch im Realtime-Ereignis und im Archiv. Ohne Profil schlägt das Einfügen fehl, das erzwingt nebenbei das Onboarding.
2. **Sichtungen sind zwei Schreibvorgänge.** Das Legacy legt bei "Gesehen" erst einen Checkpoint und dann eine Nachricht an. Scheitert der zweite, ist der Stand halb. Empfehlung: nur der Checkpoint wird geschrieben, die Pinnwand zeigt Sichtungen aus `checkpoints` mit an. `messages.kind = 'seen'` entfällt.
3. **Sichtungen bewegen den Läufer und sind kaum geprüft.** `seen_at` kommt vom Client. Eine Sichtung mit beliebiger Zeit und beliebigem km verschiebt die Schätzung für alle (offizielle Splits sind in `estimate()` geschützt, die Strecke dazwischen nicht). Empfehlung: `seen_at` per Default und Trigger auf `now()` setzen, Client-Wert ignorieren. Mehr dazu in Checkpoint C.
4. **Offizieller Split pro km nur einmal.** Es fehlt ein eindeutiger Index auf `(race_slug, km)` für `src = 'official'`. Ohne ihn entstehen bei doppeltem Tippen zwei Splits, und Korrigieren heißt Löschen und neu Anlegen. Mit Index geht ein Upsert. Dafür braucht es auch eine Update-Policy für Admins.
5. **`races.distance_km`.** Die Datenbank kennt die Renndistanz nicht, `km <= 50` ist fest verdrahtet. Mit der Spalte lassen sich Spots und Checkpoints gegen die echte Distanz prüfen, und serverseitiger Code (Poller, später Spot-Alarm) kennt sie.
6. **Telemetrie: Distanz der Uhr getrennt vom Strecken-km.** `km` ist heute mehrdeutig. Empfehlung: `km` bleibt der Strecken-km (darf leer sein, solange der Client projiziert), neu `distance_m` für den Rohwert der Uhr. Dazu passt die Aufteilung aus Frage 1.
7. **Kleinere Punkte.** `races.updated_at` hat keinen Trigger und bleibt stehen. `live_track_url` prüft nur `https://`, für den Poller sollte der Host auf Garmin eingeschränkt sein (der Server ruft diese URL ab). Ein Spot pro Gast und Rennen wäre per eindeutigem Index erzwingbar, falls das gewollt ist: bitte entscheiden.

**Bewusst kein Schema dafür**
- Pin-Farbe und Avatar: aus der Spot-`id` beziehungsweise dem Namen ableiten. Keine Spalte, nichts zu pflegen.
- Mehrere Freunde an einem Spot (VISION 3): Der Client fasst Spots mit nahezu gleichem km zu einem Grüppchen zusammen. Eine Mitglieder-Tabelle wäre erst nötig, wenn man einem Spot ausdrücklich beitreten soll.
- Push-Abos für den Spot-Alarm: eigene Tabelle, aber erst wenn das Feature gebaut wird.
- Mehrere Läufer: nicht vorgesehen, `runner_name` reicht.

## 5. Live-Daten: Wo läuft der Poller, und wie robust ist das?

**Empfehlung: Supabase Edge Function, ausgelöst von Supabase Cron alle 10 s, aktiv nur solange ein Rennen läuft. Der Kern ist ein reines TypeScript-Modul, das unverändert auch als Node-Skript auf dem Mac läuft.**

**Vergleich**

| Variante | Dafür | Dagegen |
|---|---|---|
| Edge Function mit Cron | Gleiche Plattform, Service Role schon da, kein weiterer Dienst, läuft ohne Zuschauer | Rechenzentrums-IP, die Garmin sperren könnte (prüfen). Cron im Sekundentakt bei Supabase prüfen |
| Cloudflare Worker | Stabil, günstig | Zweite Plattform, Cron dort nur minutenweise, Secret an zwei Orten |
| Vom Client ausgelöst | Kein Cron nötig | Hängt davon ab, dass jemand zuschaut. Jeder Besucher kann den Abruf auslösen. Direkter Abruf im Browser scheitert voraussichtlich an CORS |
| Skript auf dem Mac | Heimanschluss, keine IP-Sperre | Der Mac muss am Renntag laufen und online sein |

**Begründung**
- Der Poller braucht keinen Zustand: Er liest die Session, schreibt alle Punkte, die neuer sind als der letzte in `telemetry`, und endet. Der eindeutige Schlüssel `(race_slug, source, recorded_at)` macht doppelte Läufe harmlos. Das passt genau auf eine kurzlebige Funktion.
- Die größte Unbekannte ist nicht die Technik, sondern Garmin: Die Schnittstelle ist inoffiziell, Felder, Takt und Verzögerung sind nicht verifiziert, und ob Abrufe aus einem Rechenzentrum durchkommen, weiß ich nicht. Deshalb derselbe Code an zwei Orten. Scheitert die Edge Function an einer Sperre, läuft das Skript auf dem Mac, ohne dass der Client etwas merkt.

**Robustheit**
- **Der Client entscheidet nach dem Alter des letzten Punkts, nicht nach einem Status des Pollers.** Ist der jüngste Punkt älter als ein Schwellwert (Vorschlag 90 s, nach der Messung der echten Verzögerung festlegen), läuft die Schätzung weiter und das HUD sagt "geschätzt". Damit ist jeder Ausfall abgedeckt: Poller tot, Garmin geändert, Handy ohne Netz, Uhr aus. Das ist auch der Abkürzungs-Check "Rückfall ohne Sprung" aus `docs/VISION.md`.
- **Antworten streng prüfen.** Die Antwort von Garmin läuft durch ein Zod-Schema. Passt sie nicht, wird nichts geschrieben. Lieber keine Daten als falsche.
- **Echte Antworten als Testdaten.** Beim Verifizieren auf dem Mac zwei oder drei Antworten speichern (ohne Heimatkoordinaten) und als Fixtures unter `tests/` ablegen. Ändert Garmin das Format, zeigt ein Test, was bricht.
- **Sichtbar scheitern.** Zwei Felder an `races` (`telemetry_checked_at`, `telemetry_error`) oder eine kleine Statustabelle, damit Dima vor dem Start in den Einstellungen sieht, ob Daten ankommen.
- **Höflich bleiben.** Bei 403 oder 429 Abstand verdoppeln, nach mehreren Fehlern bis zum nächsten Cron-Lauf aufgeben.
- **Absichern.** Die Funktion nimmt nur Aufrufe mit einem geheimen Header an und ruft nur URLs auf Garmin-Hosts ab. Der Service-Role-Key steht nur in den Secrets der Funktion.
- **Ohne Lauf testen.** Ein Skript schreibt das Hamburg-Replay in Echtzeit mit `source = 'replay'` nach `telemetry`. Damit lässt sich die ganze Kette inklusive Abbruch proben, bevor ein echter Lauf dafür nötig ist.

**Reihenfolge für Phase 2b**
1. Auf dem Mac prüfen, was ein LiveTrack-Link liefert (steht schon in der Roadmap), Antworten als Fixtures sichern.
2. Parser und Schreiblogik als reines Modul mit Tests.
3. Als Node-Skript auf dem Mac gegen einen Trainingslauf.
4. Als Edge Function deployen und denselben Lauf von dort abrufen. Erst hier zeigt sich, ob Garmin Rechenzentren sperrt.
5. Generalprobe mit Abbruch mitten im Lauf.

## Entscheidungen, die bei Dima liegen
Beantwortet am 12.11., siehe nächster Abschnitt.

- Ein Spot pro Gast und Rennen, oder mehrere?
- Wer wird zweiter Admin am Renntag?
- Soll der LiveTrack-Link für alle sichtbar bleiben? `races` ist öffentlich lesbar, der Link zeigt die echte Position. Wenn nein, gehört er in eine Tabelle ohne Select-Policy. Das ist auch Thema von Checkpoint C.

## Entscheidungen von Dima (12.11.2026)
1. **Spots:** bis zu 3 pro Gast und Rennen, per Trigger in der Datenbank erzwungen.
2. **Neue Rolle crew pro Rennen:** Tabelle `race_crew`, Funktion `is_crew(slug)`. Crew darf offizielle Splits und Start/Ziel setzen, aber keine Renneinstellungen ändern.
3. **LiveTrack-Link raus aus `races`:** in eine Tabelle `race_secrets` ohne Policies. Nur der Poller liest ihn mit dem Service-Key.

**Was das für die Umsetzung heißt**
- **Spots:** Der Trigger zählt die Spots von `created_by` im Rennen vor dem Einfügen. Zwei gleichzeitige Einfügungen könnten beide durchkommen. Für einen privaten Tracker reicht das, eine Sperre pro Nutzer (`pg_advisory_xact_lock`) macht es wasserdicht. Admins sind wie beim Rate Limit ausgenommen.
- **Crew:** RLS prüft Zeilen, nicht Spalten. Damit Crew nur `actual_start` und `finished_at` an `races` ändern kann, gibt es zwei Wege: eine Funktion mit `security definer`, die nur diese beiden Felder setzt, oder Spalten-Rechte für die Rolle `authenticated` plus eine Update-Policy für Crew. Empfehlung: die Funktion, weil Spalten-Rechte für alle angemeldeten Nutzer gelten und leicht übersehen werden. Für offizielle Splits wird die Insert-Policy von `checkpoints` um `is_crew(race_slug)` erweitert, ebenso Löschen und das Upsert aus Punkt 4 der Schema-Lücken. `race_crew` selbst bekommt keine Schreib-Policies, eingetragen wird wie bei `admins` im SQL Editor. Crew ist vom Rate Limit ausgenommen.
- **LiveTrack-Link:** "Ohne Policies" heißt auch, dass Dima den Link nicht aus den Einstellungen der Seite speichern kann. Optionen: im SQL Editor setzen, oder eine Funktion mit `security definer`, die nur Admins schreiben lässt und nichts zurückgibt. Lesen bleibt in beiden Fällen dem Poller vorbehalten. Der Roadmap-Punkt "Einstellungen" muss entsprechend angepasst werden, sobald das entschieden ist.

**Nachtrag 12.11.: offene Punkte entschieden**
- **Spots:** Trigger ohne Sperre. Dass zwei gleichzeitige Einfügungen einen vierten Spot durchlassen, wird in Kauf genommen.
- **Crew:** wie oben empfohlen über eine Funktion mit `security definer`, die nur `actual_start` und `finished_at` setzt. Keine Update-Policy für Crew an `races`.
- **LiveTrack-Link:** zwei Funktionen mit `security definer`, sonst kein Zugriff auf `race_secrets`.
  - `set_livetrack_link(slug, url)`: nur für Admins aufrufbar, speichert den Link mit Zeitpunkt in `race_secrets` und gibt ihn nie zurück. Akzeptiert nur URLs mit Schema `https`, ohne Port, ohne Zugangsdaten (`user:pass@`) und mit einem Host, der exakt in einer kleinen Liste erlaubter Hosts in der Funktion steht. Heute enthält die Liste nur `livetrack.garmin.com`, weitere Quellen kommen später dort dazu. Grund: Der Poller ruft diese URL vom Server aus ab, also darf sie nur zu Garmin führen.
  - `livetrack_link_status(slug)`: nur für Admins aufrufbar, liefert nur "hinterlegt ja/nein" und den Zeitpunkt der letzten Änderung, nie den Link selbst.
  - Den Link liest nur der Poller mit dem Service-Key.
  - Annahme: Der Host wird vor dem Vergleich in Kleinbuchstaben umgewandelt, `LiveTrack.Garmin.com` gilt also als erlaubt. Ein Punkt am Ende (`livetrack.garmin.com.`) gilt als anderer Host und wird abgelehnt.

**RLS-Testfälle für den LiveTrack-Link** (in `tests/rls.test.ts`, gehören zur Migration aus Phase 1)

| Fall | Erwartung |
|---|---|
| Admin setzt `https://livetrack.garmin.com/session/…` | gespeichert, Rückgabe enthält den Link nicht |
| Admin setzt `http://livetrack.garmin.com/…` | abgelehnt |
| Admin setzt `https://evil.de/…` | abgelehnt |
| Admin setzt `https://livetrack.garmin.com.evil.de/…` | abgelehnt |
| Admin setzt `https://evil.livetrack.garmin.com/…` | abgelehnt |
| Admin setzt `https://livetrack.garmin.com@evil.de/…` | abgelehnt |
| Admin setzt `https://user:pass@livetrack.garmin.com/…` | abgelehnt |
| Admin setzt `https://livetrack.garmin.com:8443/…` | abgelehnt |
| Admin setzt `https://livetrack.garmin.com./…` | abgelehnt |
| Gast, Crew oder Besuch ohne Login ruft `set_livetrack_link` auf | abgelehnt |
| Gast, Crew oder Besuch ohne Login ruft `livetrack_link_status` auf | abgelehnt |
| Admin ruft `livetrack_link_status` auf | liefert nur ja/nein und Zeitpunkt, kein Feld mit dem Link |
| Gast, Crew oder Besuch ohne Login liest `race_secrets` direkt | keine Zeilen |
| `races` hat keine Spalte `live_track_url` mehr | Spalte existiert nicht |

## Übernommen
Noch nichts. Vorschlag für die Umsetzung: Punkte 1 bis 7 aus Frage 4 als eine Migration am Anfang von Phase 1, die Regeln aus Frage 3 in `src/lib/live.ts`, Frage 5 in Phase 2b.
