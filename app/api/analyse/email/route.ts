import { type NextRequest, NextResponse } from "next/server";

import { sendAnalysisEmail } from "@/lib/analyse/send-analysis-email";
import { consumeEmailAnalysisSlot } from "@/lib/analyse/rate-limit-email";
import type { AnalysisResult } from "@/lib/analyse/parse-analysis-json";
import { sendSubscriberWelcomeEmail } from "@/lib/subscribe/send-welcome-email";
import {
  isValidEmailFormat,
  normalizeSubscriberEmail,
} from "@/lib/subscribe/validate-email";
import { createAnalysesSupabaseClient } from "@/lib/supabase/analyses-client";

type Body = {
  analysisId?: unknown;
  email?: unknown;
  subscribe?: unknown;
};

function clientIp(request: Request): string {
  const fwd = request.headers.get("x-forwarded-for");
  if (fwd) {
    const first = fwd.split(",")[0]?.trim();
    if (first) return first;
  }
  const real = request.headers.get("x-real-ip");
  if (real?.trim()) return real.trim();
  return "unknown";
}

export async function POST(request: NextRequest) {
  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return NextResponse.json(
      { ok: false, message: "Ogiltig begäran." },
      { status: 400 },
    );
  }

  const analysisId =
    typeof body.analysisId === "string" ? body.analysisId.trim() : "";
  if (analysisId === "") {
    return NextResponse.json(
      { ok: false, message: "Analys saknas." },
      { status: 400 },
    );
  }

  if (!isValidEmailFormat(body.email)) {
    return NextResponse.json(
      { ok: false, message: "Ange en giltig e-postadress." },
      { status: 400 },
    );
  }
  const email = normalizeSubscriberEmail(body.email);

  // Marknadsföringssamtycke: enbart explicit true. Defaultar till false.
  const subscribe = body.subscribe === true;

  if (!consumeEmailAnalysisSlot(clientIp(request))) {
    return NextResponse.json(
      {
        ok: false,
        message: "Du har skickat för många mejl idag. Försök igen imorgon.",
      },
      { status: 429 },
    );
  }

  const supabase = createAnalysesSupabaseClient();
  if (!supabase) {
    return NextResponse.json(
      { ok: false, message: "Tjänsten är tillfälligt otillgänglig." },
      { status: 503 },
    );
  }

  // Hämta analysinnehållet server-side – lita aldrig på innehåll från klienten.
  const { data, error } = await supabase
    .from("analyses")
    .select("id, result, address")
    .eq("id", analysisId)
    .maybeSingle();

  if (error) {
    console.error("[analyse-email] hämta analys:", error.message);
    return NextResponse.json(
      { ok: false, message: "Något gick fel. Försök igen senare." },
      { status: 500 },
    );
  }
  if (!data || data.result == null) {
    return NextResponse.json(
      { ok: false, message: "Analysen kunde inte hittas." },
      { status: 404 },
    );
  }

  const analysis = data.result as AnalysisResult;
  const address = typeof data.address === "string" ? data.address : "";

  // Analys-mejlet är den begärda tjänsten – fel surfas till användaren.
  const sent = await sendAnalysisEmail(email, analysis, address);
  if (!sent) {
    return NextResponse.json(
      {
        ok: false,
        message: "Kunde inte skicka analysen just nu. Försök igen om en stund.",
      },
      { status: 502 },
    );
  }

  // Logg (best-effort) – får inte blockera svaret.
  const { error: logError } = await supabase
    .from("analysis_email_requests")
    .insert({ analysis_id: analysisId, email, subscribed: subscribe });
  if (logError) {
    console.error("[analyse-email] logg:", logError.message);
  }

  // Prenumeration: separat samtycke, får fela tyst (påverkar inte analys-svaret).
  if (subscribe) {
    const unsubscribeToken = crypto.randomUUID();
    const { error: subError } = await supabase.from("subscribers").insert({
      email,
      consent_at: new Date().toISOString(),
      unsubscribe_token: unsubscribeToken,
    });
    if (subError) {
      if (subError.code !== "23505") {
        console.error("[analyse-email] prenumeration:", subError.message);
      }
    } else {
      await sendSubscriberWelcomeEmail(email, unsubscribeToken);
    }
  }

  return NextResponse.json({ ok: true, subscribed: subscribe });
}
