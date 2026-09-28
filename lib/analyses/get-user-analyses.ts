import { createAuthClient } from "@/lib/supabase/auth-client";
import type { AnalysisResult } from "@/lib/analyse/parse-analysis-json";

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
  const supabase = await createAuthClient();

  const { data, error } = await supabase
    .from("user_analyses")
    .select("id, address, object_type, build_year, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[mina-analyser] fetch:", error.message);
    return [];
  }

  return (data ?? []) as UserAnalysisSummary[];
}

export type UserAnalysisDetail = {
  id: string;
  address: string;
  object_type: string;
  build_year: number;
  created_at: string;
  linked_property_id: string | null;
  result: AnalysisResult;
};

export async function getUserAnalysis(
  userId: string,
  analysisId: string,
): Promise<UserAnalysisDetail | null> {
  const supabase = await createAuthClient();

  const { data, error } = await supabase
    .from("user_analyses")
    .select(
      "id, address, object_type, build_year, created_at, linked_property_id, analysis_results(result)",
    )
    .eq("id", analysisId)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    console.error("[mina-analyser] detail:", error.message);
    return null;
  }

  if (!data) return null;

  const embedded = data.analysis_results as
    | { result: AnalysisResult }
    | { result: AnalysisResult }[]
    | null;
  const row = Array.isArray(embedded) ? embedded[0] : embedded;
  if (!row?.result) return null;

  return {
    id: data.id as string,
    address: data.address as string,
    object_type: data.object_type as string,
    build_year: data.build_year as number,
    created_at: data.created_at as string,
    linked_property_id: (data.linked_property_id as string | null) ?? null,
    result: row.result,
  };
}
