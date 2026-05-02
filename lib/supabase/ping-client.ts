import { createClient } from "@supabase/supabase-js";

/**
 * Supabase-klient för /api/ping (server only).
 * COUNT på subscribers kräver service role (anon har inte SELECT på tabellen).
 */
export function createPingSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !serviceKey) return null;

  return createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
