import { NextResponse } from "next/server";
import { createHash } from "node:crypto";

import { runClaudeAnalyse } from "@/lib/analyse/anthropic";
import { buildAnalysePrompt } from "@/lib/analyse/claude-prompt";
import { buildInputHashSource } from "@/lib/analyse/build-hash-source";
import {
  parseAnalysisJson,
  type AnalysisResult,
} from "@/lib/analyse/parse-analysis-json";
import { attachUserIdIfNeeded } from "@/lib/analyses/attach-user-id";
import { consumeAnalyseRateSlot } from "@/lib/analyse/rate-limit-ip";
import { getSessionUser } from "@/lib/auth/get-session-user";
import { createAnalysesSupabaseClient } from "@/lib/supabase/analyses-client";

/**
 * Höj med 1 varje gång `lib/analyse/claude-prompt.ts` ändras så cache i Supabase
 * invalideras. Rutin: bump → commit/push → redeploy Vercel.
 */
const CURRENT_PROMPT_VERSION = 3;

const PROPERTY_TYPES = new Set(["Villa", "Kedjehus", "Radhus", "Fritidshus"]);

type Body = {
  address?: string;
  propertyId?: string | null;
  objectType?: string;
  buildYear?: number;
  sizeSqm?: number;
  askingPrice?: number;
  adText?: string;
};

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

export async function POST(request: Request) {
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
  const sessionUser = await getSessionUser();
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

  let cachedRow: {
    id: string;
    result: AnalysisResult;
    user_id: string | null;
  } | null = null;

  if (propertyId != null) {
    const { data, error } = await supabase
      .from("analyses")
      .select("id, result, prompt_version, user_id")
      .eq("property_id", propertyId)
      .maybeSingle();
    if (error) {
      console.error("[analyse] cache property_id:", error.message);
      return NextResponse.json(
        { ok: false, message: "Kunde inte läsa cache." },
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
        user_id: data.user_id ?? null,
      };
    }
  } else {
    const { data, error } = await supabase
      .from("analyses")
      .select("id, result, prompt_version, user_id")
      .eq("input_hash", inputHash)
      .is("property_id", null)
      .maybeSingle();
    if (error) {
      console.error("[analyse] cache input_hash:", error.message);
      return NextResponse.json(
        { ok: false, message: "Kunde inte läsa cache." },
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
        user_id: data.user_id ?? null,
      };
    }
  }

  if (cachedRow != null) {
    await attachUserIdIfNeeded(
      supabase,
      cachedRow.id,
      userId,
      cachedRow.user_id,
    );
    return NextResponse.json({
      ok: true,
      cached: true,
      analysisId: cachedRow.id,
      analysis: cachedRow.result,
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

  const rowPayload = {
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
    user_id: userId,
  };

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
            .select("id, result, prompt_version, user_id")
            .eq("property_id", propertyId)
            .maybeSingle()
        : await supabase
            .from("analyses")
            .select("id, result, prompt_version, user_id")
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
        await attachUserIdIfNeeded(supabase, again.id, userId, again.user_id);
        return NextResponse.json({
          ok: true,
          cached: true,
          analysisId: again.id,
          analysis: again.result as AnalysisResult,
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

  await attachUserIdIfNeeded(supabase, savedId, userId, null);

  return NextResponse.json({
    ok: true,
    cached: false,
    analysisId: savedId,
    analysis,
  });
}
