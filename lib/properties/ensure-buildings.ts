/**
 * Skapa huvudbyggnad + seedade delar, och spegla byggår.
 */

import {
  BUILDING_DEFAULT_PARTS,
  BUILDING_TYPE_LABELS,
  type BuildingType,
  type PropertyPartKey,
} from "@/lib/properties/parts-catalog";
import type { createAuthClient } from "@/lib/supabase/auth-client";

type Supabase = Awaited<ReturnType<typeof createAuthClient>>;

export async function createBuildingWithDefaultParts(
  supabase: Supabase,
  input: {
    propertyId: string;
    type: BuildingType;
    name?: string;
    buildYear: number | null;
  },
): Promise<{ buildingId: string; error?: string }> {
  const name =
    input.name?.trim() || BUILDING_TYPE_LABELS[input.type] || input.type;

  const { data: building, error: buildingError } = await supabase
    .from("property_buildings")
    .insert({
      property_id: input.propertyId,
      type: input.type,
      name,
      build_year: input.buildYear,
    })
    .select("id")
    .single();

  if (buildingError || !building) {
    console.error(
      "[profil] create building:",
      buildingError?.message,
      buildingError?.code,
    );
    return { buildingId: "", error: "Kunde inte skapa byggnad." };
  }

  const buildingId = building.id as string;
  const keys = BUILDING_DEFAULT_PARTS[input.type];
  const seedError = await seedPartsForBuilding(
    supabase,
    input.propertyId,
    buildingId,
    keys,
  );
  if (seedError) {
    return { buildingId, error: seedError };
  }

  return { buildingId };
}

export async function seedPartsForBuilding(
  supabase: Supabase,
  propertyId: string,
  buildingId: string,
  keys: readonly PropertyPartKey[],
): Promise<string | undefined> {
  if (keys.length === 0) return undefined;

  const rows = keys.map((part_key) => ({
    property_id: propertyId,
    building_id: buildingId,
    part_key,
    not_applicable: false,
  }));

  const { error } = await supabase.from("property_parts").insert(rows);
  if (error) {
    console.error("[profil] seed parts:", error.message, error.code);
    return "Kunde inte skapa husdelar.";
  }
  return undefined;
}

/** Spegla huvudbyggnadens byggår ↔ properties.construction_year. */
export async function syncHuvudbyggnadBuildYear(
  supabase: Supabase,
  propertyId: string,
  buildYear: number | null,
): Promise<string | undefined> {
  const { error: buildingError } = await supabase
    .from("property_buildings")
    .update({
      build_year: buildYear,
      updated_at: new Date().toISOString(),
    })
    .eq("property_id", propertyId)
    .eq("type", "huvudbyggnad");

  if (buildingError) {
    console.error(
      "[profil] sync huvudbyggnad year:",
      buildingError.message,
      buildingError.code,
    );
    return "Kunde inte uppdatera byggnadens byggår.";
  }
  return undefined;
}
