import { NextResponse } from "next/server";

import { createAuthClient } from "@/lib/supabase/auth-client";
import { getSiteUrl } from "@/lib/site";

export async function GET(request: Request) {
  const site = getSiteUrl();
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");

  if (!code) {
    return NextResponse.redirect(
      new URL("/logga-in?error=auth", site),
    );
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

  return NextResponse.redirect(new URL("/analys", site));
}
