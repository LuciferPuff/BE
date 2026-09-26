/**
 * Livslängder och guide-länkar för husdelar.
 * Justera här centralt – används av statuslogik och UI.
 */

import type { PropertyPartKey } from "@/lib/properties/parts-catalog";

export const ROOF_MATERIALS = [
  "tegel",
  "betong",
  "plat_band",
  "plat_profil",
  "papp",
  "eternit",
  "okand",
] as const;

export type RoofMaterial = (typeof ROOF_MATERIALS)[number];

export const ROOF_MATERIAL_LABELS: Record<RoofMaterial, string> = {
  tegel: "Tegelpannor",
  betong: "Betongpannor",
  plat_band: "Bandtäckt plåt",
  plat_profil: "Profilerad plåt",
  papp: "Papp / shingel",
  eternit: "Eternit",
  okand: "Vet ej",
};

/** Taklivslängd per material. null = okänt material. */
export const ROOF_LIFESPAN_YEARS: Record<RoofMaterial, number | null> = {
  tegel: 60,
  betong: 45,
  plat_band: 50,
  plat_profil: 40,
  papp: 25,
  eternit: 40,
  okand: null,
};

export const ROOF_KNOWN_ISSUES = [
  { key: "lackage", label: "Läckage" },
  { key: "fuktflackar", label: "Fuktfläckar på vind" },
  { key: "mossa", label: "Mossa" },
  { key: "trasiga_pannon", label: "Trasiga pannor" },
  { key: "rost", label: "Rost" },
] as const;

export type RoofKnownIssue = (typeof ROOF_KNOWN_ISSUES)[number]["key"];

/** Schablonlivslängd per del (tak styrs av material). */
export const PART_LIFESPAN_YEARS: Record<PropertyPartKey, number> = {
  tak: 40, // fallback om material saknas i beräkning
  fasad: 40,
  fonster: 35,
  dranering: 40,
  grund: 100,
  badrum: 25,
  uppvarmning: 20,
  ventilation: 30,
  el: 45,
  va: 50,
};

export const PART_GUIDE_HREF: Record<PropertyPartKey, string> = {
  tak: "/guider/tak",
  fasad: "/guider/fasad",
  fonster: "/guider/fonster",
  dranering: "/guider/dranering",
  grund: "/guider/grund",
  badrum: "/guider/badrum",
  uppvarmning: "/guider/uppvarmning",
  ventilation: "/guider/ventilation",
  el: "/guider/el",
  va: "/guider/vatten-avlopp",
};

export function isRoofMaterial(value: string): value is RoofMaterial {
  return (ROOF_MATERIALS as readonly string[]).includes(value);
}

export function lifespanForPart(
  key: PropertyPartKey,
  material: string | null | undefined,
): number | null {
  if (key === "tak") {
    if (!material || !isRoofMaterial(material)) return null;
    return ROOF_LIFESPAN_YEARS[material];
  }
  return PART_LIFESPAN_YEARS[key];
}
