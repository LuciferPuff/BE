import "server-only";

import { createAuthClient } from "@/lib/supabase/auth-client";

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

type RpcPayload = {
  profilesTotal?: number;
  profilesLast7Days?: number;
  profilesLast30Days?: number;
  propertiesTotal?: number;
  propertiesLast7Days?: number;
  propertiesLast30Days?: number;
  analysisRunsTotal?: number;
  analysisRunsLast7Days?: number;
  analysisCacheTotal?: number;
  propertiesWithVerifiedParts?: number;
  propertiesWithDocuments?: number;
  propertiesWithLinkedAnalysis?: number;
  propertiesShared?: number;
  subscribersTotal?: number;
  featureInterest?: { feature?: string; count?: number }[];
  fetchedAt?: string;
};

function num(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

/** En RPC-runda. Anropa endast efter requireAdmin(). */
export async function getAdminStats(): Promise<AdminStats | null> {
  const supabase = await createAuthClient();
  const { data, error } = await supabase.rpc("get_admin_dashboard_stats");

  if (error) {
    console.error("[admin] get_admin_dashboard_stats:", error.message);
    return null;
  }

  const payload = (data ?? {}) as RpcPayload;
  const featureInterest = (payload.featureInterest ?? [])
    .map((row) => ({
      feature: String(row.feature ?? "okänd"),
      count: num(row.count),
    }))
    .filter((row) => row.count > 0);

  return {
    profilesTotal: num(payload.profilesTotal),
    profilesLast7Days: num(payload.profilesLast7Days),
    profilesLast30Days: num(payload.profilesLast30Days),
    propertiesTotal: num(payload.propertiesTotal),
    propertiesLast7Days: num(payload.propertiesLast7Days),
    propertiesLast30Days: num(payload.propertiesLast30Days),
    analysisRunsTotal: num(payload.analysisRunsTotal),
    analysisRunsLast7Days: num(payload.analysisRunsLast7Days),
    analysisCacheTotal: num(payload.analysisCacheTotal),
    propertiesWithVerifiedParts: num(payload.propertiesWithVerifiedParts),
    propertiesWithDocuments: num(payload.propertiesWithDocuments),
    propertiesWithLinkedAnalysis: num(payload.propertiesWithLinkedAnalysis),
    propertiesShared: num(payload.propertiesShared),
    subscribersTotal: num(payload.subscribersTotal),
    featureInterest,
    fetchedAt:
      typeof payload.fetchedAt === "string"
        ? payload.fetchedAt
        : new Date().toISOString(),
  };
}
