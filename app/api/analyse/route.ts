import { NextResponse } from "next/server";

import { buildInputHashSource } from "@/lib/analyse/build-hash-source";
import { createHash } from "node:crypto";

type Body = {
  fastighetsbeteckning?: string | null;
  input_hash?: string | null;
  address?: string;
  property_type?: string;
  year_built?: number;
  size_sqm?: number;
  asking_price_sek?: number;
  listing_text?: string;
};

const PROPERTY_TYPES = new Set(["Villa", "Kedjehus", "Radhus", "Fritidshus"]);

function verifyInputHash(
  address: string,
  yearBuilt: number,
  propertyType: string,
  claimed: string,
): boolean {
  const source = buildInputHashSource(address, yearBuilt, propertyType);
  const expected = createHash("sha256").update(source, "utf8").digest("hex");
  return expected === claimed;
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
  const listingText =
    typeof body.listing_text === "string" ? body.listing_text.trim() : "";
  const propertyType =
    typeof body.property_type === "string" ? body.property_type.trim() : "";
  const yearBuilt =
    typeof body.year_built === "number" && Number.isFinite(body.year_built)
      ? body.year_built
      : NaN;
  const sizeSqm =
    typeof body.size_sqm === "number" && Number.isFinite(body.size_sqm)
      ? body.size_sqm
      : NaN;
  const askingPriceSek =
    typeof body.asking_price_sek === "number" &&
    Number.isFinite(body.asking_price_sek)
      ? body.asking_price_sek
      : NaN;

  const bet =
    body.fastighetsbeteckning != null &&
    typeof body.fastighetsbeteckning === "string"
      ? body.fastighetsbeteckning.trim()
      : "";
  const inputHash =
    body.input_hash != null && typeof body.input_hash === "string"
      ? body.input_hash.trim()
      : "";

  if (address === "") {
    return NextResponse.json(
      { ok: false, message: "Adress saknas." },
      { status: 400 },
    );
  }
  if (!PROPERTY_TYPES.has(propertyType)) {
    return NextResponse.json(
      { ok: false, message: "Ogiltig objekttyp." },
      { status: 400 },
    );
  }
  if (!Number.isFinite(yearBuilt) || yearBuilt < 1600 || yearBuilt > 2100) {
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
  if (!Number.isFinite(askingPriceSek) || askingPriceSek < 0) {
    return NextResponse.json(
      { ok: false, message: "Ogiltigt pris." },
      { status: 400 },
    );
  }
  if (listingText === "") {
    return NextResponse.json(
      { ok: false, message: "Annonstext saknas." },
      { status: 400 },
    );
  }

  if (bet !== "") {
    if (inputHash !== "") {
      return NextResponse.json(
        { ok: false, message: "Skicka inte både fastighetsbeteckning och hash." },
        { status: 400 },
      );
    }
  } else {
    if (inputHash === "" || !/^[a-f0-9]{64}$/.test(inputHash)) {
      return NextResponse.json(
        { ok: false, message: "Saknar eller ogiltig input_hash." },
        { status: 400 },
      );
    }
    if (!verifyInputHash(address, yearBuilt, propertyType, inputHash)) {
      return NextResponse.json(
        { ok: false, message: "Hash stämmer inte med angivna fält." },
        { status: 400 },
      );
    }
  }

  return NextResponse.json({
    ok: true,
    message:
      "Tack! Vi har tagit emot din analys (platshållarsvar under beta – ingen riktig analys körs ännu).",
  });
}
