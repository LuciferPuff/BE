import { NextResponse } from "next/server";

import {
  isValidEmailFormat,
  normalizeSubscriberEmail,
} from "@/lib/subscribe/validate-email";
import {
  AUTH_NEXT_COOKIE,
  authNextCookieOptions,
} from "@/lib/auth/auth-next-cookie";
import { safeNextPath } from "@/lib/auth/safe-next-path";
import { createAuthClient } from "@/lib/supabase/auth-client";
import { getSiteUrlFromRequest } from "@/lib/site";

const OK_MESSAGE =
  "Om adressen finns hos oss skickar vi en inloggningslänk till din inkorg.";

function messageForAuthError(
  code: string | undefined,
  message: string,
  fallback: string,
): string {
  if (code === "over_email_send_rate_limit") {
    return "För många e-postförsök. Vänta en stund och försök igen.";
  }
  if (code === "email_address_invalid") {
    return "Ange en giltig e-postadress.";
  }
  if (
    message.toLowerCase().includes("not authorized") ||
    message.toLowerCase().includes("inte auktoriserad")
  ) {
    return "E-post kan inte skickas till den här adressen ännu (Supabase kräver Custom SMTP för alla mottagare).";
  }
  if (message.toLowerCase().includes("requested path is invalid")) {
    return "Inloggningslänken kunde inte skapas. Kontrollera att Redirect URLs i Supabase innehåller exakt din callback-URL (t.ex. …/auth/callback).";
  }
  return fallback;
}

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
  const rawNext =
    body && typeof body === "object" && "next" in body
      ? (body as { next: unknown }).next
      : undefined;
  const next =
    typeof rawNext === "string" ? safeNextPath(rawNext) : "/analys";
  // Supabase kräver exakt match i Redirect URLs – inga query-parametrar här.
  const redirectTo = `${site}/auth/callback`;

  try {
    const supabase = await createAuthClient();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: redirectTo },
    });

    if (error) {
      console.error("[auth] signInWithOtp:", {
        message: error.message,
        code: error.code,
        redirectTo,
      });
      const message = messageForAuthError(
        error.code,
        error.message,
        "Kunde inte skicka inloggningslänk just nu. Försök igen om en stund.",
      );
      const status = error.code === "over_email_send_rate_limit" ? 429 : 503;
      return NextResponse.json({ ok: false, message }, { status });
    }
  } catch (err) {
    console.error("[auth] send-magic-link:", err);
    return NextResponse.json(
      { ok: false, message: "Inloggning är inte tillgänglig just nu." },
      { status: 503 },
    );
  }

  const response = NextResponse.json({ ok: true, message: OK_MESSAGE });
  if (next !== "/analys") {
    response.cookies.set(AUTH_NEXT_COOKIE, next, authNextCookieOptions);
  }
  return response;
}
