// Guests and the pinboard (docs/tasks/024-claude-pinnwand-gast.md).
// Reading needs no account. The anonymous sign-in happens on the first write, together with the name
// (docs/decisions/2026-11-12-architektur.md, point 2). Author name and id are set by the database, never by the client.
import type { SupabaseClient } from "@supabase/supabase-js";
import { errorText } from "./errors";
import { fmtKm } from "../format";
import type { LiveState } from "./supabase";

/** Same limits as the checks on profiles.display_name and messages.body. */
export const NAME_MAX = 30;
export const BODY_MAX = 200;
/** Quick messages from the legacy page. */
export const QUICK = ["Lauf, Dima!", "Du fliegst!", "Wir warten an der Strecke", "Durchziehen, fast geschafft!"];

export interface Guest {
  id: string;
  /** null: signed in, but the name was never saved. */
  name: string | null;
}
type Result = { error?: string };

export function checkName(raw: string): { name: string } | { error: string } {
  const name = raw.trim();
  if (!name) return { error: "Gib deinen Namen ein." };
  if (name.length > NAME_MAX) return { error: `Höchstens ${NAME_MAX} Zeichen.` };
  return { name };
}

/** null: nothing to send. Longer text is cut like in the legacy page. */
export function checkBody(raw: string): string | null {
  const body = raw.trim();
  return body ? body.slice(0, BODY_MAX) : null;
}

/** The guest of an existing session. Never signs in. */
export async function loadGuest(client: SupabaseClient): Promise<Guest | null> {
  const { data } = await client.auth.getSession();
  const id = data.session?.user.id;
  if (!id) return null;
  const { data: row } = await client.from("profiles").select("display_name").eq("id", id).maybeSingle();
  return { id, name: (row as { display_name?: string } | null)?.display_name ?? null };
}

/** Signs in anonymously if there is no session yet, then saves the name. */
export async function becomeGuest(client: SupabaseClient, name: string, captchaToken?: string): Promise<{ guest: Guest } | { error: string }> {
  const { data } = await client.auth.getSession();
  let id = data.session?.user.id;
  if (!id) {
    const res = await client.auth.signInAnonymously(captchaToken ? { options: { captchaToken } } : undefined);
    if (res.error || !res.data.session) return { error: errorText(res.error) };
    id = res.data.session.user.id;
  }
  const { error } = await client.from("profiles").upsert({ id, display_name: name });
  if (error) return { error: errorText(error) };
  return { guest: { id, name } };
}

export async function postMessage(client: SupabaseClient, slug: string, body: string): Promise<Result> {
  const { error } = await client.from("messages").insert({ race_slug: slug, body });
  return error ? { error: errorText(error) } : {};
}

export async function deleteMessage(client: SupabaseClient, id: string): Promise<Result> {
  const { error } = await client.from("messages").delete().eq("id", id);
  return error ? { error: errorText(error) } : {};
}

export interface FeedItem {
  id: string;
  kind: "msg" | "seen";
  name: string;
  at: number;
  text: string;
  mine: boolean;
}

/** Messages and sightings, newest first. Official splits belong in the split table, not here. */
export function feed(state: LiveState, me: string | null): FeedItem[] {
  const msgs: FeedItem[] = state.messages.map((m) => ({ id: m.id, kind: "msg", name: m.author_name, at: Date.parse(m.created_at), text: m.body, mine: !!me && m.created_by === me }));
  const seen: FeedItem[] = state.checkpoints
    .filter((c) => c.src === "seen")
    .map((c) => ({ id: c.id, kind: "seen", name: c.author_name, at: Date.parse(c.seen_at ?? c.created_at), text: `Gesehen bei km ${fmtKm(c.km)}`, mine: !!me && c.created_by === me }));
  return [...msgs, ...seen].sort((a, b) => b.at - a.at);
}
