import { type NextRequest, NextResponse } from "next/server";
import { createHash } from "node:crypto";

import { runClaudeAnalyse } from "@/lib/analyse/anthropic";
import { buildAnalysePrompt } from "@/lib/analyse/claude-prompt";
import { buildInputHashSource } from "@/lib/analyse/build-hash-source";
import {
  parseAnalysisJson,
  type AnalysisResult,
} from "@/lib/analyse/parse-analysis-json";
import { attachUserIdIfNeeded } from "@/lib/analyses/attach-user-id";
import { fetchAnalysisUserId } from "@/lib/analyses/fetch-analysis-user-id";
import { analysesSupportsUserId } from "@/lib/analyses/user-id-column";
import {
  ERR_ADTEXT_LINK,
  looksLikeListingUrl,
} from "@/lib/analyse/looks-like-listing-url";
import { consumeAnalyseRateSlot } from "@/lib/analyse/rate-limit-ip";
import { getSessionUserFromRequest } from "@/lib/auth/get-session-user";
import { sendLeadEvent } from "@/lib/meta/capi";
import { getSiteUrlFromRequest } from "@/lib/site";
import { createAnalysesSupabaseClient } from "@/lib/supabase/analyses-client";

export const maxDuration = 300;

/**
 * Höj med 1 varje gång `lib/analyse/claude-prompt.ts` ändras så cache i Supabase
 * invalideras. Rutin: bump → commit/push → redeploy Vercel.
 */
const CURRENT_PROMPT_VERSION = 3;

const PROPERTY_TYPES = new Set(["Villa", "Kedjehus", "Radhus", "Fritidshus"]);

const CACHE_SELECT = "id, result, prompt_version";

type Utm = {
  utm_source?: unknown;
  utm_medium?: unknown;
  utm_campaign?: unknown;
};

type Body = {
  address?: string;
  propertyId?: string | null;
  objectType?: string;
  buildYear?: number;
  sizeSqm?: number;
  askingPrice?: number;
  adText?: string;
  utm?: Utm;
};

const UTM_MAX_LEN = 200;

/**
 * BYG-74: UTM kommer från URL:en och är otillförlitlig användarindata. Trimma,
 * trunkera till en rimlig längd och låt tomt bli null. Sparas via parametriserad
 * Supabase-insert; visas aldrig oescapad i någon vy.
 */
function cleanUtm(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim().slice(0, UTM_MAX_LEN);
  return trimmed === "" ? null : trimmed;
}

function computeInputHash(
  address: string,
  buildYear: number,
  objectType: string,
): string {
  const source = buildInputHashSource(address, buildYear, objectType);
  return createHash("sha256").update(source, "utf8").digest("hex");
}

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

function persistFailureMessage(
  err: { message?: string; code?: string } | null,
): string {
  const msg = typeof err?.message === "string" ? err.message : "";
  const code = typeof err?.code === "string" ? err.code : "";

  if (
    msg.includes("prompt_version") ||
    msg.includes("user_id") ||
    (msg.toLowerCase().includes("column") &&
      msg.toLowerCase().includes("schema cache"))
  ) {
    return "Databasen saknar en kolumn (prompt_version eller user_id). Kör Supabase-migrationerna, t.ex. supabase db push, och ev. ”Reload schema” under API-inställningar.";
  }
  if (
    code === "42501" ||
    msg.toLowerCase().includes("row-level security") ||
    msg.includes("RLS")
  ) {
    return "Kunde inte spara analysen (behörighet). Kontrollera att SUPABASE_SERVICE_ROLE_KEY på servern är service role-nyckeln, inte anon-nyckeln.";
  }
  return "Kunde inte spara analysen.";
}

async function returnAnalysisSuccess(
  request: NextRequest,
  payload: {
    analysisId: string;
    analysis: AnalysisResult;
    cached: boolean;
  },
): Promise<NextResponse> {
  const eventId = crypto.randomUUID();
  try {
    await sendLeadEvent({
      eventId,
      clientIp: clientIp(request),
      userAgent: request.headers.get("user-agent") ?? "",
      eventSourceUrl: `${getSiteUrlFromRequest(request)}/analys`,
    });
  } catch (err) {
    console.error("[analyse] meta CAPI:", err);
  }
  return NextResponse.json({
    ok: true,
    cached: payload.cached,
    analysisId: payload.analysisId,
    analysis: payload.analysis,
    eventId,
  });
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

  const address = typeof body.address === "string" ? body.address.trim() : "";
  const adText = typeof body.adText === "string" ? body.adText.trim() : "";
  const objectType =
    typeof body.objectType === "string" ? body.objectType.trim() : "";
  const buildYear =
    typeof body.buildYear === "number" && Number.isFinite(body.buildYear)
      ? body.buildYear
      : NaN;
  const sizeSqm =
    typeof body.sizeSqm === "number" && Number.isFinite(body.sizeSqm)
      ? body.sizeSqm
      : NaN;
  const askingPrice =
    typeof body.askingPrice === "number" && Number.isFinite(body.askingPrice)
      ? body.askingPrice
      : NaN;

  const propertyIdRaw =
    body.propertyId != null && typeof body.propertyId === "string"
      ? body.propertyId.trim()
      : "";
  const propertyId = propertyIdRaw !== "" ? propertyIdRaw : null;

  if (!address || address.length < 5) {
    return NextResponse.json({ error: "Adress saknas." }, { status: 400 });
  }
  if (!PROPERTY_TYPES.has(objectType)) {
    return NextResponse.json(
      { ok: false, message: "Ogiltig objekttyp." },
      { status: 400 },
    );
  }
  if (
    !Number.isFinite(buildYear) ||
    buildYear < 1800 ||
    buildYear > 2026
  ) {
    return NextResponse.json(
      { error: "Ange ett rimligt byggnadsår." },
      { status: 400 },
    );
  }
  if (!Number.isFinite(sizeSqm) || sizeSqm <= 0) {
    return NextResponse.json(
      { ok: false, message: "Ogiltig storlek." },
      { status: 400 },
    );
  }
  if (!Number.isFinite(askingPrice) || askingPrice < 0) {
    return NextResponse.json(
      { ok: false, message: "Ogiltigt pris." },
      { status: 400 },
    );
  }
  if (looksLikeListingUrl(adText)) {
    return NextResponse.json({ error: ERR_ADTEXT_LINK }, { status: 400 });
  }
  if (!adText || adText.length < 100) {
    return NextResponse.json(
      {
        error:
          "Klistra in mer information från annonsen – minst 100 tecken krävs för en träffsäker analys.",
      },
      { status: 400 },
    );
  }

  const inputHash = computeInputHash(address, buildYear, objectType);
  const sessionUser = await getSessionUserFromRequest(request);
  const userId = sessionUser?.id ?? null;

  const supabase = createAnalysesSupabaseClient();
  if (!supabase) {
    return NextResponse.json(
      {
        ok: false,
        message:
          "Serverkonfiguration saknas (NEXT_PUBLIC_SUPABASE_URL och SUPABASE_SERVICE_ROLE_KEY).",
      },
      { status: 503 },
    );
  }

  const supportsUserId = await analysesSupportsUserId(supabase);
  if (userId && !supportsUserId) {
    console.warn(
      "[analyse] user_id-kolumn saknas – kör migration 20260517140000_analyses_user_id.sql",
    );
  }
  if (!userId) {
    console.warn(
      "[analyse] ingen session i API – analys sparas utan koppling till konto (kolla auth-cookies)",
    );
  }

  let cachedRow: { id: string; result: AnalysisResult } | null = null;

  if (propertyId != null) {
    const { data, error } = await supabase
      .from("analyses")
      .select(CACHE_SELECT)
      .eq("property_id", propertyId)
      .maybeSingle();
    if (error) {
      console.error("[analyse] cache property_id:", error.message);
      return NextResponse.json(
        { ok: false, message: persistFailureMessage(error) },
        { status: 500 },
      );
    }
    const pv = Number(data?.prompt_version);
    if (
      data?.result != null &&
      typeof data.id === "string" &&
      Number.isFinite(pv) &&
      pv === CURRENT_PROMPT_VERSION
    ) {
      cachedRow = {
        id: data.id,
        result: data.result as AnalysisResult,
      };
    }
  } else {
    const { data, error } = await supabase
      .from("analyses")
      .select(CACHE_SELECT)
      .eq("input_hash", inputHash)
      .is("property_id", null)
      .maybeSingle();
    if (error) {
      console.error("[analyse] cache input_hash:", error.message);
      return NextResponse.json(
        { ok: false, message: persistFailureMessage(error) },
        { status: 500 },
      );
    }
    const pv = Number(data?.prompt_version);
    if (
      data?.result != null &&
      typeof data.id === "string" &&
      Number.isFinite(pv) &&
      pv === CURRENT_PROMPT_VERSION
    ) {
      cachedRow = {
        id: data.id,
        result: data.result as AnalysisResult,
      };
    }
  }

  if (cachedRow != null) {
    if (supportsUserId) {
      const existingUserId = await fetchAnalysisUserId(supabase, cachedRow.id);
      await attachUserIdIfNeeded(
        supabase,
        cachedRow.id,
        userId,
        existingUserId,
      );
    }
    return returnAnalysisSuccess(request, {
      analysisId: cachedRow.id,
      analysis: cachedRow.result,
      cached: true,
    });
  }

  const ip = clientIp(request);
  if (!consumeAnalyseRateSlot(ip)) {
    return NextResponse.json(
      {
        ok: false,
        message: "Du har nått max antal analyser för idag. Försök imorgon.",
      },
      { status: 429 },
    );
  }

  if (!process.env.ANTHROPIC_API_KEY?.trim()) {
    return NextResponse.json(
      { ok: false, message: "Saknar ANTHROPIC_API_KEY på servern." },
      { status: 503 },
    );
  }

  const prompt = buildAnalysePrompt({
    address,
    objectType,
    buildYear,
    sizeSqm,
    askingPrice: Math.round(askingPrice),
    adText,
  });

  let analysis: AnalysisResult;
  try {
    const raw = await runClaudeAnalyse(prompt);
    analysis = parseAnalysisJson(raw);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Analys misslyckades";
    console.error("[analyse] Claude/parse:", msg);
    return NextResponse.json(
      { ok: false, message: "Kunde inte ta fram analysen. Försök igen senare." },
      { status: 502 },
    );
  }

  // BYG-74: UTM loggas enbart – ingår aldrig i input_hash, cache eller
  // prompt_version. Samma rowPayload används för både insert och update vid
  // cache-miss, så UTM täcks av båda vägarna.
  const rowPayload: Record<string, unknown> = {
    property_id: propertyId,
    input_hash: inputHash,
    address,
    object_type: objectType,
    build_year: buildYear,
    size_sqm: sizeSqm,
    asking_price: Math.round(askingPrice),
    ad_text: adText,
    result: analysis,
    prompt_version: CURRENT_PROMPT_VERSION,
    utm_source: cleanUtm(body.utm?.utm_source) ?? "direkt",
    utm_medium: cleanUtm(body.utm?.utm_medium),
    utm_campaign: cleanUtm(body.utm?.utm_campaign),
  };
  if (supportsUserId) {
    rowPayload.user_id = userId;
  }

  let savedId: string | null = null;
  const insertRes = await supabase
    .from("analyses")
    .insert(rowPayload)
    .select("id")
    .maybeSingle();

  let persistError = insertRes.error;

  if (persistError?.code === "23505") {
    const upd = propertyId
      ? await supabase
          .from("analyses")
          .update(rowPayload)
          .eq("property_id", propertyId)
          .select("id")
          .maybeSingle()
      : await supabase
          .from("analyses")
          .update(rowPayload)
          .eq("input_hash", inputHash)
          .is("property_id", null)
          .select("id")
          .maybeSingle();
    persistError = upd.error;
    if (typeof upd.data?.id === "string") {
      savedId = upd.data.id;
    }
  } else if (typeof insertRes.data?.id === "string") {
    savedId = insertRes.data.id;
  }

  if (savedId == null && persistError == null) {
    const refetch = propertyId
      ? await supabase
          .from("analyses")
          .select("id")
          .eq("property_id", propertyId)
          .maybeSingle()
      : await supabase
          .from("analyses")
          .select("id")
          .eq("input_hash", inputHash)
          .is("property_id", null)
          .maybeSingle();
    if (typeof refetch.data?.id === "string") {
      savedId = refetch.data.id;
    } else {
      console.error(
        "[analyse] insert returned no id and refetch missed:",
        JSON.stringify({
          insertError: insertRes.error,
          insertData: insertRes.data,
        }),
      );
    }
  }

  if (persistError) {
    if (persistError.code === "23505") {
      const { data: again } = propertyId
        ? await supabase
            .from("analyses")
            .select(CACHE_SELECT)
            .eq("property_id", propertyId)
            .maybeSingle()
        : await supabase
            .from("analyses")
            .select(CACHE_SELECT)
            .eq("input_hash", inputHash)
            .is("property_id", null)
            .maybeSingle();
      const againPv = Number(again?.prompt_version);
      if (
        again?.result != null &&
        typeof again.id === "string" &&
        Number.isFinite(againPv) &&
        againPv === CURRENT_PROMPT_VERSION
      ) {
        if (supportsUserId) {
          const existingUserId = await fetchAnalysisUserId(supabase, again.id);
          await attachUserIdIfNeeded(supabase, again.id, userId, existingUserId);
        }
        return returnAnalysisSuccess(request, {
          analysisId: again.id,
          analysis: again.result as AnalysisResult,
          cached: true,
        });
      }
    }
    console.error(
      "[analyse] insert/update:",
      persistError.message,
      persistError.code,
    );
    return NextResponse.json(
      { ok: false, message: persistFailureMessage(persistError) },
      { status: 500 },
    );
  }

  if (savedId == null) {
    console.error("[analyse] insert/update: missing id after persist");
    return NextResponse.json(
      { ok: false, message: "Kunde inte spara analysen." },
      { status: 500 },
    );
  }

  if (supportsUserId) {
    await attachUserIdIfNeeded(supabase, savedId, userId, null);
  }

  return returnAnalysisSuccess(request, {
    analysisId: savedId,
    analysis,
    cached: false,
  });
}
