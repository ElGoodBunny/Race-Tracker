// Formatting helpers, ported from legacy/hamburg-2026.html. German locale, race timezone.

export const fmtKm = (k: number, d = 1) =>
  k.toLocaleString("de-DE", { minimumFractionDigits: d, maximumFractionDigits: d });

export function fmtDur(sec: number): string {
  const s = Math.max(0, Math.round(sec));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const x = s % 60;
  return h ? `${h}:${String(m).padStart(2, "0")}:${String(x).padStart(2, "0")}` : `${m}:${String(x).padStart(2, "0")}`;
}

export function fmtPace(secPerKm: number): string {
  const s = Math.round(secPerKm);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

export function fmtClock(ms: number, timeZone = "Europe/Berlin"): string {
  return new Intl.DateTimeFormat("de-DE", { timeZone, hour: "2-digit", minute: "2-digit" }).format(ms);
}

export function fmtDay(ms: number, timeZone = "Europe/Berlin"): string {
  return new Intl.DateTimeFormat("de-DE", { timeZone, weekday: "short", day: "2-digit", month: "2-digit" }).format(ms);
}

export function fmtIn(ms: number): string {
  const m = Math.round(ms / 60000);
  if (m <= 0) return "jetzt";
  if (m < 60) return `in ${m} min`;
  const h = Math.floor(m / 60);
  return `in ${h} h ${m % 60} min`;
}

export function fmtAgo(ms: number): string {
  const m = Math.round(ms / 60000);
  if (m < 1) return "gerade eben";
  if (m < 60) return `vor ${m} min`;
  return `vor ${Math.floor(m / 60)} h ${m % 60} min`;
}

/** "mm:ss" or "h:mm:ss" to seconds, null if invalid. */
export function parseDur(str: string): number | null {
  const p = String(str).trim().split(":").map((x) => x.trim());
  if (p.length < 2 || p.length > 3 || p.some((x) => !/^\d{1,2}$/.test(x))) return null;
  const n = p.map(Number);
  const s = p.length === 3 ? n[0] * 3600 + n[1] * 60 + n[2] : n[0] * 60 + n[1];
  return s > 0 ? s : null;
}

export function safeUrl(u: string): string | null {
  try {
    const x = new URL(u);
    return x.protocol === "https:" ? x.href : null;
  } catch {
    return null;
  }
}
