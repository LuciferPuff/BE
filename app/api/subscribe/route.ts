import { NextResponse } from "next/server";

import { sendSubscriberWelcomeEmail } from "@/lib/subscribe/send-welcome-email";
import {
  isValidEmailFormat,
  normalizeSubscriberEmail,
} from "@/lib/subscribe/validate-email";
import { createSubscribeSupabaseClient } from "@/lib/supabase/subscribe-client";

const OK_MESSAGE =
  "Tack! Vi har tagit emot din adress och håller dig uppdaterad.";

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

  const consent =
    body && typeof body === "object" && "consent" in body
      ? (body as { consent: unknown }).consent
      : undefined;

  if (consent !== true) {
    return NextResponse.json(
      {
        ok: false,
        message: "Du måste godkänna integritetspolicyn för att fortsätta.",
      },
      { status: 400 },
    );
  }

  const email = normalizeSubscriberEmail(rawEmail);

  const supabase = createSubscribeSupabaseClient();
  if (!supabase) {
    return NextResponse.json(
      { ok: false, message: "Prenumeration är tillfälligt otillgänglig." },
      { status: 503 },
    );
  }

  const unsubscribeToken = crypto.randomUUID();
  const consentAt = new Date().toISOString();

  const { error } = await supabase.from("subscribers").insert({
    email,
    consent_at: consentAt,
    unsubscribe_token: unsubscribeToken,
  });

  if (error) {
    if (error.code === "23505") {
      return NextResponse.json({ ok: true, message: OK_MESSAGE });
    }
    console.error("[subscribe] Supabase:", error.message);
    return NextResponse.json(
      { ok: false, message: "Något gick fel. Försök igen senare." },
      { status: 500 },
    );
  }

  await sendSubscriberWelcomeEmail(email, unsubscribeToken);

  return NextResponse.json({ ok: true, message: OK_MESSAGE });
}
