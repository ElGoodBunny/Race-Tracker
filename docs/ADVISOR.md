# Fable 5.2 als Advisor (verfügbar bis 16.11.2026)

## Einrichtung in Claude Code
Bis 16.11.: Opus arbeitet, Fable berät. In der Session:
```
/model opus
/advisor fable
```
Erwartete Antworten: "Set model to Opus 5.5 ..." und "Advisor set to Fable 5.2". Der Advisor braucht Claude Code 2.1.321 oder neuer, sonst `claude update` und neu starten. Falls Claude Code verlangt, erst auf Fable zu wechseln: einmal `/model fable`, dann wieder `/model opus`.
Für die Checkpoints selbst (lange Denkarbeit) direkt `/model fable`, danach zurück auf Opus. Fable zieht das Wochenlimit schnell leer, Kleinkram immer mit Opus.
Kostenverhältnis laut Charlie Hills (7 gleiche Builds zu API-Preisen): Opus allein 16 $, Opus mit Fable als Advisor 26 $, Fable allein 39 $. Opus plus Advisor ist also der Normalfall, Fable allein nur für die Checkpoints. Dass Fable bei kleinen Aufgaben gar nicht eingreift, ist normal.

Fable ist für Entscheidungen da, die teuer zu korrigieren sind. Umsetzung, Port und Kleinkram macht das normale Modell. Jeder Checkpoint endet mit einer Notiz in `docs/decisions/` (Datum, Frage, Empfehlung, was übernommen wurde), damit das Wissen nach dem 16.11. bleibt.

## Warm-up: Läuferfigur und Pins als Prototyp (Do 12., ca. 15 min)
Bevor die 3D-Szene gebaut wird, entsteht der Look der Figuren isoliert. Mit `/model fable`:
> Baue die Astro-Seite `src/pages/dev/figures.astro` (nur für die Entwicklung, `noindex`) mit three.js aus npm, kein CDN. Zeige auf einer Drehscheibe: die Läuferfigur im Stil von `docs/reference/munich-video/frame-04.jpg` (Comic, Kappe, Shirt mit Startnummer, Laufanimation), einen glänzenden Ballon-Pin in jeder der sechs Flaggenfarben aus `src/styles/tokens.css`, zwei Zuschauer-Avatare und den Konfetti-Burst. Alles in Code modelliert, keine fremden Modelle. Regler für Laufgeschwindigkeit und hell/dunkel. Danach Screenshot machen und gegen das Referenzbild prüfen.
Prüfung: Die Figur liest sich auf 40 px Höhe noch als Läufer, und im Dunkelmodus nutzt sie nur Farben aus den Tokens.

## Checkpoint A: Architektur und Datenmodell (Do 12. / Fr 13.)
Kontext geben: `CLAUDE.md`, `docs/ARCHITECTURE.md`, `supabase/migrations/`, `src/content.config.ts`
Fragen:
1. Trägt die Trennung "statische Strecke im Repo, Live-Zustand in Supabase" auch für mehrere Rennen und echte GPS-Daten später?
2. Ist Anonymous Sign-in für Gäste der richtige Weg, oder lieber Lesen ohne Login und Schreiben nur mit Namen + CAPTCHA?
3. Realtime: vier Tabellen einzeln abonnieren oder ein Channel pro Rennen mit Filter?
4. Was fehlt im Schema, das wir in Phase 1 bereuen würden?
5. Live-Daten: Garmin LiveTrack als erste Quelle (VISION 6). Poller wo (Edge Function mit Cron, Worker, Client-getriggert)? Wie robust gegen Abbrüche und Änderungen der inoffiziellen Schnittstelle?

## Checkpoint B: 3D-Konzept (Sa 14. / So 15.)
Kontext geben: View3D-Teil aus `legacy/hamburg-2026.html`, `docs/DESIGN.md`, Phase 2 der Roadmap
Fragen:
1. Kameradramaturgie und Scroll-Story: Wie wird die 3D-Strecke zum Hero, ohne die Seite langsam zu machen?
2. OSM-Gebäude: Overpass zur Build-Zeit, Vereinfachung, Datenmenge pro Rennen, Lizenzhinweis
3. Architektur des Moduls: Szene, Kamera, Datenanbindung sauber getrennt, testbar
4. Performance-Plan für Mittelklasse-Handys (Instancing, LOD, Frame-Budget)

## Checkpoint C: Security Review (So 15. / Mo 16.)
Kontext geben: `supabase/migrations/`, `tests/rls.test.ts`, alle Client-Schreibpfade aus Phase 1
Fragen:
1. RLS-Lücken, besonders Update-Policies und `security definer`-Funktionen
2. Missbrauch durch anonyme Accounts: Rate Limit ausreichend, CAPTCHA-Pflicht, Spam auf der Pinnwand
3. XSS-Pfade (Namen, Nachrichten, Spot-Namen, LiveTrack-URL)
4. Datenschutz: was ist öffentlich lesbar, braucht es ein Impressum oder eine Datenschutzerklärung bei öffentlicher Domain

## Checkpoint D: Design-Richtung (wenn Zeit bleibt)
Screenshots der Seite hell und dunkel, Desktop und Handy, plus `docs/DESIGN.md`. Frage: Was fehlt, damit die Seite sich wie ein Produkt anfühlt und nicht wie eine Vorlage?

## Checkpoint E: Playbook für Opus (spätestens So 15., Fable läuft Mo 16.11. 23:59 PT aus)
Mit `/model fable` zwei Skills schreiben lassen:
1. `.claude/skills/fable-playbook/SKILL.md`, allgemein: wie Fable eine Aufgabe plant, in Schritte zerlegt und die eigene Arbeit prüft.
2. `.claude/skills/race-tracker-review/SKILL.md`, projektspezifisch: die Prüflisten aus den Checkpoints A bis D (3D-Performance, RLS-Änderungen, Design-Regeln, Port aus `legacy/`, Live-Daten).
Prüfung: Eine echte Aufgabe mit "Nutze fable-playbook und race-tracker-review" starten. Opus muss vor Beginn die Schritte nennen, denen es folgt. Wenn nicht: "Liste die Skills, die du für diese Aufgabe geladen hast."
