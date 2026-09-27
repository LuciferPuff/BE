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
  tak: 40,
  fasad: 40,
  fonster: 35,
  dranering: 40,
  grund: 100,
  vatrum: 25,
  uppvarmning: 20,
  varmvattenberedare: 15,
  ventilation: 30,
  el: 45,
  va: 50,
  skorsten: 30,
  kok: 22,
  altan: 22,
  solceller: 25,
  enskilt_avlopp: 25,
  egen_brunn: 12,
  avfuktare: 12,
};

export const PART_GUIDE_HREF: Record<PropertyPartKey, string> = {
  tak: "/guider/tak",
  fasad: "/guider/fasad",
  fonster: "/guider/fonster",
  dranering: "/guider/dranering",
  grund: "/guider/grund",
  vatrum: "/guider/vatrum",
  uppvarmning: "/guider/uppvarmning",
  varmvattenberedare: "/guider/varmvattenberedare",
  ventilation: "/guider/ventilation",
  el: "/guider/el",
  va: "/guider/vatten-avlopp",
  skorsten: "/guider/skorsten",
  kok: "/guider/kok",
  altan: "/guider/altan",
  solceller: "/guider/solceller",
  enskilt_avlopp: "/guider/enskilt-avlopp",
  egen_brunn: "/guider/egen-brunn",
  avfuktare: "/guider/avfuktare",
};

/** Bestämd form för löptext (“När byttes taket?”). */
export const PART_LABEL_DEFINITE: Record<PropertyPartKey, string> = {
  tak: "taket",
  fasad: "fasaden",
  fonster: "fönstren",
  dranering: "dräneringen",
  grund: "grunden",
  vatrum: "tätskiktet",
  uppvarmning: "uppvärmningen",
  varmvattenberedare: "varmvattenberedaren",
  ventilation: "ventilationen",
  el: "elen",
  va: "vatten och avlopp",
  skorsten: "skorstenen",
  kok: "köket",
  altan: "altanen",
  solceller: "solcellerna",
  enskilt_avlopp: "enskilda avloppet",
  egen_brunn: "brunnen",
  avfuktare: "avfuktaren",
};

/**
 * Prioritet för Nästa steg (konsekvensordning).
 * Valfria katalogdelar som saknas på byggnaden ingår inte förrän de lagts till.
 */
export const PART_NEXT_STEP_PRIORITY: readonly PropertyPartKey[] = [
  "tak",
  "vatrum",
  "dranering",
  "enskilt_avlopp",
  "va",
  "el",
  "uppvarmning",
  "varmvattenberedare",
  "skorsten",
  "avfuktare",
  "egen_brunn",
  "kok",
  "solceller",
  "fonster",
  "fasad",
  "altan",
  "ventilation",
  "grund",
] as const;

/** Lägre = värre (används vid underhåll bland verifierade). */
export const PART_STATUS_PRIORITY: Record<
  "action" | "soon" | "likely" | "unknown" | "assumed_ok" | "ok",
  number
> = {
  action: 0,
  soon: 1,
  likely: 2,
  unknown: 3,
  assumed_ok: 4,
  ok: 5,
};

export function partLabelDefinite(key: PropertyPartKey): string {
  return PART_LABEL_DEFINITE[key];
}

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
