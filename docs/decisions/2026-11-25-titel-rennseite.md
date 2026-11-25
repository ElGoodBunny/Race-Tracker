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
- Browsertitel "Race Tracker", H1 "Rennen live verfolgen", Unterzeile ohne Ich-Form
- Grund: Der Tracker soll später auch für Freunde laufen und vielleicht als App beworben werden. Ein persönlicher Titel wie "Dima läuft" passt dann nicht mehr
- "Race Tracker" ist eine Beschreibung, kein Markenname. Einen Namen gibt es noch nicht. Vor jeder Werbung Name, Marke und Domain festlegen

## Nachtrag: Linkvorschau
- `og:title` der Rennseite nennt den Läufer: vor dem Start und live "{runner} läuft beim {title}", im Ziel "{runner} im Ziel beim {title}". Seitentitel und H1 bleiben der Rennname
- Grund: Im Gruppenchat erkennt man den Link am Namen. Die Vorschau wird gebaut, nicht live erzeugt. Wechselt der Status, muss die Seite neu gebaut werden, und WhatsApp zeigt eine alte Vorschau eventuell weiter an
- "beim" passt zu Rennnamen auf Marathon, Halbmarathon oder Lauf. Bei anderen Namen (etwa "die Tour") neu formulieren
