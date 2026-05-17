import type { NextRequest } from "next/server";

import { createAuthClient } from "@/lib/supabase/auth-client";
import { createAuthClientFromRequest } from "@/lib/supabase/auth-request";

/** Server Components / sidor – cookies() från next/headers. */
export async function getSessionUser() {
  const supabase = await createAuthClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return null;
  return data.user;
}

/** Route Handlers – session från request och/eller next/headers cookies. */
export async function getSessionUserFromRequest(request: NextRequest) {
  const { supabase: fromRequest } = createAuthClientFromRequest(request);
  const fromReq = await fromRequest.auth.getUser();
  if (fromReq.data.user) return fromReq.data.user;

  const fromHeaders = await createAuthClient();
  const { data, error } = await fromHeaders.auth.getUser();
  if (error || !data.user) return null;
  return data.user;
}
