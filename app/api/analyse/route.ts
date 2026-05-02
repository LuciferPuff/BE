import { NextResponse } from "next/server";
import { createHash } from "node:crypto";

import { runClaudeAnalyse } from "@/lib/analyse/anthropic";
import { buildAnalysePrompt } from "@/lib/analyse/claude-prompt";
import { buildInputHashSource } from "@/lib/analyse/build-hash-source";
import {
  parseAnalysisJson,
  type AnalysisResult,
} from "@/lib/analyse/parse-analysis-json";
import { consumeAnalyseRateSlot } from "@/lib/analyse/rate-limit-ip";
import { createAnalysesSupabaseClient } from "@/lib/supabase/analyses-client";

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

  if (address === "") {
    return NextResponse.json(
      { ok: false, message: "Adress saknas." },
      { status: 400 },
    );
  }
  if (!PROPERTY_TYPES.has(objectType)) {
    return NextResponse.json(
      { ok: false, message: "Ogiltig objekttyp." },
      { status: 400 },
    );
  }
  if (!Number.isFinite(buildYear) || buildYear < 1600 || buildYear > 2100) {
    return NextResponse.json(
      { ok: false, message: "Ogiltigt byggnadsår." },
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
  if (adText === "") {
    return NextResponse.json(
      { ok: false, message: "Annonstext saknas." },
      { status: 400 },
    );
  }

  const inputHash = computeInputHash(address, buildYear, objectType);

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

  let cachedRow: { result: AnalysisResult } | null = null;

  if (propertyId != null) {
    const { data, error } = await supabase
      .from("analyses")
      .select("result")
      .eq("property_id", propertyId)
      .maybeSingle();
    if (error) {
      console.error("[analyse] cache property_id:", error.message);
      return NextResponse.json(
        { ok: false, message: "Kunde inte läsa cache." },
        { status: 500 },
      );
    }
    if (data?.result != null) {
      cachedRow = { result: data.result as AnalysisResult };
    }
  } else {
    const { data, error } = await supabase
      .from("analyses")
      .select("result")
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
    if (data?.result != null) {
      cachedRow = { result: data.result as AnalysisResult };
    }
  }

  if (cachedRow != null) {
    return NextResponse.json({
      ok: true,
      cached: true,
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

  const { error: insertError } = await supabase.from("analyses").insert({
    property_id: propertyId,
    input_hash: inputHash,
    address,
    object_type: objectType,
    build_year: buildYear,
    size_sqm: sizeSqm,
    asking_price: Math.round(askingPrice),
    ad_text: adText,
    result: analysis,
  });

  if (insertError) {
    if (insertError.code === "23505") {
      const { data: again } = propertyId
        ? await supabase
            .from("analyses")
            .select("result")
            .eq("property_id", propertyId)
            .maybeSingle()
        : await supabase
            .from("analyses")
            .select("result")
            .eq("input_hash", inputHash)
            .is("property_id", null)
            .maybeSingle();
      if (again?.result != null) {
        return NextResponse.json({
          ok: true,
          cached: true,
          analysis: again.result as AnalysisResult,
        });
      }
    }
    console.error("[analyse] insert:", insertError.message);
    return NextResponse.json(
      { ok: false, message: "Kunde inte spara analysen." },
      { status: 500 },
    );
  }

  return NextResponse.json({
    ok: true,
    cached: false,
    analysis,
  });
}
