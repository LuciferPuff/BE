import type { SupabaseClient } from "@supabase/supabase-js";

export async function fetchAnalysisUserId(
  supabase: SupabaseClient,
  analysisId: string,
): Promise<string | null> {
  const { data, error } = await supabase
    .from("analyses")
    .select("user_id")
    .eq("id", analysisId)
    .maybeSingle();

  if (error) {
    console.error("[analyses] read user_id:", error.message);
    return null;
  }

  return data?.user_id ?? null;
}
