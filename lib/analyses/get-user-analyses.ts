import { createAnalysesSupabaseClient } from "@/lib/supabase/analyses-client";

export type UserAnalysisSummary = {
  id: string;
  address: string;
  object_type: string;
  build_year: number;
  created_at: string;
};

export async function getUserAnalyses(
  userId: string,
): Promise<UserAnalysisSummary[]> {
  const supabase = createAnalysesSupabaseClient();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("analyses")
    .select("id, address, object_type, build_year, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[mina-analyser] fetch:", error.message);
    return [];
  }

  return (data ?? []) as UserAnalysisSummary[];
}
