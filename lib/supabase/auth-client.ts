import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

import { getSupabasePublishableKey, getSupabaseUrl } from "@/lib/supabase/auth-env";

/** Server-side Supabase-klient med session-cookies (Auth). */
export async function createAuthClient() {
  const url = getSupabaseUrl();
  const key = getSupabasePublishableKey();
  if (!url || !key) {
    throw new Error(
      "Supabase Auth saknar NEXT_PUBLIC_SUPABASE_URL eller publishable key.",
    );
  }

  const cookieStore = await cookies();

  return createServerClient(url, key, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options),
          );
        } catch {
          // Server Components kan inte sätta cookies – middleware uppdaterar session.
        }
      },
    },
  });
}
