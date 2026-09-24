"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { linkAnalysisToPropertyWithServiceRole } from "@/lib/analyses/link-to-property";
import { mapAnalysisObjectTypeToPropertyType } from "@/lib/analyses/map-object-type";
import { getSessionUser } from "@/lib/auth/get-session-user";
import { createAnalysesSupabaseClient } from "@/lib/supabase/analyses-client";
import { createAuthClient } from "@/lib/supabase/auth-client";

export type LinkAnalysisState = {
  error?: string;
};

function optionalText(formData: FormData, key: string): string | null {
  const raw = formData.get(key);
  if (typeof raw !== "string") return null;
  const trimmed = raw.trim();
  return trimmed === "" ? null : trimmed;
}

async function assertUserOwnsAnalysis(
  analysisId: string,
  userId: string,
): Promise<
  | { ok: true; address: string; object_type: string }
  | { ok: false; error: string }
> {
  const analyses = createAnalysesSupabaseClient();
  if (!analyses) {
    return { ok: false, error: "Kunde inte hämta analysen just nu." };
  }

  const { data, error } = await analyses
    .from("analyses")
    .select("id, user_id, address, object_type, linked_property_id")
    .eq("id", analysisId)
    .maybeSingle();

  if (error || !data) {
    if (error) console.error("[link-analysis] own check:", error.message);
    return { ok: false, error: "Analysen hittades inte." };
  }
  if (data.user_id !== userId) {
    return { ok: false, error: "Du har inte behörighet till den här analysen." };
  }
  if (data.linked_property_id != null) {
    return {
      ok: false,
      error: "Analysen är redan kopplad till en fastighet.",
    };
  }

  return {
    ok: true,
    address: data.address as string,
    object_type: data.object_type as string,
  };
}

async function assertUserIsPropertyOwner(
  propertyId: string,
  userId: string,
): Promise<boolean> {
  const supabase = await createAuthClient();
  const { data, error } = await supabase
    .from("property_members")
    .select("role")
    .eq("property_id", propertyId)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    console.error("[link-analysis] member check:", error.message);
    return false;
  }
  return data?.role === "agare";
}

async function createPropertyAsOwner(
  userId: string,
  address: string,
  objectType: string,
): Promise<{ ok: true; propertyId: string } | { ok: false; error: string }> {
  const supabase = await createAuthClient();
  const propertyId = crypto.randomUUID();
  const property_type = mapAnalysisObjectTypeToPropertyType(objectType);

  const { error: insertError } = await supabase.from("properties").insert({
    id: propertyId,
    address,
    property_type,
  });

  if (insertError) {
    console.error("[link-analysis] create property:", insertError.message);
    return { ok: false, error: "Kunde inte skapa fastigheten. Försök igen." };
  }

  const { error: memberError } = await supabase.from("property_members").insert({
    property_id: propertyId,
    user_id: userId,
    role: "agare",
  });

  if (memberError) {
    console.error("[link-analysis] create member:", memberError.message);
    await supabase.from("properties").delete().eq("id", propertyId);
    return { ok: false, error: "Kunde inte skapa fastigheten. Försök igen." };
  }

  return { ok: true, propertyId };
}

/**
 * Kopplar användarens analys till en befintlig fastighet (ägare)
 * eller skapar en ny fastighet (prefill från analysen) och kopplar.
 */
export async function linkAnalysisAction(
  _prev: LinkAnalysisState,
  formData: FormData,
): Promise<LinkAnalysisState> {
  const user = await getSessionUser();
  const analysisId = optionalText(formData, "analysis_id");
  if (!user) {
    redirect(
      analysisId
        ? `/logga-in?next=/mina-analyser/${analysisId}`
        : "/logga-in?next=/mina-analyser",
    );
  }
  if (!analysisId) {
    return { error: "Saknar analys." };
  }

  const owned = await assertUserOwnsAnalysis(analysisId, user.id);
  if (!owned.ok) return { error: owned.error };

  const mode = optionalText(formData, "mode") ?? "existing";
  let propertyId: string;

  if (mode === "new") {
    const address =
      optionalText(formData, "address")?.trim() || owned.address;
    if (!address) {
      return { error: "Ange en adress för den nya fastigheten." };
    }
    const created = await createPropertyAsOwner(
      user.id,
      address,
      owned.object_type,
    );
    if (!created.ok) return { error: created.error };
    propertyId = created.propertyId;
  } else {
    const existingId = optionalText(formData, "property_id");
    if (!existingId) {
      return { error: "Välj en fastighet." };
    }
    const isOwner = await assertUserIsPropertyOwner(existingId, user.id);
    if (!isOwner) {
      return {
        error: "Du kan bara koppla till fastigheter där du är ägare.",
      };
    }
    propertyId = existingId;
  }

  const linked = await linkAnalysisToPropertyWithServiceRole(
    analysisId,
    user.id,
    propertyId,
  );
  if (!linked.ok) {
    return { error: linked.error };
  }

  revalidatePath("/profil");
  revalidatePath("/mina-analyser");
  revalidatePath(`/mina-analyser/${analysisId}`);
  redirect("/profil");
}
