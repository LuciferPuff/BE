import type { SupabaseClient } from "@supabase/supabase-js";

/** False om migration 20260517140000_analyses_user_id.sql inte körts ännu. */
export async function analysesSupportsUserId(
  supabase: SupabaseClient,
): Promise<boolean> {
  const { error } = await supabase.from("analyses").select("user_id").limit(1);
  if (!error) return true;

  const msg = error.message.toLowerCase();
  return !(
    msg.includes("user_id") &&
    (msg.includes("column") || msg.includes("schema cache"))
  );
}
