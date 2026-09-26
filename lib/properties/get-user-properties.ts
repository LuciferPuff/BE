import { createAuthClient } from "@/lib/supabase/auth-client";
import type { OwnershipStatus } from "@/lib/properties/labels";

export type LinkedAnalysisSummary = {
  id: string;
  address: string;
  created_at: string;
};

export type UserPropertySummary = {
  id: string;
  address: string;
  designation: string | null;
  kommun: string | null;
  city: string | null;
  property_type: string | null;
  construction_year: number | null;
  ownership_status: OwnershipStatus;
  role: string;
  analyses: LinkedAnalysisSummary[];
};

type PropertyFields = {
  id: string;
  address: string;
  designation: string | null;
  kommun: string | null;
  city: string | null;
  property_type: string | null;
  construction_year: number | null;
  ownership_status: string | null;
};

type MemberRow = {
  role: string;
  properties: PropertyFields | PropertyFields[] | null;
};

function unwrapProperty(
  value: MemberRow["properties"],
): PropertyFields | null {
  if (!value) return null;
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

function parseOwnershipStatus(value: string | null): OwnershipStatus {
  return value === "ager" ? "ager" : "funderar";
}

/**
 * Fastigheter användaren är medlem i + kopplade analyser.
 * Använder cookie-session + RLS — inte service role.
 */
export async function getUserProperties(
  userId: string,
): Promise<UserPropertySummary[]> {
  const supabase = await createAuthClient();

  const { data: memberRows, error: membersError } = await supabase
    .from("property_members")
    .select(
      "role, properties ( id, address, designation, kommun, city, property_type, construction_year, ownership_status )",
    )
    .eq("user_id", userId);

  if (membersError) {
    console.error("[profil] property_members:", membersError.message);
    return [];
  }

  const properties: UserPropertySummary[] = [];
  for (const row of (memberRows ?? []) as MemberRow[]) {
    const p = unwrapProperty(row.properties);
    if (!p) continue;
    properties.push({
      id: p.id,
      address: p.address,
      designation: p.designation,
      kommun: p.kommun,
      city: p.city,
      property_type: p.property_type,
      construction_year:
        typeof p.construction_year === "number"
          ? p.construction_year
          : p.construction_year != null
            ? Number(p.construction_year)
            : null,
      ownership_status: parseOwnershipStatus(p.ownership_status),
      role: row.role,
      analyses: [],
    });
  }

  if (properties.length === 0) return [];

  const ids = properties.map((p) => p.id);
  const { data: analyses, error: analysesError } = await supabase
    .from("analyses")
    .select("id, address, created_at, linked_property_id")
    .in("linked_property_id", ids)
    .order("created_at", { ascending: false });

  if (analysesError) {
    console.error("[profil] analyses:", analysesError.message);
    return properties;
  }

  const byProperty = new Map<string, LinkedAnalysisSummary[]>();
  for (const a of analyses ?? []) {
    const linkedId = a.linked_property_id as string | null;
    if (!linkedId) continue;
    const list = byProperty.get(linkedId) ?? [];
    list.push({
      id: a.id as string,
      address: a.address as string,
      created_at: a.created_at as string,
    });
    byProperty.set(linkedId, list);
  }

  return properties.map((p) => ({
    ...p,
    analyses: byProperty.get(p.id) ?? [],
  }));
}
