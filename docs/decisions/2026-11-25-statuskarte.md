# Statuskarte unter der 3D-Ansicht (25.11.2026)

## Frage
Im Legacy stand die Statuskarte "Wo ist Dima?" rechts neben der Karte, 380 px breit und mitlaufend (`docs/DESIGN.md`, Seitenaufbau Punkt 3). Auf der Rennseite steht dort jetzt die 3D-Ansicht über die volle Breite mit eigenem HUD und Panel.

## Entscheidung
- Die Karte steht als eigener Block direkt unter der 3D-Ansicht in `#live`, über die volle Breite in zwei Spalten. Am Handy steht sie vor der 3D-Ansicht, wie es `docs/DESIGN.md` verlangt
- Sie zeigt die Schätzung aus Supabase (`raceEstimate`), nicht die Werte der 3D-Ansicht. Deshalb heißt die Phase "Live · geschätzt" und die Zeile darunter nennt die Grundlage
- Der Gesehen-Button (Paket 026) wandert in die Karte, wie im Legacy

## Begründung
- Neben der 3D-Ansicht kostet eine Spalte von 380 px ein Drittel der Breite, die Ansicht ist der Hauptinhalt der Seite (`docs/VISION.md`)
- Die 3D-Ansicht läuft bis Phase 2b auf der Aufzeichnung (Hamburg) oder einem Probelauf mit diesen Daten (Barcelona) und sagt das selbst. Ihre km stimmen deshalb nicht mit der Schätzung überein. Beides zu einer Quelle zu machen ist Arbeit für Phase 2b (Poller und Client), nicht für die Statuskarte

## Folgen
- Bis Phase 2b zeigt die Seite zwei verschiedene km: oben die Aufzeichnung, darunter die Schätzung. Die Beschriftungen "Aufzeichnung vom Renntag" und "Live · geschätzt" machen das sichtbar
- Mit Phase 2b neu prüfen, ob die Karte in das Panel der 3D-Ansicht aufgeht
