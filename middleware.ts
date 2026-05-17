import { type NextRequest, NextResponse } from "next/server";

import { updateSession } from "@/lib/supabase/auth-middleware";

export async function middleware(request: NextRequest) {
  const session = updateSession(request);
  if (session instanceof NextResponse) return session;

  const { supabase, response } = session;
  await supabase.auth.getUser();
  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|studio|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
