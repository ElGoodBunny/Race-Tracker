# 017 3D-Ansicht in der Rennseite
Besitzer: claude
Status: review
Branch: claude/017-einbau-rennseite
Roadmap: Phase 2, Schritt 15 (Einbau) und Schritt 13 (Replay-Steuerung auf der Rennseite)

## Worum es geht
Die 3D-Ansicht läuft nur auf `/dev/live`. Die Rennseite `[race].astro` ist noch die statische Seite aus Phase 0. Phase 1 baut auf der Rennseite auf, deshalb kommt der Einbau zuerst (Plan vom 24.11. in `docs/ROADMAP.md`).

Entschieden am 24.11. (Dima): Vor dem Rennen zeigt die Barcelona-Seite einen Probelauf, die Hamburg-Aufzeichnung auf die Barcelona-Strecke gelegt, beschriftet als Probelauf mit Dimas Daten aus Hamburg. Hamburg zeigt die echte Aufzeichnung. Beide mit Replay-Steuerung.

## Auftrag
1. Bühne, HUD, Panel, Bedienleiste und Steuerung aus `/dev/live` in eine Komponente ziehen. `/dev/live` nutzt sie, Verhalten bleibt gleich
2. Rennseite: Die 2D-Karte ist der Platzhalter im selben Kasten. Die 3D-Ansicht lädt erst beim Sichtbarwerden (dynamischer Import, three.js nicht im Skript der Seite) und blendet per `opacity` über die Karte
3. Ohne WebGL bleibt die 2D-Karte stehen, die Steuerung bleibt ausgeblendet. Reduzierte Bewegung regelt die Ansicht schon selbst (harte Schnitte, kein Konfetti)
4. Replay-Steuerung (Pause, 1×, 10×, 60×, Folgen, Übersicht, Zentrieren) auf der Rennseite. "Ausfall 60 s" nur auf `/dev/live`
5. Ohne Spots (bis Phase 1) fällt "Als Nächstes" weg
6. Am Handy bleibt die Seite über der Ansicht scrollbar (`touch-action: pan-y`, `docs/decisions/2026-11-13-3d-konzept.md`)

## Erlaubte Dateien
- `src/pages/[race].astro`, `src/pages/dev/live.astro`, `src/components/CourseMap.astro`
- `src/components/LiveStage.astro`, `src/components/live-stage.ts` (neu)
- `e2e/race-page.e2e.ts` (neu), `playwright.config.ts`
- `docs/tasks/017-claude-einbau-rennseite.md`, `AGENTS.md` (Paketliste), `docs/ROADMAP.md`, `docs/decisions/2026-11-13-3d-konzept.md` (Messwerte)

## Prüfpunkt
- 3D-Bundle unter 250 kB gzip aus dem Build, Skript der Rennseite ohne three.js
- Layout-Verschiebung 0 per Playwright auf `/barcelona-2027` beim Laden und Einblenden
- Bestehende Checks `npm run e2e` grün
- Sichtprüfung `/barcelona-2027` und `/hamburg-2026`, hell und dunkel, Desktop und Handy
- 60 Bilder pro Sekunde im Folgemodus auf Dimas Handy: misst Dima, sobald eine Vorschau online ist

## Nicht Teil des Pakets
Aufbau der Stadt in Scheiben und anpassbare Auflösung (erst, wenn die Messung am Handy es verlangt). Spots aus Supabase. Hero mit Phase.

## Rückfragen

## Ergebnis
Erledigt:
- `src/components/LiveStage.astro` (Bühne, HUD, Panel, Bedienleiste, Steuerung) und `src/components/live-stage.ts` (`startLive`, vorher das Skript von `/dev/live`, inhaltlich unverändert). `/dev/live` nutzt beides, alle bisherigen Checks laufen unverändert
- Rennseite: Hat das Rennen eine `scene.json`, steht die 2D-Karte als Platzhalter im Kasten der Bühne. Ein `IntersectionObserver` (200 px Vorlauf) lädt `live-stage.ts` mit three.js erst beim Sichtbarwerden nach, die Ansicht blendet per `opacity` über die Karte. Ohne WebGL bleibt die Karte, Steuerung bleibt unsichtbar
- Barcelona zeigt den Probelauf, Hamburg die Aufzeichnung. Der Hinweis steht im Panel und unter der Steuerung, weil er am Handy im zugeklappten Sheet nicht zu sehen wäre
- "Als Nächstes" fällt ohne Spots weg, "Ausfall 60 s" nur auf `/dev/live`. Am Handy ist die Ansicht auf der Rennseite `touch-action: pan-y`
- Die Steuerung behält ihre Zeile, solange sie unsichtbar ist (`visibility`), sonst schiebt ihr Erscheinen alles darunter

Geprüft:
- `npm run check` 0 Fehler, `npm test` 277 Tests grün
- `npm run e2e` 9 von 9 grün, neu `e2e/race-page.e2e.ts` für beide Rennen: vor dem Sichtbarwerden weder three.js noch `scene.json` geladen, danach Steuerung sichtbar, kein "Ausfall 60 s", kein "Als Nächstes", Layout-Verschiebung 0 ab dem Scrollen
- Build: Skript der Rennseite 1,2 kB gzip. Nachgeladen werden `live-stage` 11,6 kB, `scene` 9,4 kB, `figures` 2,4 kB und three.js 141,6 kB, zusammen 165 kB gzip (Grenze 250 kB)
- Sichtprüfung per Playwright-Bildern, `/barcelona-2027` und `/hamburg-2026`, hell und dunkel, Desktop 1280 und Handy 390, jeweils oben und im Folgemodus. Gefunden und behoben: Die Karte lag über dem Canvas (absolut vor statisch), und der Platzhalter war höher als die Bühne

Offen:
- 60 Bilder pro Sekunde auf Dimas Handy, Bedienung mit `pan-y` (Drehen, Zoomen mit zwei Fingern, Scrollen über die Ansicht) auf einem echten Gerät
- Ohne WebGL nicht im Browser geprüft, nur der Code-Pfad (`createView` gibt `null`)
- Schon vorher so: Beim Laden der Schrift verschiebt sich die Überschrift im Hero (0,0004). Der Check zählt deshalb erst ab dem Scrollen
- Am Handy ist die 2D-Karte im 9:16-Kasten klein. Betrifft nur die Zeit bis zum Laden und Geräte ohne WebGL
- Aufbau der Stadt in Scheiben und anpassbare Auflösung, erst wenn die Messung am Handy es verlangt


## Review
