// Texts for failed writes (docs/tasks/019-claude-fehlertexte.md). Errors as supabase-js reports them:
// PostgREST errors carry the Postgres code and message, network failures are a TypeError from fetch.
import { describe, expect, it } from "vitest";
import { errorText } from "../src/lib/live/errors";

const pg = (code: string, message: string) => ({ code, message, details: null, hint: null });

describe("errorText", () => {
  it("Rate Limit wie im Legacy", () => {
    expect(errorText(pg("P0001", "rate limit exceeded"))).toBe("Zu viele Aktionen auf einmal. Kurz warten.");
  });

  it("keine Rechte: Funktion verweigert oder RLS lehnt die Zeile ab", () => {
    const text = "Du hast hier nur Leserechte.";
    expect(errorText(pg("42501", "permission denied for official splits"))).toBe(text);
    expect(errorText(pg("42501", 'new row violates row-level security policy for table "spots"'))).toBe(text);
  });

  it("offline: fetch scheitert oder der Browser meldet kein Netz", () => {
    const text = "Keine Verbindung. Versuch es nochmal, wenn du wieder Netz hast.";
    expect(errorText(new TypeError("Failed to fetch"))).toBe(text);
    expect(errorText({ message: "TypeError: Load failed", code: "" })).toBe(text);
    expect(errorText(pg("P0001", "rate limit exceeded"), { online: false })).toBe(text);
  });

  it("Fälle aus der Phase-1-Migration", () => {
    expect(errorText(pg("P0001", "profile required"))).toBe("Setz zuerst deinen Namen.");
    expect(errorText(pg("P0001", "spot limit reached"))).toBe("Mehr als 3 Spots gehen nicht. Lösch einen, dann klappt es.");
    expect(errorText(pg("23514", "km beyond race distance"))).toBe("Dieser Punkt liegt hinter dem Ziel.");
    expect(errorText(pg("22023", "livetrack link not allowed"))).toBe("Nur Links von livetrack.garmin.com.");
  });

  it("anonyme Anmeldung: CAPTCHA abgelehnt oder in Supabase abgeschaltet", () => {
    expect(errorText({ code: "captcha_failed", message: "captcha protection: request disallowed (no captcha response)" })).toBe("Die Prüfung gegen Bots hat nicht geklappt. Bitte nochmal versuchen.");
    expect(errorText({ code: "anonymous_provider_disabled", message: "Anonymous sign-ins are disabled" })).toBe("Mitschreiben ist gerade abgeschaltet.");
  });

  it("alles andere: allgemeiner Text aus dem Legacy", () => {
    const text = "Speichern hat nicht geklappt. Bitte nochmal versuchen.";
    expect(errorText(pg("23514", 'new row for relation "spots" violates check constraint "spots_name_check"'))).toBe(text);
    expect(errorText(undefined)).toBe(text);
    expect(errorText("kaputt")).toBe(text);
  });

  it("kein Text hat ein Ausrufezeichen oder einen Gedankenstrich", () => {
    const all = [pg("P0001", "rate limit exceeded"), pg("42501", "x"), new TypeError("Failed to fetch"), pg("P0001", "profile required"), pg("P0001", "spot limit reached"), pg("23514", "km beyond race distance"), pg("22023", "livetrack link not allowed"), null].map((e) => errorText(e));
    for (const t of all) expect(t).not.toMatch(/[!–—]| - /);
  });
});
