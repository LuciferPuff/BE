import { NextResponse } from "next/server";

import {
  isValidEmailFormat,
  normalizeSubscriberEmail,
} from "@/lib/subscribe/validate-email";
import { createAuthClient } from "@/lib/supabase/auth-client";
import { getSiteUrlFromRequest } from "@/lib/site";

const OK_MESSAGE =
  "Om adressen finns hos oss skickar vi en inloggningslänk till din inkorg.";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { ok: false, message: "Ogiltig begäran." },
      { status: 400 },
    );
  }

  const rawEmail =
    body && typeof body === "object" && "email" in body
      ? (body as { email: unknown }).email
      : undefined;

  if (!isValidEmailFormat(rawEmail)) {
    return NextResponse.json(
      { ok: false, message: "Ange en giltig e-postadress." },
      { status: 400 },
    );
  }

  const email = normalizeSubscriberEmail(rawEmail);
  const site = getSiteUrlFromRequest(request);
  const redirectTo = `${site}/auth/callback`;

  try {
    const supabase = await createAuthClient();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: redirectTo },
    });

    if (error) {
      console.error("[auth] signInWithOtp:", error.message);
    }
  } catch (err) {
    console.error("[auth] send-magic-link:", err);
    return NextResponse.json(
      { ok: false, message: "Inloggning är inte tillgänglig just nu." },
      { status: 503 },
    );
  }

  return NextResponse.json({ ok: true, message: OK_MESSAGE });
}
