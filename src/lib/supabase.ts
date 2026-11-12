import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// Browser client. Returns null when env vars are missing, so the static page
// still renders (course, map, simulation) without a backend.
let client: SupabaseClient | null | undefined;

export function getSupabase(): SupabaseClient | null {
  if (client !== undefined) return client;
  const url = import.meta.env.PUBLIC_SUPABASE_URL;
  const key = import.meta.env.PUBLIC_SUPABASE_ANON_KEY;
  client = url && key ? createClient(url, key) : null;
  return client;
}
