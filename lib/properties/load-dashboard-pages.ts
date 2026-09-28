import { DASHBOARD_PAGE_SIZE } from "@/lib/properties/dashboard-limits";
import {
  buildDashboardTimeline,
  takePage,
  type DashboardDocument,
  type DashboardEvent,
  type DashboardLinkedAnalysis,
  type DashboardTimelineItem,
} from "@/lib/properties/get-property-dashboard";
import { createAuthClient } from "@/lib/supabase/auth-client";

async function assertPropertyMember(
  propertyId: string,
  userId: string,
): Promise<boolean> {
  const supabase = await createAuthClient();
  const { data } = await supabase
    .from("property_members")
    .select("role")
    .eq("property_id", propertyId)
    .eq("user_id", userId)
    .maybeSingle();
  return Boolean(data);
}

export async function loadMoreAnalysesPage(
  propertyId: string,
  userId: string,
  offset: number,
): Promise<{ items: DashboardLinkedAnalysis[]; hasMore: boolean } | null> {
  if (!(await assertPropertyMember(propertyId, userId))) return null;
  const supabase = await createAuthClient();
  const { data, error } = await supabase
    .from("analyses")
    .select("id, address, created_at")
    .eq("linked_property_id", propertyId)
    .order("created_at", { ascending: false })
    .range(offset, offset + DASHBOARD_PAGE_SIZE);

  if (error) {
    console.error("[profil] load more analyses:", error.message);
    return { items: [], hasMore: false };
  }

  return takePage(
    (data ?? []).map((a) => ({
      id: a.id as string,
      address: a.address as string,
      created_at: a.created_at as string,
    })),
  );
}

export async function loadMoreDocumentsPage(
  propertyId: string,
  userId: string,
  offset: number,
): Promise<{ items: DashboardDocument[]; hasMore: boolean } | null> {
  if (!(await assertPropertyMember(propertyId, userId))) return null;
  const supabase = await createAuthClient();
  const { data, error } = await supabase
    .from("property_documents")
    .select("id, type, file_path, note, uploaded_at")
    .eq("property_id", propertyId)
    .order("uploaded_at", { ascending: false })
    .range(offset, offset + DASHBOARD_PAGE_SIZE);

  if (error) {
    console.error("[profil] load more documents:", error.message);
    return { items: [], hasMore: false };
  }

  return takePage(
    (data ?? []).map((d) => ({
      id: d.id as string,
      type: d.type as string,
      file_path: d.file_path as string,
      note: (d.note as string | null) ?? null,
      uploaded_at: d.uploaded_at as string,
    })),
  );
}

export async function loadMoreEventsPage(
  propertyId: string,
  userId: string,
  offset: number,
): Promise<{ items: DashboardEvent[]; hasMore: boolean } | null> {
  if (!(await assertPropertyMember(propertyId, userId))) return null;
  const supabase = await createAuthClient();
  const { data, error } = await supabase
    .from("property_events")
    .select("id, event_type, event_date, description, cost")
    .eq("property_id", propertyId)
    .order("event_date", { ascending: false })
    .range(offset, offset + DASHBOARD_PAGE_SIZE);

  if (error) {
    console.error("[profil] load more events:", error.message);
    return { items: [], hasMore: false };
  }

  return takePage(
    (data ?? []).map((e) => ({
      id: e.id as string,
      event_type: e.event_type as string,
      event_date: e.event_date as string,
      description: (e.description as string | null) ?? null,
      cost: e.cost != null ? Number(e.cost) : null,
    })),
  );
}

/**
 * Loads the next page of analyses, documents and events and returns only
 * timeline items that are new relative to `knownKeys`.
 */
export async function loadMoreTimelinePage(
  propertyId: string,
  userId: string,
  offsets: { analyses: number; documents: number; events: number },
  knownKeys: string[],
  createdAt: string,
): Promise<{
  items: DashboardTimelineItem[];
  hasMore: boolean;
  nextOffsets: { analyses: number; documents: number; events: number };
} | null> {
  if (!(await assertPropertyMember(propertyId, userId))) return null;

  const [analysesPage, documentsPage, eventsPage] = await Promise.all([
    loadMoreAnalysesPage(propertyId, userId, offsets.analyses),
    loadMoreDocumentsPage(propertyId, userId, offsets.documents),
    loadMoreEventsPage(propertyId, userId, offsets.events),
  ]);

  if (!analysesPage || !documentsPage || !eventsPage) return null;

  const known = new Set(knownKeys);
  const timeline = buildDashboardTimeline({
    createdAt,
    analyses: analysesPage.items,
    events: eventsPage.items,
    documents: documentsPage.items,
  }).filter((item) => item.kind !== "created" && !known.has(item.key));

  return {
    items: timeline,
    hasMore:
      analysesPage.hasMore || documentsPage.hasMore || eventsPage.hasMore,
    nextOffsets: {
      analyses: offsets.analyses + analysesPage.items.length,
      documents: offsets.documents + documentsPage.items.length,
      events: offsets.events + eventsPage.items.length,
    },
  };
}
