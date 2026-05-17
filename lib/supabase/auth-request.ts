import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";

import { getSupabasePublishableKey, getSupabaseUrl } from "@/lib/supabase/auth-env";

/**
 * Auth-klient för Route Handlers – läser session från request.cookies
 * och kan uppdatera Set-Cookie på JSON-svaret.
 */
function requestCookieStore(request: NextRequest) {
  return request.cookies;
}

export function createAuthClientFromRequest(request: NextRequest) {
  const url = getSupabaseUrl();
  const key = getSupabasePublishableKey();
  if (!url || !key) {
    throw new Error(
      "Supabase Auth saknar NEXT_PUBLIC_SUPABASE_URL eller publishable key.",
    );
  }

  const cookieStore = requestCookieStore(request);
  let cookieResponse = NextResponse.next({ request });

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => {
          cookieStore.set(name, value);
        });
        cookieResponse = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => {
          cookieResponse.cookies.set(name, value, options);
        });
      },
    },
  });

  function applyAuthCookies(target: NextResponse) {
    cookieResponse.cookies.getAll().forEach((cookie) => {
      target.cookies.set(cookie);
    });
  }

  return { supabase, applyAuthCookies };
}
