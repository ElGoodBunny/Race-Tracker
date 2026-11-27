# 001 Liste "Als Nächstes"
Besitzer: claude
Status: erledigt
Branch: claude/001-als-naechstes
Roadmap: Phase 2, Schritt 11 (Spots), Teil "Liste Als Nächstes"

## Worum es geht
Auf der Live-Ansicht sollen Zuschauer sehen, welche Cheering Spots als Nächstes kommen und wann der Läufer dort ist. Dieses Paket baut nur die Logik dafür als reine Funktion mit Tests. Anzeige und Einbau macht später jemand anderes.

Lies vorher:
- `src/lib/live/events.ts`: `Spot` und `createSpotTracker`. Festlegung aus `docs/decisions/2026-11-13-3d-konzept.md`, Abschnitt "Durchstich": **Nur `events.ts` entscheidet, ob ein Spot passiert ist.** Deine Funktion vergleicht deshalb keine km, um "passiert" zu bestimmen, sondern bekommt das Ergebnis des Trackers als Funktion herein.
- `src/lib/live/source.ts`: `Sample.pace` ist Sekunden pro km oder `null` (Stehen, Start).
- `tests/events.test.ts` als Vorbild für Stil und Aufbau der Tests.

## Auftrag
Neue Datei `src/lib/live/upcoming.ts` mit genau dieser Schnittstelle:

```ts
import type { Spot } from "./events";

export interface UpcomingSpot {
  spot: Spot;
  /** Strecke bis zum Spot in km, nie negativ. */
  distKm: number;
  /** Sekunden bis zum Spot bei der übergebenen Pace, null ohne Pace. */
  etaSec: number | null;
}

/**
 * Spots, die noch nicht passiert sind, nächster zuerst, höchstens `limit`.
 * `passed` kommt vom SpotTracker (tracker.passed), diese Funktion entscheidet "passiert" nie selbst.
 */
export function upcomingSpots(
  km: number,
  pace: number | null,
  spots: readonly Spot[],
  passed: (id: string) => boolean,
  limit = 3,
): UpcomingSpot[];
```

Regeln:
1. Spots, für die `passed(id)` wahr ist, fallen weg. Alle anderen bleiben, auch wenn ihr km kleiner als `km` ist.
2. `distKm = max(0, spot.km - km)`.
3. `etaSec = distKm * pace`, wenn `pace` eine Zahl größer 0 ist, sonst `null`.
4. Sortiert nach `spot.km` aufsteigend. Gleicher km: Reihenfolge wie in der Eingabe.
5. Höchstens `limit` Einträge. `limit` 0 gibt eine leere Liste.
6. Die Eingabe wird nicht verändert.

Kommentare im Stil der Nachbardateien (Englisch, knapp), Kopfkommentar mit Verweis auf `docs/decisions/2026-11-13-3d-konzept.md`.

## Erlaubte Dateien
- `src/lib/live/upcoming.ts` (neu)
- `tests/upcoming.test.ts` (neu)
- `docs/tasks/001-claude-als-naechstes.md`: Status und Ergebnis

## Prüfpunkt
Tests in `tests/upcoming.test.ts`, jeder Punkt ein eigener Fall:
1. Passierte Spots fehlen, auch wenn der Läufer nach einem Rücksprung wieder davor steht.
2. Ein nicht passierter Spot mit km kleiner als der Läufer bleibt drin, mit `distKm` 0 und `etaSec` 0.
3. Sortierung nach km bei unsortierter Eingabe, gleicher km behält die Eingabereihenfolge.
4. `limit` greift, Standard ist 3, `limit` 0 gibt `[]`.
5. ETA: bei km 10, Spot bei km 12,5 und Pace 300 s/km genau 750 s. Pace `null` und Pace 0 geben `null`.
6. Leere Spot-Liste gibt `[]`.
7. Eingabe-Array ist danach unverändert (gleiche Reihenfolge, gleiche Objekte).
8. Zusammenspiel mit dem echten `createSpotTracker`: Tracker bis km 5 laufen lassen, `upcomingSpots(5, 300, spots, tracker.passed)` enthält keinen Spot bis km 5.

Dazu grün: `npm run check` und `npm test` (alle Tests, nicht nur die neuen).

## Nicht Teil des Pakets
Anzeige im HUD oder auf `/dev/live`, Formatierung der Zeit (`fmtIn` in `src/lib/format.ts` gibt es schon), Glättung der Pace, Änderungen an `events.ts` oder `source.ts`.

## Rückfragen

## Ergebnis
Erledigt: `src/lib/live/upcoming.ts` mit `upcomingSpots` genau nach der Schnittstelle im Auftrag, `tests/upcoming.test.ts` mit den acht Prüfpunkten als je eigenem Fall.

Geprüft:
- Tests zuerst geschrieben, rot ohne Modul, danach grün: `npx vitest run tests/upcoming.test.ts` 8 von 8
- `npm test`: 23 Dateien, 261 Tests grün
- `npm run check`: 0 Fehler im Projekt. Die 12 gemeldeten Fehler liegen alle in `Claude outputs/` und `brag-output/`, die laut `AGENTS.md` nicht zum Projekt gehören

Umsetzung: `filter` kopiert die Eingabe, `sort` ist stabil, damit bleibt die Reihenfolge bei gleichem km und das Eingabe-Array unverändert. Pace gilt nur als Zahl größer 0, `NaN` gibt damit auch `null`.

Offen: Anzeige im HUD und auf `/dev/live` (nicht Teil des Pakets). Die Paketliste in `AGENTS.md` steht noch auf "offen", die Datei ist für dieses Paket nicht freigegeben.

Abweichungen: keine.

## Review
