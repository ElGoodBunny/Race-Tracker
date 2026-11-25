# Titel der Rennseite (25.11.2026)

## Entscheidung
Seitentitel und H1 einer Rennseite sind nur der Name des Rennens, so wie er in `title` der Renndaten steht (z. B. "hella hamburg halbmarathon 2026"). Kein "Dima läuft" davor.

## Warum
- "Dima läuft {Stadt}" stammt aus dem Namen des alten Artifacts und wurde beim Port 1:1 übernommen, nie bewusst entschieden
- "läuft" stimmt nur während des Rennens, nicht davor und nicht im Ziel
- Der Renname passt in jeder Phase und ist eindeutig, auch bei zwei Rennen in derselben Stadt

## Folgen
- Die Unterzeile wiederholt den Namen nicht mehr, sie zeigt nur Datum und Startzeit
- Die Startseite ist im Nachtrag unten geregelt
- Branches mit "Dima läuft in {Stadt}" (seit b1615b7) bekommen an dieser Zeile einen Konflikt. Beim Mergen gilt diese Entscheidung

## Nachtrag: Startseite
- Browsertitel "PibeRuns Race Tracker", H1 "Rennen live verfolgen", Unterzeile ohne Ich-Form
- Grund: Der Tracker soll später auch für Freunde laufen und vielleicht als App beworben werden. Ein persönlicher Titel wie "Dima läuft" passt dann nicht mehr
- "PibeRuns" ist ein Arbeitsname. Vor jeder Werbung Marken und Domain prüfen
