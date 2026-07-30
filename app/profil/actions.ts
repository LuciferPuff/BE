"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { getSessionUser } from "@/lib/auth/get-session-user";
import {
  isPropertyType,
  type PropertyType,
} from "@/lib/properties/labels";
import { createAuthClient } from "@/lib/supabase/auth-client";

export type CreatePropertyState = {
  error?: string;
};

function optionalText(formData: FormData, key: string): string | null {
  const raw = formData.get(key);
  if (typeof raw !== "string") return null;
  const trimmed = raw.trim();
  return trimmed === "" ? null : trimmed;
}

export async function createPropertyAction(
  _prev: CreatePropertyState,
  formData: FormData,
): Promise<CreatePropertyState> {
  const user = await getSessionUser();
  if (!user) {
    redirect("/logga-in?next=/profil/ny");
  }

  const address = optionalText(formData, "address");
  if (!address) {
    return { error: "Ange en adress." };
  }

  const postal_code = optionalText(formData, "postal_code");
  const city = optionalText(formData, "city");
  const kommun = optionalText(formData, "kommun");

  const rawType = optionalText(formData, "property_type");
  let property_type: PropertyType | null = null;
  if (rawType) {
    if (!isPropertyType(rawType)) {
      return { error: "Ogiltig fastighetstyp." };
    }
    property_type = rawType;
  }

  const supabase = await createAuthClient();

  const { data: property, error: insertError } = await supabase
    .from("properties")
    .insert({
      address,
      postal_code,
      city,
      kommun,
      property_type,
    })
    .select("id")
    .single();

  if (insertError || !property?.id) {
    console.error("[profil] create property:", insertError?.message);
    return { error: "Kunde inte skapa fastigheten. Försök igen." };
  }

  const propertyId = property.id as string;

  const { error: memberError } = await supabase.from("property_members").insert({
    property_id: propertyId,
    user_id: user.id,
    role: "agare",
  });

  if (memberError) {
    console.error("[profil] create member:", memberError.message);
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
  redirect("/profil");
}
