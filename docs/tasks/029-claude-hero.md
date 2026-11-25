# 029 Hero mit Phase
Besitzer: claude
Status: review
Branch: claude/029-hero
Roadmap: Phase 1, Hero mit Phase (vor dem Start, live, im Ziel) und phasenabhängiger Hauptaktion

## Worum es geht
Der Hero der Rennseite ist noch der statische aus Phase 0. Im Legacy zeigt er die Phase, eine Hauptaktion je Phase und einen Hinweis zur Schätzung (`docs/DESIGN.md`, Seitenaufbau Punkt 2).

Annahmen:
- Phase und Text kommen aus derselben Schätzung wie die Statuskarte (027), die Hauptaktion wie im Legacy: vor dem Start "Spot setzen" (#spots), live "Live verfolgen" (#live), im Ziel "Zeiten ansehen" (#ergebnis aus 028). Ohne Daten ("stale") wie vor dem Start
- Vor dem ersten Rechnen gilt: Ergebnis in der Rennen-JSON heißt im Ziel, sonst vor dem Start
- Der Satz zu Garmin LiveTrack fällt weg, der Link wird Gästen nie gezeigt

## Auftrag
1. `heroAction(phase)` in `src/lib/live/status.ts` mit Tests
2. Hero in `[race].astro`: Phase als Pill über der H1, Hauptaktion und Hinweis unter den Fakten, `hero.ts` hält beides aktuell
3. Pill-Stile aus `Status.astro` nach `global.css` unter `.live-sec`, dazu `.btn.lg`

## Erlaubte Dateien
- `src/lib/live/status.ts`, `tests/status.test.ts`, `src/components/hero.ts` (neu), `src/components/Status.astro`
- `src/pages/[race].astro`, `src/styles/global.css`
- diese Datei, `AGENTS.md` (Paketliste), `docs/ROADMAP.md` (Checkbox)

## Prüfpunkt
- `npm run check`, `npm test` grün
- Sichtprüfung hell und dunkel, Desktop und Handy, alle drei Phasen

## Nicht Teil des Pakets
Schwebende Navigation mit derselben Hauptaktion, Abschluss am Seitenende ("FAQ, Abschluss, Footer").

## Rückfragen

## Ergebnis
Umgesetzt:
- `heroAction` mit 2 Tests, erst rot ("heroAction is not a function"), dann grün
- Hero: Pill mit Phase (Countdown, "Live · geschätzt", "Im Ziel"), Hauptaktion mit Pfeil, Hinweis "Geschätzt aus Startzeit, Tempo und euren Sichtungen." Im Ziel ohne Hinweis, die Zeit ist dann echt
- Pill und `.btn.lg` in `global.css` unter `.live-sec`, der Hero trägt die Klasse, sein eigener Abstand bleibt

Abweichungen vom Legacy:
- Ohne LiveTrack-Satz, ohne Startnummer neben der Pill (steht schon in den Fakten), Hinweis im Ziel ausgeblendet

Geprüft:
- `npm run check` 0 Fehler, `npm test` 367 grün
- Sichtprüfung lokal: Barcelona vor dem Start hell 1280 px, Hamburg im Ziel dunkel 375 px. Live per JS geprüft (im Browser vorgestellte Uhr): Pill "Live · geschätzt" blinkt, Aktion "Live verfolgen" auf #live. Gefunden und behoben: Hauptaktion war unterstrichen

## Review
