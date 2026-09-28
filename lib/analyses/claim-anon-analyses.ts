import "server-only";

import { createAnalysesSupabaseClient } from "@/lib/supabase/analyses-client";

/**
 * Claims anonymous user_analyses for the logged-in user (service role).
 * Idempotent: only rows with user_id IS NULL.
 */
export async function claimAnonUserAnalyses(
  userId: string,
  anonSessionId: string | null | undefined,
): Promise<void> {
  if (!anonSessionId?.trim()) return;

  const supabase = createAnalysesSupabaseClient();
  if (!supabase) return;

  const { error } = await supabase
    .from("user_analyses")
    .update({ user_id: userId })
    .eq("anon_session_id", anonSessionId.trim())
    .is("user_id", null);

  if (error) {
    console.error("[analyses] claim anon:", error.message);
  }
}
