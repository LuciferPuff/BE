import { type NextRequest, NextResponse } from "next/server";

import { sendAnalysisEmail } from "@/lib/analyse/send-analysis-email";
import { consumeEmailAnalysisSlot } from "@/lib/analyse/rate-limit-email";
import type { AnalysisResult } from "@/lib/analyse/parse-analysis-json";
import { verifyAnalysisEmailToken } from "@/lib/analyses/email-token";
import { sendSubscriberWelcomeEmail } from "@/lib/subscribe/send-welcome-email";
import {
  isValidEmailFormat,
  normalizeSubscriberEmail,
} from "@/lib/subscribe/validate-email";
import { getSessionUserFromRequest } from "@/lib/auth/get-session-user";
import { createAnalysesSupabaseClient } from "@/lib/supabase/analyses-client";

type Body = {
  analysisId?: unknown;
  email?: unknown;
  subscribe?: unknown;
  emailToken?: unknown;
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
  const subscribe = body.subscribe === true;
  const emailToken =
    typeof body.emailToken === "string" ? body.emailToken.trim() : "";

  const sessionUser = await getSessionUserFromRequest(request);
  const tokenOk = emailToken
    ? verifyAnalysisEmailToken(emailToken)
    : null;
  const tokenMatches =
    tokenOk != null && tokenOk.userAnalysisId === analysisId;

  if (!tokenMatches && !sessionUser) {
    return NextResponse.json(
      { ok: false, message: "Ogiltig eller utgången länk. Kör analysen igen." },
      { status: 401 },
    );
  }

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

  const { data: ua, error: uaError } = await supabase
    .from("user_analyses")
    .select("id, user_id, analysis_results(result, address)")
    .eq("id", analysisId)
    .maybeSingle();

  if (uaError) {
    console.error("[analyse-email] hämta analys:", uaError.message);
    return NextResponse.json(
      { ok: false, message: "Något gick fel. Försök igen senare." },
      { status: 500 },
    );
  }
  if (!ua) {
    return NextResponse.json(
      { ok: false, message: "Analysen kunde inte hittas." },
      { status: 404 },
    );
  }

  if (!tokenMatches) {
    if (!sessionUser || ua.user_id !== sessionUser.id) {
      return NextResponse.json(
        { ok: false, message: "Du har inte behörighet till den här analysen." },
        { status: 403 },
      );
    }
  }

  const embedded = ua.analysis_results as
    | { result: AnalysisResult; address: string }
    | { result: AnalysisResult; address: string }[]
    | null;
  const row = Array.isArray(embedded) ? embedded[0] : embedded;
  if (!row?.result) {
    return NextResponse.json(
      { ok: false, message: "Analysen kunde inte hittas." },
      { status: 404 },
    );
  }

  const analysis = row.result;
  const address =
    typeof row.address === "string" ? row.address : "";

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

  const { error: logError } = await supabase
    .from("analysis_email_requests")
    .insert({ analysis_id: analysisId, email, subscribed: subscribe });
  if (logError) {
    console.error("[analyse-email] logg:", logError.message);
  }

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
