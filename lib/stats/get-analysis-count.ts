import { createAnalysesSupabaseClient } from "@/lib/supabase/analyses-client";

/** Antal sparade användaranalyser (körningar). null vid fel eller saknad konfiguration. */
export async function getAnalysisCount(): Promise<number | null> {
  const supabase = createAnalysesSupabaseClient();
  if (!supabase) return null;

  const { count, error } = await supabase
    .from("user_analyses")
    .select("*", { count: "exact", head: true });

  if (error) return null;
  return count;
}
