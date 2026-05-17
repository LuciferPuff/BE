import { NextResponse } from "next/server";

import { createAuthClient } from "@/lib/supabase/auth-client";
import { getSiteUrl } from "@/lib/site";

export async function POST() {
  try {
    const supabase = await createAuthClient();
    await supabase.auth.signOut();
  } catch (err) {
    console.error("[auth] logout:", err);
  }

  return NextResponse.redirect(new URL("/", getSiteUrl()), 303);
}
