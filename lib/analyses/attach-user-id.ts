import type { SupabaseClient } from "@supabase/supabase-js";

/** Kopplar inloggad användare till cachad analys om raden saknar user_id. */
export async function attachUserIdIfNeeded(
  supabase: SupabaseClient,
  analysisId: string,
  userId: string | null,
  existingUserId: string | null | undefined,
): Promise<void> {
  if (!userId || existingUserId) return;

  const { error } = await supabase
    .from("analyses")
    .update({ user_id: userId })
    .eq("id", analysisId)
    .is("user_id", null);

  if (error) {
    console.error("[analyses] attach user_id:", error.message);
  }
}
