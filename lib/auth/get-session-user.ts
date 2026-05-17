import { createAuthClient } from "@/lib/supabase/auth-client";

export async function getSessionUser() {
  const supabase = await createAuthClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return null;
  return data.user;
}
