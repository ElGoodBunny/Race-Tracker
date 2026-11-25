# Turnstile als CAPTCHA, Ausnahme vom Selbsthosten (25.11.2026)

## Frage
Gegen massenhaft angelegte anonyme Konten braucht die Anmeldung ein CAPTCHA (`docs/decisions/2026-11-12-architektur.md`, Punkt 2). Supabase prüft dafür hCaptcha oder Cloudflare Turnstile. Beide laden ihr Skript vom Anbieter. `CLAUDE.md` verlangt aber, Fonts und Libraries selbst zu hosten.

## Entscheidung
Turnstile, als einzige Ausnahme vom Selbsthosten. Dima hat am 25.11. zugestimmt.

## Begründung
- Ein CAPTCHA lässt sich nicht selbst hosten. Die Prüfung lebt davon, dass der Anbieter das Skript ausliefert und das Token gegenprüft
- Die Seite läuft schon bei Cloudflare, es kommt kein neuer Anbieter dazu. Turnstile setzt keine Tracking-Cookies und zeigt in den meisten Fällen kein Bilderrätsel
- Das Skript lädt erst, wenn jemand zum ersten Mal schreibt. Wer nur zuschaut, nimmt keine Verbindung zu `challenges.cloudflare.com` auf
- hCaptcha hätte dieselbe Ausnahme gebraucht, mit einem zusätzlichen Anbieter

## Folgen
- Das Widget `race-tracker` im Cloudflare-Konto erlaubt `dmitrij-helmer.workers.dev` mit allen Subdomains und `localhost`. Bei einer eigenen Domain muss sie dort ergänzt werden
- Der Site Key ist öffentlich (`PUBLIC_TURNSTILE_SITE_KEY`), der Secret Key steht nur im Supabase-Dashboard
- Die Datenschutzerklärung muss Turnstile nennen, sobald es eine gibt
