import { createAuthClient } from "@/lib/supabase/auth-client";

export type PropertyEditData = {
  id: string;
  address: string;
  designation: string | null;
  postal_code: string | null;
  city: string | null;
  kommun: string | null;
  property_type: string | null;
  role: string;
};

/** En fastighet för redigering. RLS + medlemskap. */
export async function getPropertyForEdit(
  propertyId: string,
  userId: string,
): Promise<PropertyEditData | null> {
  const supabase = await createAuthClient();

  const { data: membership, error: memberError } = await supabase
    .from("property_members")
    .select("role")
    .eq("property_id", propertyId)
    .eq("user_id", userId)
    .maybeSingle();

  if (memberError || !membership) {
    if (memberError) {
      console.error("[profil] getPropertyForEdit member:", memberError.message);
    }
    return null;
  }

  const { data: property, error } = await supabase
    .from("properties")
    .select(
      "id, address, designation, postal_code, city, kommun, property_type",
    )
    .eq("id", propertyId)
    .maybeSingle();

  if (error || !property) {
    if (error) console.error("[profil] getPropertyForEdit:", error.message);
    return null;
  }

  return {
    id: property.id as string,
    address: property.address as string,
    designation: (property.designation as string | null) ?? null,
    postal_code: (property.postal_code as string | null) ?? null,
    city: (property.city as string | null) ?? null,
    kommun: (property.kommun as string | null) ?? null,
    property_type: (property.property_type as string | null) ?? null,
    role: membership.role as string,
  };
}
