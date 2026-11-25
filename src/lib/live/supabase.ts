// Live data of one race from Supabase: race row, spots, pinboard, checkpoints, kept current by Realtime
// (docs/tasks/018-claude-datenschicht.md). Reads only. Security comes from RLS, nothing here checks rights.
import type { RealtimeChannel, SupabaseClient } from "@supabase/supabase-js";

export interface RaceRow {
  slug: string;
  runner_name: string;
  planned_start: string | null;
  actual_start: string | null;
  finished_at: string | null;
  target_sec: number | null;
  bib: string | null;
  start_block: string | null;
  distance_km: number;
  updated_at: string;
}
export interface SpotRow {
  id: string;
  race_slug: string;
  name: string;
  km: number;
  author_name: string;
  created_by: string | null;
  created_at: string;
}
export interface MessageRow {
  id: string;
  race_slug: string;
  body: string;
  km: number | null;
  author_name: string;
  created_by: string | null;
  created_at: string;
}
export interface CheckpointRow {
  id: string;
  race_slug: string;
  km: number;
  src: "official" | "seen";
  net_sec: number | null;
  seen_at: string | null;
  author_name: string;
  created_by: string | null;
  created_at: string;
}
export interface LiveState {
  race: RaceRow | null;
  spots: SpotRow[];
  /** Newest first, at most MESSAGE_LIMIT. */
  messages: MessageRow[];
  checkpoints: CheckpointRow[];
  /** "offline": the channel dropped or loading failed, the data is the last known. */
  status: "loading" | "live" | "offline";
}
type Table = "races" | "spots" | "messages" | "checkpoints";
export interface Change {
  table: Table;
  eventType: "INSERT" | "UPDATE" | "DELETE";
  new: Record<string, unknown>;
  /** On DELETE only the primary key, Realtime sends no more without replica identity full. */
  old: Record<string, unknown>;
}

/** Pinboard length, as in the legacy page. */
export const MESSAGE_LIMIT = 120;

// Explicit columns: a new column does not reach the page until it is listed here.
const COLUMNS: Record<Table, string> = {
  races: "slug, runner_name, planned_start, actual_start, finished_at, target_sec, bib, start_block, distance_km, updated_at",
  spots: "id, race_slug, name, km, author_name, created_by, created_at",
  messages: "id, race_slug, body, km, author_name, created_by, created_at",
  checkpoints: "id, race_slug, km, src, net_sec, seen_at, author_name, created_by, created_at",
};

export const emptyState = (): LiveState => ({ race: null, spots: [], messages: [], checkpoints: [], status: "loading" });

/** Postgres numeric can arrive as text, the page computes with numbers. */
const num = (v: unknown) => (v == null ? null : Number(v));
const race = (r: Record<string, unknown>) => ({ ...r, distance_km: Number(r.distance_km) }) as unknown as RaceRow;
const spot = (r: Record<string, unknown>) => ({ ...r, km: Number(r.km) }) as unknown as SpotRow;
const message = (r: Record<string, unknown>) => ({ ...r, km: num(r.km) }) as unknown as MessageRow;
const checkpoint = (r: Record<string, unknown>) => ({ ...r, km: Number(r.km) }) as unknown as CheckpointRow;

const byKm = <T extends { km: number; created_at: string; id: string }>(a: T, b: T) => a.km - b.km || a.created_at.localeCompare(b.created_at) || a.id.localeCompare(b.id);
const newestFirst = (a: MessageRow, b: MessageRow) => b.created_at.localeCompare(a.created_at) || b.id.localeCompare(a.id);

/** Insert or replace by id, or remove. Rows of another race are ignored. */
function upsert<T extends { id: string; race_slug: string }>(list: T[], c: Change, slug: string, make: (r: Record<string, unknown>) => T): T[] {
  if (c.eventType === "DELETE") return list.filter((x) => x.id !== c.old.id);
  const row = make(c.new);
  if (row.race_slug !== slug) return list;
  return [...list.filter((x) => x.id !== row.id), row];
}

/** One Realtime change into the state. Pure, so the order of events and doubles can be tested. */
export function applyChange(state: LiveState, slug: string, c: Change): LiveState {
  switch (c.table) {
    case "races":
      if (c.eventType === "DELETE") return c.old.slug === slug ? { ...state, race: null } : state;
      return c.new.slug === slug ? { ...state, race: race(c.new) } : state;
    case "spots":
      return { ...state, spots: upsert(state.spots, c, slug, spot).sort(byKm) };
    case "messages":
      return { ...state, messages: upsert(state.messages, c, slug, message).sort(newestFirst).slice(0, MESSAGE_LIMIT) };
    case "checkpoints":
      return { ...state, checkpoints: upsert(state.checkpoints, c, slug, checkpoint).sort(byKm) };
  }
}

async function load(client: SupabaseClient, slug: string): Promise<Omit<LiveState, "status">> {
  const [r, s, m, c] = await Promise.all([
    client.from("races").select(COLUMNS.races).eq("slug", slug).maybeSingle(),
    client.from("spots").select(COLUMNS.spots).eq("race_slug", slug),
    client.from("messages").select(COLUMNS.messages).eq("race_slug", slug).order("created_at", { ascending: false }).limit(MESSAGE_LIMIT),
    client.from("checkpoints").select(COLUMNS.checkpoints).eq("race_slug", slug),
  ]);
  const error = r.error ?? s.error ?? m.error ?? c.error;
  if (error) throw error;
  const rows = (d: unknown) => (d ?? []) as Record<string, unknown>[];
  return {
    race: r.data ? race(r.data as unknown as Record<string, unknown>) : null,
    spots: rows(s.data).map(spot).sort(byKm),
    messages: rows(m.data).map(message).sort(newestFirst),
    checkpoints: rows(c.data).map(checkpoint).sort(byKm),
  };
}

/**
 * Loads the race and follows its changes. onState gets a new state object on every change.
 * Loading starts once the channel is subscribed and again after every reconnect, so nothing missed while offline
 * stays missing. Changes that arrive while loading are applied on top of the loaded rows.
 * Returns the function that stops it.
 */
export function subscribeRace(client: SupabaseClient, slug: string, onState: (s: LiveState) => void): () => void {
  let state = emptyState();
  let stopped = false;
  let loading = 0;
  let pending: Change[] = [];
  const emit = (next: LiveState) => {
    state = next;
    if (!stopped) onState(state);
  };
  const onChange = (c: Change) => {
    if (stopped) return;
    if (loading) pending.push(c);
    else emit(applyChange(state, slug, c));
  };

  async function reload() {
    const run = ++loading;
    pending = [];
    try {
      const rows = await load(client, slug);
      if (run !== loading || stopped) return;
      let next: LiveState = { ...rows, status: "live" };
      for (const c of pending) next = applyChange(next, slug, c);
      loading = 0;
      pending = [];
      emit(next);
    } catch {
      if (run !== loading || stopped) return;
      loading = 0;
      pending = [];
      emit({ ...state, status: "offline" });
    }
  }

  let channel: RealtimeChannel = client.channel(`race:${slug}`);
  for (const table of ["races", "spots", "messages", "checkpoints"] as const) {
    const filter = table === "races" ? `slug=eq.${slug}` : `race_slug=eq.${slug}`;
    channel = channel.on("postgres_changes" as never, { event: "*", schema: "public", table, filter }, (p: Change) => onChange({ table, eventType: p.eventType, new: p.new ?? {}, old: p.old ?? {} }));
    // Realtime cannot filter DELETE: it carries only the key, so the filter above never matches one. Without a filter
    // deletes of every race arrive, applyChange drops the ids this race does not have (docs/tasks/025-claude-spots.md).
    if (table !== "races") channel = channel.on("postgres_changes" as never, { event: "DELETE", schema: "public", table }, (p: Change) => onChange({ table, eventType: "DELETE", new: {}, old: p.old ?? {} }));
  }
  channel.subscribe((status: string) => {
    if (stopped) return;
    if (status === "SUBSCRIBED") reload();
    else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT" || status === "CLOSED") emit({ ...state, status: "offline" });
  });
  onState(state);

  return () => {
    stopped = true;
    client.removeChannel(channel);
  };
}
