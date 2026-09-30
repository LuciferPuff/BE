import "server-only";

import { createAnalysesSupabaseClient } from "@/lib/supabase/analyses-client";

export type AdminStats = {
  profilesTotal: number;
  profilesLast7Days: number;
  profilesLast30Days: number;
  propertiesTotal: number;
  propertiesLast7Days: number;
  propertiesLast30Days: number;
  analysisRunsTotal: number;
  analysisRunsLast7Days: number;
  analysisCacheTotal: number;
  propertiesWithVerifiedParts: number;
  propertiesWithDocuments: number;
  propertiesWithLinkedAnalysis: number;
  propertiesShared: number;
  subscribersTotal: number;
  featureInterest: { feature: string; count: number }[];
  fetchedAt: string;
};

async function countExact(
  result: PromiseLike<{
    count: number | null;
    error: { message: string } | null;
  }>,
): Promise<number> {
  const { count, error } = await result;
  if (error) {
    console.error("[admin] count:", error.message);
    return 0;
  }
  return count ?? 0;
}

function sinceDays(days: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - days);
  return d.toISOString();
}

/** Aggregat för admin-överblick. Kräver service role. Anropa endast efter requireAdmin(). */
export async function getAdminStats(): Promise<AdminStats | null> {
  const supabase = createAnalysesSupabaseClient();
  if (!supabase) return null;

  const week = sinceDays(7);
  const month = sinceDays(30);

  const [
    profilesTotal,
    profilesLast7Days,
    profilesLast30Days,
    propertiesTotal,
    propertiesLast7Days,
    propertiesLast30Days,
    analysisRunsTotal,
    analysisRunsLast7Days,
    analysisCacheTotal,
    subscribersTotal,
  ] = await Promise.all([
    countExact(
      supabase.from("profiles").select("*", { count: "exact", head: true }),
    ),
    countExact(
      supabase
        .from("profiles")
        .select("*", { count: "exact", head: true })
        .gte("created_at", week),
    ),
    countExact(
      supabase
        .from("profiles")
        .select("*", { count: "exact", head: true })
        .gte("created_at", month),
    ),
    countExact(
      supabase.from("properties").select("*", { count: "exact", head: true }),
    ),
    countExact(
      supabase
        .from("properties")
        .select("*", { count: "exact", head: true })
        .gte("created_at", week),
    ),
    countExact(
      supabase
        .from("properties")
        .select("*", { count: "exact", head: true })
        .gte("created_at", month),
    ),
    countExact(
      supabase
        .from("user_analyses")
        .select("*", { count: "exact", head: true }),
    ),
    countExact(
      supabase
        .from("user_analyses")
        .select("*", { count: "exact", head: true })
        .gte("created_at", week),
    ),
    countExact(
      supabase
        .from("analysis_results")
        .select("*", { count: "exact", head: true }),
    ),
    countExact(
      supabase.from("subscribers").select("*", { count: "exact", head: true }),
    ),
  ]);

  const [
    partsRows,
    docsRows,
    linkedRows,
    memberRows,
    interestRows,
  ] = await Promise.all([
    supabase
      .from("property_parts")
      .select("property_id")
      .not("replaced_year", "is", null),
    supabase.from("property_documents").select("property_id"),
    supabase
      .from("user_analyses")
      .select("linked_property_id")
      .not("linked_property_id", "is", null),
    supabase.from("property_members").select("property_id"),
    supabase.from("feature_interest").select("feature"),
  ]);

  if (partsRows.error) {
    console.error("[admin] parts:", partsRows.error.message);
  }
  if (docsRows.error) {
    console.error("[admin] docs:", docsRows.error.message);
  }
  if (linkedRows.error) {
    console.error("[admin] linked:", linkedRows.error.message);
  }
  if (memberRows.error) {
    console.error("[admin] members:", memberRows.error.message);
  }
  if (interestRows.error) {
    console.error("[admin] interest:", interestRows.error.message);
  }

  const propertiesWithVerifiedParts = new Set(
    (partsRows.data ?? []).map((r) => r.property_id as string),
  ).size;
  const propertiesWithDocuments = new Set(
    (docsRows.data ?? []).map((r) => r.property_id as string),
  ).size;
  const propertiesWithLinkedAnalysis = new Set(
    (linkedRows.data ?? []).map((r) => r.linked_property_id as string),
  ).size;

  const memberCounts = new Map<string, number>();
  for (const row of memberRows.data ?? []) {
    const id = row.property_id as string;
    memberCounts.set(id, (memberCounts.get(id) ?? 0) + 1);
  }
  let propertiesShared = 0;
  for (const n of memberCounts.values()) {
    if (n > 1) propertiesShared += 1;
  }

  const interestMap = new Map<string, number>();
  for (const row of interestRows.data ?? []) {
    const feature = String(row.feature ?? "okänd");
    interestMap.set(feature, (interestMap.get(feature) ?? 0) + 1);
  }
  const featureInterest = [...interestMap.entries()]
    .map(([feature, count]) => ({ feature, count }))
    .sort((a, b) => b.count - a.count);

  return {
    profilesTotal,
    profilesLast7Days,
    profilesLast30Days,
    propertiesTotal,
    propertiesLast7Days,
    propertiesLast30Days,
    analysisRunsTotal,
    analysisRunsLast7Days,
    analysisCacheTotal,
    propertiesWithVerifiedParts,
    propertiesWithDocuments,
    propertiesWithLinkedAnalysis,
    propertiesShared,
    subscribersTotal,
    featureInterest,
    fetchedAt: new Date().toISOString(),
  };
}
