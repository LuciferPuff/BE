import {
  buildPropertyPartViews,
  computeProfileCompleteness,
  pickNextPartAction,
  type PropertyPartView,
} from "@/lib/properties/build-property-parts";
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
  missingHint: string;
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
  created_at: string;
  analyses: DashboardLinkedAnalysis[];
  parts: PropertyPartView[];
  completeness: PropertyCompleteness;
  nextPart: PropertyPartView | null;
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

  const { data: partRows, error: partsError } = await supabase
    .from("property_parts")
    .select("part_key, replaced_year")
    .eq("property_id", propertyId);

  if (partsError) {
    console.error("[profil] dashboard parts:", partsError.message);
  }

  const construction_year =
    typeof property.construction_year === "number"
      ? property.construction_year
      : property.construction_year != null
        ? Number(property.construction_year)
        : null;

  const living_area_sqm =
    property.living_area_sqm != null ? Number(property.living_area_sqm) : null;

  const parts = buildPropertyPartViews(
    construction_year,
    (partRows ?? []).map((r) => ({
      part_key: r.part_key as string,
      replaced_year:
        r.replaced_year != null ? Number(r.replaced_year) : null,
    })),
  );

  const completeness = computeProfileCompleteness({
    hasKommun: Boolean((property.kommun as string | null)?.trim()),
    hasPropertyType: Boolean(property.property_type),
    hasConstructionYear: construction_year != null,
    hasLivingArea: living_area_sqm != null && Number.isFinite(living_area_sqm),
    parts,
  });

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
    ownership_status: parseOwnershipStatus(property.ownership_status),
    role: membership.role as string,
    created_at: property.created_at as string,
    analyses: (analyses ?? []).map((a) => ({
      id: a.id as string,
      address: a.address as string,
      created_at: a.created_at as string,
    })),
    parts,
    completeness,
    nextPart: pickNextPartAction(parts),
  };
}
