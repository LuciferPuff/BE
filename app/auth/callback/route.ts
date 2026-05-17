import { NextResponse } from "next/server";

import { cookies } from "next/headers";

import {
  AUTH_NEXT_COOKIE,
  authNextCookieOptions,
} from "@/lib/auth/auth-next-cookie";
import { safeNextPath } from "@/lib/auth/safe-next-path";
import { createAuthClient } from "@/lib/supabase/auth-client";

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const site = requestUrl.origin;
  const { searchParams } = requestUrl;
  const code = searchParams.get("code");

  if (!code) {
    return NextResponse.redirect(new URL("/logga-in?error=auth", site));
  }

  try {
    const supabase = await createAuthClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (error) {
      console.error("[auth] exchangeCodeForSession:", error.message);
      return NextResponse.redirect(
        new URL("/logga-in?error=auth", site),
      );
    }
  } catch (err) {
    console.error("[auth] callback:", err);
    return NextResponse.redirect(new URL("/logga-in?error=auth", site));
  }

  const cookieStore = await cookies();
  const nextFromCookie = cookieStore.get(AUTH_NEXT_COOKIE)?.value;
  const next = safeNextPath(nextFromCookie ?? searchParams.get("next"));

  const response = NextResponse.redirect(new URL(next, site));
  response.cookies.set(AUTH_NEXT_COOKIE, "", { ...authNextCookieOptions, maxAge: 0 });
  return response;
}
