import { type NextRequest, NextResponse } from "next/server";
import { createHash } from "node:crypto";
import { cookies } from "next/headers";

import { runClaudeAnalyse } from "@/lib/analyse/anthropic";
import { buildAnalysePrompt } from "@/lib/analyse/claude-prompt";
import { buildInputHashSource } from "@/lib/analyse/build-hash-source";
import {
  computeInputRichness,
  isSignificantlyRicher,
} from "@/lib/analyse/input-richness";
import {
  parseAnalysisJson,
  type AnalysisResult,
} from "@/lib/analyse/parse-analysis-json";
import {
  ERR_ADTEXT_LINK,
  looksLikeListingUrl,
} from "@/lib/analyse/looks-like-listing-url";
import { consumeAnalyseRateSlot } from "@/lib/analyse/rate-limit-ip";
import { createAnalysisEmailToken } from "@/lib/analyses/email-token";
import {
  ANON_ANALYSIS_COOKIE,
  ANON_ANALYSIS_COOKIE_MAX_AGE,
  FREE_ANALYSES_LIMIT,
} from "@/lib/analyses/limits";
import { getSessionUserFromRequest } from "@/lib/auth/get-session-user";
import { sendLeadEvent } from "@/lib/meta/capi";
import { getSiteUrlFromRequest } from "@/lib/site";
import { createAnalysesSupabaseClient } from "@/lib/supabase/analyses-client";

export const maxDuration = 300;

/**
 * Höj med 1 varje gång `lib/analyse/claude-prompt.ts` ändras så cache invalideras.
 */
const CURRENT_PROMPT_VERSION = 3;

const PROPERTY_TYPES = new Set(["Villa", "Kedjehus", "Radhus", "Fritidshus"]);

const CACHE_SELECT =
  "id, result, prompt_version, input_richness, address, object_type, build_year";

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

type CachedResultRow = {
  id: string;
  result: AnalysisResult;
  inputRichness: number;
};

const UTM_MAX_LEN = 200;

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
    code === "42501" ||
    msg.toLowerCase().includes("row-level security") ||
    msg.includes("RLS")
  ) {
    return "Kunde inte spara analysen (behörighet). Kontrollera att SUPABASE_SERVICE_ROLE_KEY på servern är service role-nyckeln, inte anon-nyckeln.";
  }
  return "Kunde inte spara analysen.";
}

async function ensureAnonSessionId(
  userId: string | null,
): Promise<string | null> {
  if (userId) return null;
  const jar = await cookies();
  const existing = jar.get(ANON_ANALYSIS_COOKIE)?.value?.trim();
  if (existing) return existing;
  const id = crypto.randomUUID();
  jar.set(ANON_ANALYSIS_COOKIE, id, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: ANON_ANALYSIS_COOKIE_MAX_AGE,
  });
  return id;
}

async function countUserAnalyses(
  supabase: NonNullable<ReturnType<typeof createAnalysesSupabaseClient>>,
  userId: string,
): Promise<number> {
  const { count, error } = await supabase
    .from("user_analyses")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId);
  if (error) {
    console.error("[analyse] quota count:", error.message);
    return 0;
  }
  return count ?? 0;
}

async function insertUserAnalysis(
  supabase: NonNullable<ReturnType<typeof createAnalysesSupabaseClient>>,
  input: {
    userId: string | null;
    anonSessionId: string | null;
    resultId: string;
    address: string;
    objectType: string;
    buildYear: number;
  },
): Promise<string | null> {
  const { data, error } = await supabase
    .from("user_analyses")
    .insert({
      user_id: input.userId,
      anon_session_id: input.anonSessionId,
      result_id: input.resultId,
      address: input.address,
      object_type: input.objectType,
      build_year: input.buildYear,
    })
    .select("id")
    .maybeSingle();

  if (error) {
    console.error("[analyse] user_analyses insert:", error.message);
    return null;
  }
  return typeof data?.id === "string" ? data.id : null;
}

async function returnAnalysisSuccess(
  request: NextRequest,
  supabase: NonNullable<ReturnType<typeof createAnalysesSupabaseClient>>,
  payload: {
    userAnalysisId: string;
    analysis: AnalysisResult;
    cached: boolean;
  },
): Promise<NextResponse> {
  const ip = clientIp(request);
  const { error: logError } = await supabase.from("analysis_requests").insert({
    analysis_id: payload.userAnalysisId,
    client_ip: ip !== "unknown" ? ip : null,
    cached: payload.cached,
  });
  if (logError) {
    console.error("[analyse] request log:", logError.message);
  }

  let emailToken: string | null = null;
  try {
    emailToken = createAnalysisEmailToken(payload.userAnalysisId);
  } catch (err) {
    console.error("[analyse] email token:", err);
  }

  const eventId = crypto.randomUUID();
  try {
    await sendLeadEvent({
      eventId,
      clientIp: ip,
      userAgent: request.headers.get("user-agent") ?? "",
      eventSourceUrl: `${getSiteUrlFromRequest(request)}/analys`,
    });
  } catch (err) {
    console.error("[analyse] meta CAPI:", err);
  }

  return NextResponse.json({
    ok: true,
    cached: payload.cached,
    analysisId: payload.userAnalysisId,
    emailToken,
    analysis: payload.analysis,
    eventId,
  });
}

async function lookupCache(
  supabase: NonNullable<ReturnType<typeof createAnalysesSupabaseClient>>,
  listingDesignation: string | null,
  inputHash: string,
): Promise<CachedResultRow | null> {
  const query = listingDesignation
    ? supabase
        .from("analysis_results")
        .select(CACHE_SELECT)
        .eq("listing_designation", listingDesignation)
        .eq("prompt_version", CURRENT_PROMPT_VERSION)
        .maybeSingle()
    : supabase
        .from("analysis_results")
        .select(CACHE_SELECT)
        .eq("input_hash", inputHash)
        .is("listing_designation", null)
        .eq("prompt_version", CURRENT_PROMPT_VERSION)
        .maybeSingle();

  const { data, error } = await query;
  if (error) {
    console.error("[analyse] cache lookup:", error.message);
    return null;
  }
  if (!data?.result || typeof data.id !== "string") return null;
  return {
    id: data.id,
    result: data.result as AnalysisResult,
    inputRichness: Number(data.input_richness) || 0,
  };
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

  const listingRaw =
    body.propertyId != null && typeof body.propertyId === "string"
      ? body.propertyId.trim()
      : "";
  const listingDesignation = listingRaw !== "" ? listingRaw : null;

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
  const incomingRichness = computeInputRichness({
    adText,
    sizeSqm,
    askingPrice,
  });
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

  if (userId) {
    const used = await countUserAnalyses(supabase, userId);
    if (used >= FREE_ANALYSES_LIMIT) {
      return NextResponse.json(
        {
          ok: false,
          message: `Du har använt dina ${FREE_ANALYSES_LIMIT} gratisanalyser. Logga in på profilen eller kontakta oss för mer.`,
        },
        { status: 403 },
      );
    }
  }

  const anonSessionId = await ensureAnonSessionId(userId);

  let cachedRow = await lookupCache(supabase, listingDesignation, inputHash);
  let upgradeExistingId: string | null = null;

  if (cachedRow != null) {
    if (isSignificantlyRicher(incomingRichness, cachedRow.inputRichness)) {
      upgradeExistingId = cachedRow.id;
      cachedRow = null;
    } else {
      const userAnalysisId = await insertUserAnalysis(supabase, {
        userId,
        anonSessionId,
        resultId: cachedRow.id,
        address,
        objectType,
        buildYear,
      });
      if (!userAnalysisId) {
        return NextResponse.json(
          { ok: false, message: "Kunde inte spara analysen." },
          { status: 500 },
        );
      }
      return returnAnalysisSuccess(request, supabase, {
        userAnalysisId,
        analysis: cachedRow.result,
        cached: true,
      });
    }
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

  const resultPayload = {
    listing_designation: listingDesignation,
    input_hash: inputHash,
    prompt_version: CURRENT_PROMPT_VERSION,
    result: analysis,
    input_richness: incomingRichness,
    address,
    object_type: objectType,
    build_year: buildYear,
    size_sqm: sizeSqm,
    asking_price: Math.round(askingPrice),
    ad_text: adText,
    updated_at: new Date().toISOString(),
  };

  let resultId: string | null = null;

  if (upgradeExistingId != null) {
    const { data, error } = await supabase
      .from("analysis_results")
      .update(resultPayload)
      .eq("id", upgradeExistingId)
      .select("id")
      .maybeSingle();
    if (error) {
      console.error("[analyse] cache upgrade:", error.message);
      return NextResponse.json(
        { ok: false, message: persistFailureMessage(error) },
        { status: 500 },
      );
    }
    resultId = typeof data?.id === "string" ? data.id : upgradeExistingId;
  } else {
    const insertRes = await supabase
      .from("analysis_results")
      .insert({
        ...resultPayload,
        created_at: new Date().toISOString(),
      })
      .select("id")
      .maybeSingle();

    if (insertRes.error?.code === "23505") {
      const existing = await lookupCache(
        supabase,
        listingDesignation,
        inputHash,
      );
      if (existing) {
        resultId = existing.id;
        analysis = existing.result;
      } else {
        console.error("[analyse] cache conflict:", insertRes.error.message);
        return NextResponse.json(
          { ok: false, message: persistFailureMessage(insertRes.error) },
          { status: 500 },
        );
      }
    } else if (insertRes.error) {
      console.error("[analyse] cache insert:", insertRes.error.message);
      return NextResponse.json(
        { ok: false, message: persistFailureMessage(insertRes.error) },
        { status: 500 },
      );
    } else {
      resultId =
        typeof insertRes.data?.id === "string" ? insertRes.data.id : null;
    }
  }

  if (!resultId) {
    return NextResponse.json(
      { ok: false, message: "Kunde inte spara analysen." },
      { status: 500 },
    );
  }

  const userAnalysisId = await insertUserAnalysis(supabase, {
    userId,
    anonSessionId,
    resultId,
    address,
    objectType,
    buildYear,
  });
  if (!userAnalysisId) {
    return NextResponse.json(
      { ok: false, message: "Kunde inte spara analysen." },
      { status: 500 },
    );
  }

  // UTM logged on first creation path only (best-effort, unused in new schema columns —
  // kept out of cache key). Future: add utm columns to user_analyses if needed.
  void cleanUtm(body.utm?.utm_source);
  void cleanUtm(body.utm?.utm_medium);
  void cleanUtm(body.utm?.utm_campaign);

  return returnAnalysisSuccess(request, supabase, {
    userAnalysisId,
    analysis,
    cached: false,
  });
}
