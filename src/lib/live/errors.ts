// Text for a failed write, shown at the field or as a toast (docs/tasks/019-claude-fehlertexte.md).
// Rate limit, read only and the fallback come word for word from legacy/hamburg-2026.html, the rest from the
// exceptions in supabase/migrations. Matched on code and message, the hints in the database are not shown.

const OFFLINE = "Keine Verbindung. Versuch es nochmal, wenn du wieder Netz hast.";
const FALLBACK = "Speichern hat nicht geklappt. Bitte nochmal versuchen.";

/** Postgres code plus the message of the exception that raises it. */
const KNOWN: [code: string, message: RegExp, text: string][] = [
  ["P0001", /rate limit exceeded/, "Zu viele Aktionen auf einmal. Kurz warten."],
  ["P0001", /profile required/, "Setz zuerst deinen Namen."],
  ["P0001", /spot limit reached/, "Mehr als 3 Spots gehen nicht. Lösch einen, dann klappt es."],
  ["23514", /km beyond race distance/, "Dieser Punkt liegt hinter dem Ziel."],
  ["22023", /livetrack link not allowed/, "Nur Links von livetrack.garmin.com."],
  // Functions that refuse and RLS that rejects a row both report 42501.
  ["42501", /./, "Du hast hier nur Leserechte."],
];

/**
 * @param online Whether the browser has a network, navigator.onLine by default (Node has no onLine, that counts as online). Without one every error is "offline".
 */
export function errorText(error: unknown, { online = typeof navigator === "undefined" || navigator.onLine !== false } = {}): string {
  if (!online) return OFFLINE;
  if (!error || typeof error !== "object") return FALLBACK;
  const { code, message } = error as { code?: unknown; message?: unknown };
  const msg = typeof message === "string" ? message : "";
  // fetch rejects with a TypeError, supabase-js passes it on as the message: "Failed to fetch" (Chrome), "Load failed" (Safari),
  // "NetworkError when attempting to fetch resource" (Firefox).
  if (error instanceof TypeError || /Failed to fetch|Load failed|NetworkError/.test(msg)) return OFFLINE;
  const hit = KNOWN.find(([c, m]) => c === code && m.test(msg));
  return hit ? hit[2] : FALLBACK;
}
