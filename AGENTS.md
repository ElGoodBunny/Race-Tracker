# Teamregeln für Agenten

An diesem Repo arbeiten zwei Agenten, beide auf Dimas Mac. Dima vergibt die Pakete, entscheidet bei Rückfragen und merged. Lies diese Datei ganz, bevor du etwas tust.

## Wer was macht
- **Claude** (Claude Code): Lead. Plant, schreibt die Pakete in `docs/tasks/`, entscheidet Architektur und Design. Besitzt die Kernmodule in `src/lib/`, Supabase, RLS und Security sowie die schwierigen 3D-Teile. Reviewt jedes Paket, bevor es gemerged wird.
- **Gemini** (Gemini 3.8 Flash in Antigravity): Sichtprüfungen im Browser, Messungen, Skripte am Mac laufen lassen (OSM, Garmin LiveTrack). Ändert keinen Code in `src/`, außer das Paket erlaubt es ausdrücklich. Zusätzliche Regeln in `GEMINI.md`.
- Gemini trifft keine Architektur- oder Designentscheidungen und hat höchstens ein Paket gleichzeitig.
- **Dima**: einziger, der Keys, Logins, das Supabase-Dashboard, GitLab, GitHub und Zahlungen anfasst.

## Wo du arbeitest
- Basis ist der Branch `phase-2`. `main` ist veraltet: nie davon abzweigen, nie dorthin mergen.
- Jeder Agent hat einen eigenen Ordner (Git-Worktree). Alle Ordner teilen dasselbe Repo, Commits in einem Ordner sind in den anderen sofort sichtbar.
  - Claude: `~/Desktop/Dev/Race Tracker` (Hauptordner)
  - Gemini: `~/Desktop/Dev/race-tracker-gemini`
- Dima legt deinen Ordner an. Den Branch für ein neues Paket legt Claude dort an, auf Basis von `phase-2` und nur, wenn der Ordner keine offenen Änderungen hat. Sonst arbeite nur in deinem Ordner, wechsle dort nicht den Branch und fass die anderen Ordner nicht an.
- `Claude outputs/` und `brag-output/` im Hauptordner gehören nicht zum Projekt. Ignorieren.

## Bevor du anfängst
1. Lies `CLAUDE.md`. Alle Regeln dort gelten für dich genauso (Arbeitsregeln, Design und Texte, Sicherheit). Wo diese Datei abweicht, steht es hier unter "Ablauf".
2. Lies dein Paket in `docs/tasks/`. Arbeite nur an Paketen, bei denen du Besitzer bist und der Status `offen` ist. Setz den Status auf `in Arbeit` und committe das.
3. Prüf, ob Teile des Pakets im Code schon erledigt sind. Dann nicht nochmal bauen, sondern im Ergebnis vermerken.
4. Einmal `npm ci` in deinem Ordner, dann `npm test`. Alles muss grün sein, bevor du etwas änderst. Ist es das nicht: anhalten und melden.

## Grenzen
- Ändere nur Dateien, die im Paket unter "Erlaubte Dateien" stehen. Brauchst du eine andere: anhalten, unter "Rückfragen" begründen, Status `blockiert`.
- Ohne Freigabe im Paket tabu: bestehende Dateien in `src/lib/`, `supabase/migrations/`, `tests/rls.test.ts`, `CLAUDE.md`, `AGENTS.md`, `GEMINI.md`, `docs/ARCHITECTURE.md`, `docs/VISION.md`, `docs/ROADMAP.md`, `legacy/`, `package.json`, `package-lock.json`, `.gitlab-ci.yml`.
- Keine neuen Abhängigkeiten, auch keine Werkzeuge per `npx` nachladen, außer das Paket sagt es.
- Keine Secrets, Keys oder Logins anfassen oder anfordern. Braucht ein Schritt so etwas: anhalten und Dima fragen.
- Kein `git add -A` oder `git add .`, nur die eigenen Dateien gezielt stagen. Kein Push, kein Force, kein Rebase, kein Merge.
- Wird ein Test rot, den du nicht angefasst hast: nicht reparieren, sondern melden.
- Nichts erfinden. Kannst du einen Prüfpunkt nicht selbst prüfen, schreib das ins Ergebnis, statt ihn als erfüllt zu melden.

## Auf Dimas Mac
Deine Befehle wirken auf seinen Rechner, nicht auf eine Sandbox.
- Nichts außerhalb deines Ordners anlegen, ändern oder löschen. Löschen in deinem Ordner nur in `.cache/` und nur, wenn das Paket es verlangt.
- Keine globalen Installationen (`npm -g`, `brew`, `pip`).
- Netzwerk nur für `npm ci` und das, was das Paket verlangt. Öffentliche Server wie Overpass: ein Lauf, keine Schleifen.
- Im Browser nur `localhost` und Seiten, die das Paket nennt. Keine Logins, keine Formulare auf fremden Seiten.
- Läuft schon ein Dev-Server (zum Beispiel von Claude), nimmt Astro einen anderen Port. Nimm die Adresse, die `npm run dev` ausgibt.
- Dein Kontingent ist knapp: früh und oft committen, das Ergebnis im Paket laufend nachtragen. Geht das Kontingent mitten im Paket aus, steht dort, wie weit du bist, und der nächste Lauf macht dort weiter.

## Ablauf
1. Kleine Commits auf deinem Branch. Commit-Nachrichten wie im Repo üblich: `feat: …`, `fix: …`, `test: …`, `docs: …`, auf Deutsch. Vor jedem Commit, der Code betrifft, `npm run check` und `npm test`.
2. Am Ende im Paket den Abschnitt "Ergebnis" ausfüllen: was erledigt ist, wie geprüft (Befehle und Ausgabe in Kurzform), was offen ist, wo du vom Auftrag abgewichen bist. Status `review`, committen. Dann Dima Bescheid geben.
3. Nicht pushen, keinen Merge Request öffnen. Claude reviewt deinen Branch direkt im gemeinsamen Repo (`git diff phase-2...<dein-branch>`).
4. Änderungswünsche stehen danach im Paket unter "Review". Im selben Branch umsetzen, wieder Status `review`.
5. Dima merged nach `phase-2` und pusht. Abweichend von `CLAUDE.md`: ein Branch pro Paket, nicht pro Phase. Die Roadmap pflegt Claude.

## Vorlage für ein Paket
```
# <nr> <Titel>
Besitzer: claude | gemini
Status: offen | in Arbeit | blockiert | review | erledigt
Branch: <agent>/<nr>-<kurzname>
Roadmap: <Phase und Schritt>

## Worum es geht
## Auftrag
## Erlaubte Dateien
## Prüfpunkt
## Nicht Teil des Pakets
## Rückfragen
## Ergebnis
## Review
```

## Pakete
- 001 Liste "Als Nächstes" (Phase 2, Schritt 11): claude, erledigt
- 002 Sichtprüfung Streckenband und Läufer auf `/dev/live` (Phase 2, Schritte 7 und 9): gemini, erledigt
- 003 Budget Barcelona, Detailstufe der Stadt (Phase 2, Schritt 5b): claude, erledigt
- 004 Bäume (Phase 2, Schritt 6): claude, erledigt
- 005 Mischquelle (Phase 2, Schritt 13 ohne Replay-Steuerung): claude, erledigt
- 006 Bedienleiste der Kamera (Phase 2, Schritt 8): claude, erledigt
- 007 HUD und Panel (Phase 2, Schritt 12): claude, erledigt
- 008 Labels (Phase 2, Schritt 10): claude, erledigt
- 009 Läufer vor den Pins (Phase 2, Schritt 9): claude, erledigt
- 010 Pfeile im Streckenband (Phase 2, Schritt 7): claude, erledigt
- 011 Nachprüfung Läufer, Pins und Streckenband auf `/dev/live` (Phase 2, Schritte 7 und 9): claude (von gemini übernommen), erledigt, `docs/tasks/011-gemini-nachpruefung-live.md`
- 012 "Als Nächstes" im Panel (Phase 2, Schritt 11): claude, erledigt
- 013 Ansicht auf die freie Fläche (Phase 2, Schritt 12): claude, erledigt
- 014 Zoom mit zwei Fingern beim Folgen (Phase 2, Schritt 8): claude, erledigt
- 015 Konfetti in der richtigen Größe (Phase 2, Schritt 11): claude, erledigt
- 017 3D-Ansicht in der Rennseite (Phase 2, Schritte 15 und 13): claude, erledigt
- 018 Datenschicht Supabase (Phase 1): claude, erledigt
- 019 Fehlertexte (Phase 1): claude, erledigt
- 021 Funktionsrechte (Phase 1, Supabase): claude, review
