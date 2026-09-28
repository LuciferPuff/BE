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

export type PropertyDashboard = {
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
  memberCount: number;
  created_at: string;
  analyses: DashboardLinkedAnalysis[];
  buildings: PropertyBuildingView[];
  parts: PropertyPartView[];
  completeness: PropertyCompleteness;
  nextPart: PropertyPartView | null;
  todos: PropertyTodoItem[];
  nextStep: PropertyNextStep;
  interestedFeatures: string[];
  documents: DashboardDocument[];
  events: DashboardEvent[];
  timeline: DashboardTimelineItem[];
};

function parseOwnershipStatus(value: unknown): OwnershipStatus {
  return value === "ager" ? "ager" : "funderar";
}

/**
 * En fastighet för dashboard. RLS + medlemskap krävs.
 */
export async function getPropertyDashboard(
  propertyId: string,
  userId: string,
): Promise<PropertyDashboard | null> {
  const supabase = await createAuthClient();

  const { data: membership, error: memberError } = await supabase
    .from("property_members")
    .select("role")
    .eq("property_id", propertyId)
    .eq("user_id", userId)
    .maybeSingle();

  if (memberError || !membership) {
    if (memberError) {
      console.error("[profil] dashboard member:", memberError.message);
    }
    return null;
  }

  const { count: memberCount } = await supabase
    .from("property_members")
    .select("id", { count: "exact", head: true })
    .eq("property_id", propertyId);

  const { data: property, error } = await supabase
    .from("properties")
    .select(
      "id, address, designation, postal_code, city, kommun, property_type, construction_year, living_area_sqm, purchase_date, ownership_status, created_at",
    )
    .eq("id", propertyId)
    .maybeSingle();

  if (error || !property) {
    if (error) console.error("[profil] dashboard property:", error.message);
    return null;
  }

  const { data: analyses, error: analysesError } = await supabase
    .from("analyses")
    .select("id, address, created_at")
    .eq("linked_property_id", propertyId)
    .order("created_at", { ascending: false });

  if (analysesError) {
    console.error("[profil] dashboard analyses:", analysesError.message);
  }

  const { data: buildingRows, error: buildingsError } = await supabase
    .from("property_buildings")
    .select("id, type, name, build_year")
    .eq("property_id", propertyId)
    .order("created_at", { ascending: true });

  if (buildingsError) {
    console.error("[profil] dashboard buildings:", buildingsError.message);
  }

  const { data: partRows, error: partsError } = await supabase
    .from("property_parts")
    .select(
      "id, building_id, part_key, name, not_applicable, replaced_year, year_precision, variant, known_issues, role, integrated, checked_at, checked_until, check_note, snoozed_until",
    )
    .eq("property_id", propertyId);

  if (partsError) {
    console.error("[profil] dashboard parts:", partsError.message);
  }

  const { data: todoRows, error: todoError } = await supabase
    .from("property_todo_states")
    .select("task_key, completed_at, note")
    .eq("property_id", propertyId);

  if (todoError) {
    console.error("[profil] dashboard todos:", todoError.message);
  }

  const { data: interestRows, error: interestError } = await supabase
    .from("feature_interest")
    .select("feature")
    .eq("user_id", userId);

  if (interestError) {
    console.error("[profil] feature_interest:", interestError.message);
  }

  const { data: documentRows, error: documentsError } = await supabase
    .from("property_documents")
    .select("id, type, file_path, note, uploaded_at")
    .eq("property_id", propertyId)
    .order("uploaded_at", { ascending: false });

  if (documentsError) {
    console.error("[profil] documents:", documentsError.message);
  }

  const { data: eventRows, error: eventsError } = await supabase
    .from("property_events")
    .select("id, event_type, event_date, description, cost")
    .eq("property_id", propertyId)
    .order("event_date", { ascending: false });

  if (eventsError) {
    console.error("[profil] events:", eventsError.message);
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
    (buildingRows ?? []).map((b) => ({
      id: b.id as string,
      type: b.type as string,
      name: b.name as string,
      build_year:
        b.build_year != null ? Number(b.build_year) : null,
    })),
    (partRows ?? []).map((r) => ({
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

  const analysesList = (analyses ?? []).map((a) => ({
    id: a.id as string,
    address: a.address as string,
    created_at: a.created_at as string,
  }));

  const nextPart = pickNextPartAction(parts);
  const todos = buildPropertyTodos({
    ownershipStatus: ownership_status,
    hasAnalysis: analysesList.length > 0,
    parts,
    states: (todoRows ?? []).map((r) => ({
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
    hasAnalysis: analysesList.length > 0,
    openTodos: todos,
  });

  const documents: DashboardDocument[] = (documentRows ?? []).map((d) => ({
    id: d.id as string,
    type: d.type as string,
    file_path: d.file_path as string,
    note: (d.note as string | null) ?? null,
    uploaded_at: d.uploaded_at as string,
  }));

  const events: DashboardEvent[] = (eventRows ?? []).map((e) => ({
    id: e.id as string,
    event_type: e.event_type as string,
    event_date: e.event_date as string,
    description: (e.description as string | null) ?? null,
    cost: e.cost != null ? Number(e.cost) : null,
  }));

  const timeline: DashboardTimelineItem[] = [
    {
      key: "created",
      label: "Fastigheten lades till i Byggello",
      date: property.created_at as string,
      kind: "created" as const,
    },
    ...analysesList.map((a) => ({
      key: `analysis-${a.id}`,
      label: "AI-analys kopplad",
      date: a.created_at,
      href: `/mina-analyser/${a.id}`,
      kind: "analysis" as const,
    })),
    ...events.map((e) => ({
      key: `event-${e.id}`,
      label: e.description?.trim()
        ? `${eventTypeLabel(e.event_type)}: ${e.description.trim()}`
        : eventTypeLabel(e.event_type),
      date: e.event_date,
      kind: "event" as const,
    })),
    ...documents.map((d) => ({
      key: `doc-${d.id}`,
      label: `Dokument: ${documentTypeLabel(d.type)} (${displayNameFromFilePath(d.file_path)})`,
      date: d.uploaded_at,
      kind: "document" as const,
    })),
  ].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
  );

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
    memberCount: memberCount ?? 1,
    created_at: property.created_at as string,
    analyses: analysesList,
    buildings,
    parts,
    completeness,
    nextPart,
    todos,
    nextStep,
    interestedFeatures: (interestRows ?? []).map((r) => r.feature as string),
    documents,
    events,
    timeline,
  };
}
