import { createClient } from "@supabase/supabase-js";

export function getSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabasePublishable = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE;

  if (!supabaseUrl || !supabasePublishable) {
    return null;
  }

  return createClient(supabaseUrl, supabasePublishable);
}
