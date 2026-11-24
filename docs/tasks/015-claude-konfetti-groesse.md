# 015 Konfetti in der richtigen Größe
Besitzer: claude
Status: review
Branch: claude/015-konfetti-groesse
Roadmap: Phase 2, Schritt 11 (Spots), Teil "Konfetti"

## Worum es geht
Nachprüfung 011, Befund "Neu 1": An km 13,9 stehen im Folgemodus riesige Konfettistücke im Bild, eins liegt über dem Kopf des Läufers. Ursache: Das Konfetti übernimmt beim Platzen Größe und Ort des Pins in diesem Moment und behält sie. Platzt es in der Übersicht (Pin-Maßstab etwa 20, Pin weit neben der Strecke), fliegen die Stücke nach dem Flug in den Folgemodus 36-mal zu groß und am falschen Ort durchs Bild. Mit Pause hat es nichts zu tun, das Konfetti fällt auch bei Pause nach Wanduhr.

## Auftrag
1. Konfetti hat in jedem Bild Größe und Ort des Pins, an dem es geplatzt ist.
2. Test zuerst, der das Platzen in der Übersicht und den Wechsel in den Folgemodus nachstellt.

## Erlaubte Dateien
- `src/lib/view3d/actors.ts`
- `tests/actors.test.ts` (neu)
- `docs/tasks/015-claude-konfetti-groesse.md`, `AGENTS.md` (Paketliste)

## Prüfpunkt
- Test: Platzen bei Pin-Maßstab 20, nächstes Bild 0,55: Konfetti hat 0,55 und steht am Pin. Rot ohne den Fix
- `npm run check`, `npm test`, `npm run e2e` grün
- Sichtprüfung: Übersicht an km 12, Sprung auf km 13,9 und Folgen, Konfetti klein über dem Pin

## Nicht Teil des Pakets
Die übrigen Befunde aus 011. Aussehen und Menge des Konfettis.

## Rückfragen

## Ergebnis
Erledigt: `actors.ts` merkt sich den Spot des letzten Platzens und setzt Ort und Maßstab des Konfettis in jedem Bild wie beim Pin. Die Teilchen behalten ihre Flugbahn relativ zum Pin.

Geprüft:
- `tests/actors.test.ts` zuerst: rot mit 20 statt 0,55, nach dem Fix grün. Gegenprobe mit zurückgenommenem Fix: rot
- `npm test` 24 Dateien, 270 Tests grün. `npm run check` 0 Fehler im Projekt (17 in `Claude outputs/` und `brag-output/`). `npm run e2e` 4 von 4 grün
- Sichtprüfung Desktop dunkel: Übersicht km 12, Sprung auf km 13,9 mit Wechsel ins Folgen, 1,3 s danach: kleine Stücke über dem Pin Sagrada Família, nichts über dem Läufer

Nicht geprüft: Handy, hell. Am Code hängt das nicht, Größe und Ort kommen aus denselben Werten wie beim Pin.

## Review
