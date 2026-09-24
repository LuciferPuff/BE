import { createAnalysesSupabaseClient } from "@/lib/supabase/analyses-client";

/**
 * Sätter analyses.linked_property_id via service role.
 * Anroparen MÅSTE redan ha verifierat: session-användare äger analysen
 * och är agare på fastigheten.
 */
export async function linkAnalysisToPropertyWithServiceRole(
  analysisId: string,
  userId: string,
  propertyId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = createAnalysesSupabaseClient();
  if (!supabase) {
    return { ok: false, error: "Kunde inte koppla analysen just nu." };
  }

  const { data: row, error: readError } = await supabase
    .from("analyses")
    .select("id, user_id, linked_property_id")
    .eq("id", analysisId)
    .maybeSingle();

  if (readError) {
    console.error("[link-analysis] read:", readError.message);
    return { ok: false, error: "Kunde inte hämta analysen." };
  }
  if (!row) {
    return { ok: false, error: "Analysen hittades inte." };
  }
  if (row.user_id !== userId) {
    return { ok: false, error: "Du har inte behörighet till den här analysen." };
  }
  if (
    row.linked_property_id != null &&
    row.linked_property_id !== propertyId
  ) {
    return {
      ok: false,
      error: "Analysen är redan kopplad till en annan fastighet.",
    };
  }
  if (row.linked_property_id === propertyId) {
    return { ok: true };
  }

  const { error: updateError } = await supabase
    .from("analyses")
    .update({ linked_property_id: propertyId })
    .eq("id", analysisId)
    .eq("user_id", userId)
    .is("linked_property_id", null);

  if (updateError) {
    console.error("[link-analysis] update:", updateError.message);
    return { ok: false, error: "Kunde inte koppla analysen. Försök igen." };
  }

  return { ok: true };
}
