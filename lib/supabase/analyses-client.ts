import { createClient } from "@supabase/supabase-js";

/** Server only. Krävs för analyses-tabellen (RLS, inga publika policies). */
export function createAnalysesSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !key) return null;

  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
