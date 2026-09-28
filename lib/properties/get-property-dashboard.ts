import { cache } from "react";

import {
  buildPropertyBuildingViews,
  computeProfileCompleteness,
  flattenBuildingParts,
  pickNextPartAction,
  type PropertyBuildingView,
  type PropertyPartView,
} from "@/lib/properties/build-property-parts";
import {
  buildPropertyTodos,
  pickNextStep,
  type PropertyTodoItem,
} from "@/lib/properties/build-todos";
import {
  displayNameFromFilePath,
  documentTypeLabel,
  eventTypeLabel,
} from "@/lib/properties/document-labels";
import { DASHBOARD_PAGE_SIZE } from "@/lib/properties/dashboard-limits";
import { createAuthClient } from "@/lib/supabase/auth-client";
import type { OwnershipStatus } from "@/lib/properties/labels";

export type DashboardLinkedAnalysis = {
  id: string;
  address: string;
  created_at: string;
};

export type PropertyCompleteness = {
  percent: number;
  verifiedParts: number;
  totalParts: number;
};

export type PropertyNextStep = {
  title: string;
  body: string;
  ctaLabel: string;
  ctaHref?: string;
  showBoughtButton?: boolean;
  tone?: "default" | "warning";
};

export type DashboardDocument = {
  id: string;
  type: string;
  file_path: string;
  note: string | null;
  uploaded_at: string;
};

export type DashboardEvent = {
  id: string;
  event_type: string;
  event_date: string;
  description: string | null;
  cost: number | null;
};

export type DashboardTimelineItem = {
  key: string;
  label: string;
  date: string;
  href?: string;
  kind: "created" | "analysis" | "event" | "document";
};

/** Primär dashboard-data (above-the-fold). */
export type PropertyDashboardCore = {
  id: string;
  address: string;
  designation: string | null;
  postal_code: string | null;
  city: string | null;
  kommun: string | null;
  property_type: string | null;
  construction_year: number | null;
  living_area_sqm: number | null;
  purchase_date: string | null;
  ownership_status: OwnershipStatus;
  role: string;
  /** 1 om okänt/ensam; >1 endast när vi vet att det finns flera medlemmar. */
  memberCount: number;
  created_at: string;
  hasAnalysis: boolean;
  buildings: PropertyBuildingView[];
  parts: PropertyPartView[];
  completeness: PropertyCompleteness;
  nextPart: PropertyPartView | null;
  todos: PropertyTodoItem[];
  nextStep: PropertyNextStep;
  interestedFeatures: string[];
};

/** Sekundär data (tidslinje, dokument, analyser-lista). */
export type PropertyDashboardSecondary = {
  analyses: DashboardLinkedAnalysis[];
  analysesHasMore: boolean;
  documents: DashboardDocument[];
  documentsHasMore: boolean;
  documentFolderCounts: Record<string, number>;
  events: DashboardEvent[];
  eventsHasMore: boolean;
  timeline: DashboardTimelineItem[];
  timelineHasMore: boolean;
};

/** @deprecated Prefer Core + Secondary; kept for type compatibility. */
export type PropertyDashboard = PropertyDashboardCore &
  PropertyDashboardSecondary;

/** Truncate a page fetch that requested limit+1 rows. */
export function takePage<T>(rows: T[], pageSize = DASHBOARD_PAGE_SIZE): {
  items: T[];
  hasMore: boolean;
} {
  if (rows.length > pageSize) {
    return { items: rows.slice(0, pageSize), hasMore: true };
  }
  return { items: rows, hasMore: false };
}

export function buildDashboardTimeline(input: {
  createdAt: string;
  analyses: DashboardLinkedAnalysis[];
  events: DashboardEvent[];
  documents: DashboardDocument[];
}): DashboardTimelineItem[] {
  return [
    {
      key: "created",
      label: "Fastigheten lades till i Byggello",
      date: input.createdAt,
      kind: "created" as const,
    },
    ...input.analyses.map((a) => ({
      key: `analysis-${a.id}`,
      label: "AI-analys kopplad",
      date: a.created_at,
      href: `/mina-analyser/${a.id}`,
      kind: "analysis" as const,
    })),
    ...input.events.map((e) => ({
      key: `event-${e.id}`,
      label: e.description?.trim()
        ? `${eventTypeLabel(e.event_type)}: ${e.description.trim()}`
        : eventTypeLabel(e.event_type),
      date: e.event_date,
      kind: "event" as const,
    })),
    ...input.documents.map((d) => ({
      key: `doc-${d.id}`,
      label: `Dokument: ${documentTypeLabel(d.type)} (${displayNameFromFilePath(d.file_path)})`,
      date: d.uploaded_at,
      kind: "document" as const,
    })),
  ].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
  );
}

function parseOwnershipStatus(value: unknown): OwnershipStatus {
  return value === "ager" ? "ager" : "funderar";
}

function folderCountsFromDocs(
  docs: { type: string }[],
): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const doc of docs) {
    counts[doc.type] = (counts[doc.type] ?? 0) + 1;
  }
  return counts;
}

function logDashboardTiming(
  phase: string,
  propertyId: string,
  startedAt: number,
  extra?: Record<string, number | boolean>,
) {
  const ms = Math.round(performance.now() - startedAt);
  console.info(
    `[profil] dashboard ${phase}`,
    JSON.stringify({ propertyId, ms, ...extra }),
  );
}

/**
 * Primär fastighetsdata för snabb first paint (nästa steg, todos, husdelar).
 */
export async function getPropertyDashboardCore(
  propertyId: string,
  userId: string,
): Promise<PropertyDashboardCore | null> {
  const t0 = performance.now();
  const supabase = await createAuthClient();

  const tMember = performance.now();
  const { data: membership, error: memberError } = await supabase
    .from("property_members")
    .select("role")
    .eq("property_id", propertyId)
    .eq("user_id", userId)
    .maybeSingle();
  logDashboardTiming("membership", propertyId, tMember);

  if (memberError || !membership) {
    if (memberError) {
      console.error("[profil] dashboard member:", memberError.message);
    }
    return null;
  }

  const tParallel = performance.now();
  const [
    memberPeekResult,
    propertyResult,
    analysisExistsResult,
    buildingsResult,
    partsResult,
    todoResult,
    interestResult,
  ] = await Promise.all([
    // Räcker för showRole ( >1 ) utan exact count.
    supabase
      .from("property_members")
      .select("id")
      .eq("property_id", propertyId)
      .limit(2),
    supabase
      .from("properties")
      .select(
        "id, address, designation, postal_code, city, kommun, property_type, construction_year, living_area_sqm, purchase_date, ownership_status, created_at",
      )
      .eq("id", propertyId)
      .maybeSingle(),
    supabase
      .from("user_analyses")
      .select("id")
      .eq("linked_property_id", propertyId)
      .limit(1),
    supabase
      .from("property_buildings")
      .select("id, type, name, build_year")
      .eq("property_id", propertyId)
      .order("created_at", { ascending: true }),
    supabase
      .from("property_parts")
      .select(
        "id, building_id, part_key, name, not_applicable, replaced_year, year_precision, variant, known_issues, role, integrated, checked_at, checked_until, check_note, snoozed_until",
      )
      .eq("property_id", propertyId),
    supabase
      .from("property_todo_states")
      .select("task_key, completed_at, note")
      .eq("property_id", propertyId),
    supabase
      .from("feature_interest")
      .select("feature")
      .eq("user_id", userId),
  ]);
  logDashboardTiming("core_parallel", propertyId, tParallel, {
    queryCount: 7,
  });

  const { data: property, error } = propertyResult;
  if (error || !property) {
    if (error) console.error("[profil] dashboard property:", error.message);
    return null;
  }

  if (memberPeekResult.error) {
    console.error("[profil] member peek:", memberPeekResult.error.message);
  }
  if (analysisExistsResult.error) {
    console.error(
      "[profil] analysis exists:",
      analysisExistsResult.error.message,
    );
  }
  if (buildingsResult.error) {
    console.error("[profil] buildings:", buildingsResult.error.message);
  }
  if (partsResult.error) {
    console.error("[profil] parts:", partsResult.error.message);
  }
  if (todoResult.error) {
    console.error("[profil] todos:", todoResult.error.message);
  }
  if (interestResult.error) {
    console.error("[profil] feature_interest:", interestResult.error.message);
  }

  const construction_year =
    typeof property.construction_year === "number"
      ? property.construction_year
      : property.construction_year != null
        ? Number(property.construction_year)
        : null;

  const living_area_sqm =
    property.living_area_sqm != null ? Number(property.living_area_sqm) : null;

  const ownership_status = parseOwnershipStatus(property.ownership_status);

  const buildings = buildPropertyBuildingViews(
    (buildingsResult.data ?? []).map((b) => ({
      id: b.id as string,
      type: b.type as string,
      name: b.name as string,
      build_year: b.build_year != null ? Number(b.build_year) : null,
    })),
    (partsResult.data ?? []).map((r) => ({
      id: r.id as string,
      building_id: r.building_id as string,
      part_key: r.part_key as string,
      name: (r.name as string | null) ?? null,
      not_applicable: Boolean(r.not_applicable),
      replaced_year:
        r.replaced_year != null ? Number(r.replaced_year) : null,
      year_precision: (r.year_precision as string | null) ?? null,
      variant: (r.variant as string | null) ?? null,
      known_issues: Array.isArray(r.known_issues)
        ? (r.known_issues as string[])
        : [],
      role: (r.role as string | null) ?? null,
      integrated: Boolean(r.integrated),
      checked_at: (r.checked_at as string | null) ?? null,
      checked_until: (r.checked_until as string | null) ?? null,
      check_note: (r.check_note as string | null) ?? null,
      snoozed_until: (r.snoozed_until as string | null) ?? null,
    })),
  );

  const parts = flattenBuildingParts(buildings);
  const completeness = computeProfileCompleteness({ parts });
  const hasAnalysis = (analysisExistsResult.data ?? []).length > 0;
  const nextPart = pickNextPartAction(parts);
  const todos = buildPropertyTodos({
    ownershipStatus: ownership_status,
    hasAnalysis,
    parts,
    states: (todoResult.data ?? []).map((r) => ({
      task_key: r.task_key as string,
      completed_at: (r.completed_at as string | null) ?? null,
      note: (r.note as string | null) ?? null,
    })),
    propertyId,
  });

  const nextStep = pickNextStep({
    ownershipStatus: ownership_status,
    constructionYear: construction_year,
    nextPart,
    hasAnalysis,
    openTodos: todos,
  });

  const memberPeek = memberPeekResult.data ?? [];
  const memberCount = memberPeek.length > 1 ? memberPeek.length : 1;

  logDashboardTiming("core_total", propertyId, t0);

  return {
    id: property.id as string,
    address: property.address as string,
    designation: (property.designation as string | null) ?? null,
    postal_code: (property.postal_code as string | null) ?? null,
    city: (property.city as string | null) ?? null,
    kommun: (property.kommun as string | null) ?? null,
    property_type: (property.property_type as string | null) ?? null,
    construction_year,
    living_area_sqm,
    purchase_date: (property.purchase_date as string | null) ?? null,
    ownership_status,
    role: membership.role as string,
    memberCount,
    created_at: property.created_at as string,
    hasAnalysis,
    buildings,
    parts,
    completeness,
    nextPart,
    todos,
    nextStep,
    interestedFeatures: (interestResult.data ?? []).map(
      (r) => r.feature as string,
    ),
  };
}

/**
 * Sekundär data: tidslinje, dokument, analyser-lista (Suspense).
 * Wrapped in React cache so aside + analyses share one fetch per request.
 */
export const getPropertyDashboardSecondary = cache(
  async function getPropertyDashboardSecondary(
    propertyId: string,
    userId: string,
    createdAt: string,
  ): Promise<PropertyDashboardSecondary | null> {
  const t0 = performance.now();
  const supabase = await createAuthClient();

  const { data: membership, error: memberError } = await supabase
    .from("property_members")
    .select("role")
    .eq("property_id", propertyId)
    .eq("user_id", userId)
    .maybeSingle();

  if (memberError || !membership) {
    if (memberError) {
      console.error("[profil] secondary member:", memberError.message);
    }
    return null;
  }

  const tParallel = performance.now();
  const [analysesResult, documentsResult, eventsResult] = await Promise.all([
    supabase
      .from("user_analyses")
      .select("id, address, created_at")
      .eq("linked_property_id", propertyId)
      .order("created_at", { ascending: false })
      .limit(DASHBOARD_PAGE_SIZE + 1),
    supabase
      .from("property_documents")
      .select("id, type, file_path, note, uploaded_at")
      .eq("property_id", propertyId)
      .order("uploaded_at", { ascending: false })
      .limit(DASHBOARD_PAGE_SIZE + 1),
    supabase
      .from("property_events")
      .select("id, event_type, event_date, description, cost")
      .eq("property_id", propertyId)
      .order("event_date", { ascending: false })
      .limit(DASHBOARD_PAGE_SIZE + 1),
  ]);
  logDashboardTiming("secondary_parallel", propertyId, tParallel, {
    queryCount: 3,
  });

  if (analysesResult.error) {
    console.error("[profil] analyses:", analysesResult.error.message);
  }
  if (documentsResult.error) {
    console.error("[profil] documents:", documentsResult.error.message);
  }
  if (eventsResult.error) {
    console.error("[profil] events:", eventsResult.error.message);
  }

  const analysesPage = takePage(
    (analysesResult.data ?? []).map((a) => ({
      id: a.id as string,
      address: a.address as string,
      created_at: a.created_at as string,
    })),
  );

  const documentsPage = takePage(
    (documentsResult.data ?? []).map((d) => ({
      id: d.id as string,
      type: d.type as string,
      file_path: d.file_path as string,
      note: (d.note as string | null) ?? null,
      uploaded_at: d.uploaded_at as string,
    })),
  );

  let documentFolderCounts = folderCountsFromDocs(documentsPage.items);

  // Exact folder counts only when page is truncated (avoids always-on type scan).
  if (documentsPage.hasMore) {
    const { data: typeRows, error: typeError } = await supabase
      .from("property_documents")
      .select("type")
      .eq("property_id", propertyId);
    if (typeError) {
      console.error("[profil] document types:", typeError.message);
    } else {
      documentFolderCounts = folderCountsFromDocs(
        (typeRows ?? []).map((r) => ({ type: r.type as string })),
      );
    }
  }

  const eventsPage = takePage(
    (eventsResult.data ?? []).map((e) => ({
      id: e.id as string,
      event_type: e.event_type as string,
      event_date: e.event_date as string,
      description: (e.description as string | null) ?? null,
      cost: e.cost != null ? Number(e.cost) : null,
    })),
  );

  const timeline = buildDashboardTimeline({
    createdAt,
    analyses: analysesPage.items,
    events: eventsPage.items,
    documents: documentsPage.items,
  });

  logDashboardTiming("secondary_total", propertyId, t0);

  return {
    analyses: analysesPage.items,
    analysesHasMore: analysesPage.hasMore,
    documents: documentsPage.items,
    documentsHasMore: documentsPage.hasMore,
    documentFolderCounts,
    events: eventsPage.items,
    eventsHasMore: eventsPage.hasMore,
    timeline,
    timelineHasMore:
      analysesPage.hasMore ||
      documentsPage.hasMore ||
      eventsPage.hasMore,
  };
  },
);
