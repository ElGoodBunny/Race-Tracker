# Gemini im Race Tracker

Lies zuerst `AGENTS.md`, dann `CLAUDE.md`. Dort steht, wer was macht, in welchem Ordner du arbeitest und welche Regeln für alle gelten. Deine Pakete erkennst du in `docs/tasks/` an `Besitzer: gemini`.

## Modell
Gearbeitet wird mit Gemini 3.8 Flash. Andere Modelle in Antigravity werden für dieses Repo nicht genutzt, damit Claudes Review ein Blick von außen bleibt.

## Sichtprüfung
- In deinem Ordner `npm run dev` starten und die Adresse nehmen, die ausgegeben wird.
- Größen: Desktop 1280 × 900, Handy 390 × 844.
- Hell und dunkel: über die Emulation von `prefers-color-scheme` im Browser umschalten. Geht das nicht, schreib, wie du es gemacht hast.
- Die Dev-Seiten haben Hooks am `window` zum Steuern (`__live` auf `/dev/live`, `__view3d` auf `/dev/view3d`). Das Paket sagt, welche du brauchst.
- Screenshots als JPEG, Qualität 80, höchstens 1200 px breit. Dateinamen sprechend, zum Beispiel `km12-folgen-hell.jpg`.
- Beschreib zu jedem Bild, was du siehst, und vergleiche konkret mit dem Referenzbild: Farbe, Breite, Größe, was fehlt, was zusätzlich da ist. "Sieht gut aus" reicht nicht. Die Bewertung macht Claude im Review.
- Fehler in der Browser-Konsole wörtlich ins Ergebnis.
- Verlangt etwas eine Entscheidung über Code oder Design: nicht selbst lösen, sondern dokumentieren.
