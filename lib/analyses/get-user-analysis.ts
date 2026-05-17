import type { AnalysisResult } from "@/lib/analyse/parse-analysis-json";
import { createAnalysesSupabaseClient } from "@/lib/supabase/analyses-client";

export type UserAnalysisDetail = {
  id: string;
  address: string;
  object_type: string;
  build_year: number;
  created_at: string;
  result: AnalysisResult;
};

export async function getUserAnalysis(
  userId: string,
  analysisId: string,
): Promise<UserAnalysisDetail | null> {
  const supabase = createAnalysesSupabaseClient();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from("analyses")
    .select("id, address, object_type, build_year, created_at, result")
    .eq("id", analysisId)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    console.error("[mina-analyser] detail:", error.message);
    return null;
  }

  if (!data?.result) return null;

  return data as UserAnalysisDetail;
}
