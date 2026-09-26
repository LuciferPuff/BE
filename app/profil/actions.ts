"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { getSessionUser } from "@/lib/auth/get-session-user";
import { parseSwedishMunicipality } from "@/lib/geo/swedish-municipalities";
import {
  isOwnershipStatus,
  isPropertyType,
  type OwnershipStatus,
  type PropertyType,
} from "@/lib/properties/labels";
import { isPropertyPartKey } from "@/lib/properties/parts-catalog";
import { createAuthClient } from "@/lib/supabase/auth-client";

export type PropertyFormState = {
  error?: string;
};

function optionalText(formData: FormData, key: string): string | null {
  const raw = formData.get(key);
  if (typeof raw !== "string") return null;
  const trimmed = raw.trim();
  return trimmed === "" ? null : trimmed;
}

function parsePropertyFields(formData: FormData): {
  error?: string;
  address?: string;
  designation: string | null;
  postal_code: string | null;
  city: string | null;
  kommun: string | null;
  property_type: PropertyType | null;
  construction_year: number | null;
  living_area_sqm: number | null;
} {
  const address = optionalText(formData, "address");
  if (!address) {
    return {
      error: "Ange en adress.",
      designation: null,
      postal_code: null,
      city: null,
      kommun: null,
      property_type: null,
      construction_year: null,
      living_area_sqm: null,
    };
  }

  const rawKommun = optionalText(formData, "kommun");
  if (!rawKommun) {
    return {
      error: "Välj kommun.",
      designation: null,
      postal_code: null,
      city: null,
      kommun: null,
      property_type: null,
      construction_year: null,
      living_area_sqm: null,
    };
  }
  const kommun = parseSwedishMunicipality(rawKommun);
  if (!kommun) {
    return {
      error: "Välj en kommun från listan.",
      designation: null,
      postal_code: null,
      city: null,
      kommun: null,
      property_type: null,
      construction_year: null,
      living_area_sqm: null,
    };
  }

  const rawType = optionalText(formData, "property_type");
  let property_type: PropertyType | null = null;
  if (rawType) {
    if (!isPropertyType(rawType)) {
      return {
        error: "Ogiltig fastighetstyp.",
        designation: null,
        postal_code: null,
        city: null,
        kommun: null,
        property_type: null,
        construction_year: null,
        living_area_sqm: null,
      };
    }
    property_type = rawType;
  }

  const yearRaw = optionalText(formData, "construction_year");
  let construction_year: number | null = null;
  if (yearRaw) {
    const year = Number.parseInt(yearRaw, 10);
    const maxYear = new Date().getFullYear() + 1;
    if (!Number.isFinite(year) || year < 1800 || year > maxYear) {
      return {
        error: "Ange ett rimligt byggår.",
        designation: null,
        postal_code: null,
        city: null,
        kommun: null,
        property_type: null,
        construction_year: null,
        living_area_sqm: null,
      };
    }
    construction_year = year;
  }

  const areaRaw = optionalText(formData, "living_area_sqm");
  let living_area_sqm: number | null = null;
  if (areaRaw) {
    const area = Number.parseFloat(areaRaw.replace(",", "."));
    if (!Number.isFinite(area) || area <= 0 || area > 5000) {
      return {
        error: "Ange en rimlig boarea i m².",
        designation: null,
        postal_code: null,
        city: null,
        kommun: null,
        property_type: null,
        construction_year: null,
        living_area_sqm: null,
      };
    }
    living_area_sqm = area;
  }

  return {
    address,
    designation: optionalText(formData, "designation"),
    postal_code: optionalText(formData, "postal_code"),
    city: optionalText(formData, "city"),
    kommun,
    property_type,
    construction_year,
    living_area_sqm,
  };
}

export async function createPropertyAction(
  _prev: PropertyFormState,
  formData: FormData,
): Promise<PropertyFormState> {
  const user = await getSessionUser();
  if (!user) {
    redirect("/logga-in?next=/profil/ny");
  }

  const parsed = parsePropertyFields(formData);
  if (parsed.error || !parsed.address) {
    return { error: parsed.error ?? "Ange en adress." };
  }

  const supabase = await createAuthClient();

  // Generera id i appen: INSERT … RETURNING/.select() kräver SELECT-RLS,
  // men skaparen är ännu inte medlem (agare-rad kommer i steg 2).
  const propertyId = crypto.randomUUID();

  const { error: insertError } = await supabase.from("properties").insert({
    id: propertyId,
    address: parsed.address,
    designation: parsed.designation,
    postal_code: parsed.postal_code,
    city: parsed.city,
    kommun: parsed.kommun,
    property_type: parsed.property_type,
    construction_year: parsed.construction_year,
    living_area_sqm: parsed.living_area_sqm,
  });

  if (insertError) {
    console.error(
      "[profil] create property:",
      insertError.message,
      insertError.code,
    );
    return { error: "Kunde inte skapa fastigheten. Försök igen." };
  }

  const { error: memberError } = await supabase.from("property_members").insert({
    property_id: propertyId,
    user_id: user.id,
    role: "agare",
  });

  if (memberError) {
    console.error(
      "[profil] create member:",
      memberError.message,
      memberError.code,
    );
    const { error: rollbackError } = await supabase
      .from("properties")
      .delete()
      .eq("id", propertyId);
    if (rollbackError) {
      console.error(
        "[profil] rollback orphan property failed:",
        rollbackError.message,
        propertyId,
      );
    }
    return {
      error: "Kunde inte koppla dig som ägare. Försök igen.",
    };
  }

  revalidatePath("/profil");
  revalidatePath(`/profil/${propertyId}`);
  redirect(`/profil/${propertyId}`);
}

export async function updatePropertyAction(
  _prev: PropertyFormState,
  formData: FormData,
): Promise<PropertyFormState> {
  const user = await getSessionUser();
  const propertyId = optionalText(formData, "property_id");
  if (!user) {
    redirect(
      propertyId
        ? `/logga-in?next=/profil/${propertyId}/redigera`
        : "/logga-in?next=/profil",
    );
  }
  if (!propertyId) {
    return { error: "Saknar fastighet." };
  }

  const parsed = parsePropertyFields(formData);
  if (parsed.error || !parsed.address) {
    return { error: parsed.error ?? "Ange en adress." };
  }

  const supabase = await createAuthClient();

  const { data, error } = await supabase
    .from("properties")
    .update({
      address: parsed.address,
      designation: parsed.designation,
      postal_code: parsed.postal_code,
      city: parsed.city,
      kommun: parsed.kommun,
      property_type: parsed.property_type,
      construction_year: parsed.construction_year,
      living_area_sqm: parsed.living_area_sqm,
    })
    .eq("id", propertyId)
    .select("id");

  if (error) {
    console.error("[profil] update property:", error.message, error.code);
    return { error: "Kunde inte spara ändringarna. Försök igen." };
  }

  // 0 rader = RLS nekade (t.ex. inte ägare) eller fel id
  if (!data || data.length === 0) {
    return {
      error: "Du har inte behörighet att ändra den här fastigheten.",
    };
  }

  revalidatePath("/profil");
  revalidatePath(`/profil/${propertyId}/redigera`);
  revalidatePath(`/profil/${propertyId}`);
  redirect(`/profil/${propertyId}`);
}

export type OwnershipStatusState = {
  error?: string;
};

/** Uppdaterar köpfas / äger på dashboarden. Endast ägare. */
export async function updateOwnershipStatusAction(
  _prev: OwnershipStatusState,
  formData: FormData,
): Promise<OwnershipStatusState> {
  const user = await getSessionUser();
  const propertyId = optionalText(formData, "property_id");
  const rawStatus = optionalText(formData, "ownership_status");

  if (!user) {
    redirect(
      propertyId
        ? `/logga-in?next=/profil/${propertyId}`
        : "/logga-in?next=/profil",
    );
  }
  if (!propertyId) {
    return { error: "Saknar fastighet." };
  }
  if (!rawStatus || !isOwnershipStatus(rawStatus)) {
    return { error: "Ogiltig status." };
  }
  const ownership_status: OwnershipStatus = rawStatus;

  const supabase = await createAuthClient();
  const { data, error } = await supabase
    .from("properties")
    .update({ ownership_status })
    .eq("id", propertyId)
    .select("id");

  if (error) {
    console.error("[profil] ownership_status:", error.message, error.code);
    return { error: "Kunde inte uppdatera status. Försök igen." };
  }
  if (!data || data.length === 0) {
    return {
      error: "Du har inte behörighet att ändra den här fastigheten.",
    };
  }

  revalidatePath("/profil");
  revalidatePath(`/profil/${propertyId}`);
  return {};
}

export type UpdatePropertyPartState = {
  error?: string;
  ok?: boolean;
};

/** Sparar verifierat bytesår för en husdel (Fas B). */
export async function updatePropertyPartAction(
  _prev: UpdatePropertyPartState,
  formData: FormData,
): Promise<UpdatePropertyPartState> {
  const user = await getSessionUser();
  const propertyId = optionalText(formData, "property_id");
  const partKey = optionalText(formData, "part_key");
  const yearRaw = optionalText(formData, "replaced_year");
  const clear = optionalText(formData, "clear") === "1";

  if (!user) {
    redirect(
      propertyId
        ? `/logga-in?next=/profil/${propertyId}`
        : "/logga-in?next=/profil",
    );
  }
  if (!propertyId) {
    return { error: "Saknar fastighet." };
  }
  if (!partKey || !isPropertyPartKey(partKey)) {
    return { error: "Ogiltig husdel." };
  }

  let replaced_year: number | null = null;
  if (!clear) {
    if (!yearRaw) {
      return { error: "Ange år då delen byttes eller renoverades." };
    }
    const year = Number.parseInt(yearRaw, 10);
    const maxYear = new Date().getFullYear() + 1;
    if (!Number.isFinite(year) || year < 1800 || year > maxYear) {
      return { error: "Ange ett rimligt årtal." };
    }
    replaced_year = year;
  }

  const supabase = await createAuthClient();
  const { error } = await supabase.from("property_parts").upsert(
    {
      property_id: propertyId,
      part_key: partKey,
      replaced_year,
      updated_by: user.id,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "property_id,part_key" },
  );

  if (error) {
    console.error("[profil] property_parts:", error.message, error.code);
    return { error: "Kunde inte spara. Försök igen." };
  }

  revalidatePath(`/profil/${propertyId}`);
  revalidatePath("/profil");
  return { ok: true };
}

/** @deprecated Use PropertyFormState */
export type CreatePropertyState = PropertyFormState;
