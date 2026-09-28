/**
 * Livslängder, varianter och guide-länkar för husdelar.
 */

import type { PropertyPartKey } from "@/lib/properties/parts-catalog";

/* ---------- Tak ---------- */

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

/* ---------- Grund ---------- */

export const FOUNDATION_TYPES = [
  "platta_pa_mark",
  "krypgrund",
  "torpargrund",
  "kallare",
  "plintgrund",
  "okand",
] as const;

export type FoundationType = (typeof FOUNDATION_TYPES)[number];

export const FOUNDATION_TYPE_LABELS: Record<FoundationType, string> = {
  platta_pa_mark: "Platta på mark",
  krypgrund: "Krypgrund",
  torpargrund: "Torpargrund",
  kallare: "Källare",
  plintgrund: "Plintgrund",
  okand: "Vet ej",
};

/** Riktvärde för ägarens tidshorisont / när grunden brukar kräva koll. */
export const FOUNDATION_LIFESPAN_YEARS: Record<
  FoundationType,
  number | null
> = {
  platta_pa_mark: 100,
  krypgrund: 50,
  torpargrund: 45,
  kallare: 80,
  plintgrund: 40,
  okand: null,
};

export const FOUNDATION_NOTES: Partial<Record<FoundationType, string>> = {
  platta_pa_mark:
    "Underhållssnål. Håll koll på sprickor i plattan och eventuell radon.",
  krypgrund:
    "Kräver mer tillsyn än platta – fukt och mögel är vanliga. Avfuktare rekommenderas ofta.",
  torpargrund:
    "Öppen grund med hög fuktrisk. Kontrollera syll och ventilation regelbundet.",
  kallare:
    "Dränering och fuktisolering avgör skicket. Fuktskador syns ofta på väggarna.",
  plintgrund:
    "Kontrollera plintar och bärande trä regelbundet – särskilt vanligt på fritidshus.",
};

export const FOUNDATION_KNOWN_ISSUES = [
  { key: "sprickor", label: "Sprickor" },
  { key: "sattningar", label: "Sättningar" },
  { key: "fukt", label: "Fukt" },
  { key: "mogel", label: "Mögel / lukt" },
  { key: "radon", label: "Radon" },
  { key: "saknad_avfuktare", label: "Saknar avfuktare (krypgrund)" },
  { key: "daalig_ventilation", label: "Dålig ventilation under huset" },
  { key: "vatten_i_kallare", label: "Vatten i källare" },
] as const;

export type FoundationKnownIssue =
  (typeof FOUNDATION_KNOWN_ISSUES)[number]["key"];

/* ---------- Ventilation ---------- */

export const VENTILATION_TYPES = [
  "sjalvdrag",
  "franluft",
  "franluft_varme",
  "till_franluft",
  "ftx",
  "okand",
] as const;

export type VentilationType = (typeof VENTILATION_TYPES)[number];

export const VENTILATION_TYPE_LABELS: Record<VentilationType, string> = {
  sjalvdrag: "Självdrag (S)",
  franluft: "Mekanisk frånluft (F)",
  franluft_varme: "Frånluft med värmeåtervinning (FX)",
  till_franluft: "Till- och frånluft (FT)",
  ftx: "FTX (till/från med värmeväxlare)",
  okand: "Vet ej",
};

/** Aggregat/fläkt – självdrag har ingen utrustning att byta. */
export const VENTILATION_LIFESPAN_YEARS: Record<
  VentilationType,
  number | null
> = {
  sjalvdrag: null,
  franluft: 20,
  franluft_varme: 15,
  till_franluft: 20,
  ftx: 18,
  okand: null,
};

export const VENTILATION_NOTES: Partial<Record<VentilationType, string>> = {
  sjalvdrag:
    "Inget aggregat att byta. Rensa tilluftsventiler och se till att kanaler/skorsten inte är igensatta – särskilt efter fönsterbyte eller tilläggsisolering.",
  franluft:
    "En fläkt suger ut luft. Rengör frånluftsdon och låt fläkten/aggregatet servas vid behov.",
  franluft_varme:
    "Frånluft med återvinning (ofta kopplat till frånluftsvärmepump). Filter och service är viktigare än vid vanlig frånluft. Detta är inte FTX.",
  till_franluft:
    "Balanserad till- och frånluft utan värmeväxlare. Filterbyte och injustering behövs för rätt flöde.",
  ftx:
    "Kräver mest underhåll: byt filter 1–2 gånger per år, torka don och ta professionell service ungefär vart 3–5 år.",
};

export const VENTILATION_KNOWN_ISSUES = [
  { key: "smutsiga_filter", label: "Smutsiga / igensatta filter" },
  { key: "dammiga_don", label: "Dammiga ventiler/don" },
  { key: "obalans", label: "Obalanserat luftflöde" },
  { key: "ljud", label: "Ljud / vibration" },
  { key: "larm", label: "Larm på aggregatet" },
  { key: "daalig_luft", label: "Dålig luft / lukt" },
  { key: "fukt_imma", label: "Fukt / imma på fönster" },
] as const;

export type VentilationKnownIssue =
  (typeof VENTILATION_KNOWN_ISSUES)[number]["key"];

/* ---------- Värmekälla ---------- */

export const HEAT_SOURCE_VARIANTS = [
  "bergvarme",
  "jordvarme",
  "sjovarme",
  "luft_vatten",
  "franluft",
  "luft_luft",
  "fjarrvarme",
  "elpanna",
  "direktel",
  "olja",
  "gas",
  "ved",
  "pellets",
  "briketter",
  "kamin",
  "solfangare",
  "okand",
] as const;

export type HeatSourceVariant = (typeof HEAT_SOURCE_VARIANTS)[number];

export const HEAT_SOURCE_LABELS: Record<HeatSourceVariant, string> = {
  bergvarme: "Bergvärme",
  jordvarme: "Jordvärme",
  sjovarme: "Sjövärme",
  luft_vatten: "Luft/vatten-värmepump",
  franluft: "Frånluftsvärmepump",
  luft_luft: "Luft/luft-värmepump",
  fjarrvarme: "Fjärrvärme",
  elpanna: "Elpanna (vattenburen)",
  direktel: "Direktverkande el",
  olja: "Olja",
  gas: "Gas",
  ved: "Ved",
  pellets: "Pellets",
  briketter: "Briketter",
  kamin: "Kamin/kakelugn",
  solfangare: "Solfångare",
  okand: "Vet ej",
};

export const HEAT_SOURCE_LIFESPAN_YEARS: Record<
  HeatSourceVariant,
  number | null
> = {
  bergvarme: 18,
  jordvarme: 18,
  sjovarme: 18,
  luft_vatten: 15,
  franluft: 15,
  luft_luft: 12,
  fjarrvarme: 22,
  elpanna: 22,
  direktel: 30,
  olja: 28,
  gas: 22,
  ved: 25,
  pellets: 25,
  briketter: 25,
  kamin: null,
  solfangare: 22,
  okand: null,
};

/** Panelnotiser per värmekälla-variant. */
export const HEAT_SOURCE_NOTES: Partial<Record<HeatSourceVariant, string>> = {
  bergvarme:
    "Borrhålet/kollektorn håller 50+ år – det är oftast bara pumpen som behöver bytas.",
  jordvarme:
    "Borrhålet/kollektorn håller 50+ år – det är oftast bara pumpen som behöver bytas.",
  sjovarme:
    "Borrhålet/kollektorn håller 50+ år – det är oftast bara pumpen som behöver bytas.",
  olja:
    "Kontrollera oljecisternen – läckage kan ge saneringskrav och påverka försäkringen.",
  elpanna:
    "Hög driftkostnad. En värmepump kan ofta sänka elförbrukningen kraftigt.",
  direktel:
    "Hög driftkostnad. En värmepump kan ofta sänka elförbrukningen kraftigt.",
  ved: "Kräver sotning och brandskyddskontroll.",
  pellets: "Kräver sotning och brandskyddskontroll.",
  briketter: "Kräver sotning och brandskyddskontroll.",
  kamin: "Kräver sotning och brandskyddskontroll.",
};

/** Värmekällor som brukar kräva vattenburen distribution. */
export const HEAT_SOURCES_NEED_WATER_DIST: readonly HeatSourceVariant[] = [
  "bergvarme",
  "jordvarme",
  "sjovarme",
  "luft_vatten",
  "franluft",
  "fjarrvarme",
  "elpanna",
  "olja",
  "gas",
  "pellets",
  "ved",
  "briketter",
] as const;

/** Värmepumpar där VVB kan vara integrerad. */
export const HEAT_PUMP_VARIANTS: readonly HeatSourceVariant[] = [
  "bergvarme",
  "jordvarme",
  "sjovarme",
  "luft_vatten",
  "franluft",
] as const;

/* ---------- Värmedistribution ---------- */

export const HEAT_DIST_VARIANTS = [
  "radiatorer",
  "golvvarme_vatten",
  "golvvarme_el",
  "direktel_element",
  "luftburen",
  "okand",
] as const;

export type HeatDistVariant = (typeof HEAT_DIST_VARIANTS)[number];

export const HEAT_DIST_LABELS: Record<HeatDistVariant, string> = {
  radiatorer: "Vattenburna radiatorer",
  golvvarme_vatten: "Vattenburen golvvärme",
  golvvarme_el: "Elgolvvärme",
  direktel_element: "Direktel-element",
  luftburen: "Luftburen",
  okand: "Vet ej",
};

export const HEAT_DIST_LIFESPAN_YEARS: Record<HeatDistVariant, number | null> = {
  radiatorer: 50,
  golvvarme_vatten: 50,
  golvvarme_el: 28,
  direktel_element: 30,
  luftburen: null,
  okand: null,
};

export const WATER_DIST_VARIANTS: readonly HeatDistVariant[] = [
  "radiatorer",
  "golvvarme_vatten",
] as const;

/* ---------- Schablon per del (variant styr där det finns) ---------- */

export const PART_LIFESPAN_YEARS: Record<PropertyPartKey, number> = {
  tak: 40,
  fasad: 40,
  fonster: 35,
  dranering: 40,
  grund: 100,
  vatrum: 25,
  varmekalla: 18,
  varmedistribution: 50,
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
  varmekalla: "/guider/uppvarmning",
  varmedistribution: "/guider/uppvarmning",
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

export const PART_LABEL_DEFINITE: Record<PropertyPartKey, string> = {
  tak: "taket",
  fasad: "fasaden",
  fonster: "fönstren",
  dranering: "dräneringen",
  grund: "grunden",
  vatrum: "tätskiktet",
  varmekalla: "värmekällan",
  varmedistribution: "värmedistributionen",
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

export const PART_NEXT_STEP_PRIORITY: readonly PropertyPartKey[] = [
  "tak",
  "vatrum",
  "dranering",
  "grund",
  "enskilt_avlopp",
  "va",
  "el",
  "ventilation",
  "varmekalla",
  "varmvattenberedare",
  "varmedistribution",
  "skorsten",
  "avfuktare",
  "egen_brunn",
  "kok",
  "solceller",
  "fonster",
  "fasad",
  "altan",
] as const;

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

export function isFoundationType(value: string): value is FoundationType {
  return (FOUNDATION_TYPES as readonly string[]).includes(value);
}

export function isVentilationType(value: string): value is VentilationType {
  return (VENTILATION_TYPES as readonly string[]).includes(value);
}

export function isHeatSourceVariant(value: string): value is HeatSourceVariant {
  return (HEAT_SOURCE_VARIANTS as readonly string[]).includes(value);
}

export function isHeatDistVariant(value: string): value is HeatDistVariant {
  return (HEAT_DIST_VARIANTS as readonly string[]).includes(value);
}

export function lifespanForPart(
  key: PropertyPartKey,
  variant: string | null | undefined,
): number | null {
  if (key === "tak") {
    if (!variant || !isRoofMaterial(variant)) return null;
    return ROOF_LIFESPAN_YEARS[variant];
  }
  if (key === "grund") {
    if (!variant || !isFoundationType(variant)) return null;
    return FOUNDATION_LIFESPAN_YEARS[variant];
  }
  if (key === "ventilation") {
    if (!variant || !isVentilationType(variant)) return null;
    return VENTILATION_LIFESPAN_YEARS[variant];
  }
  if (key === "varmekalla") {
    if (!variant || !isHeatSourceVariant(variant)) return null;
    return HEAT_SOURCE_LIFESPAN_YEARS[variant];
  }
  if (key === "varmedistribution") {
    if (!variant || !isHeatDistVariant(variant)) return null;
    return HEAT_DIST_LIFESPAN_YEARS[variant];
  }
  return PART_LIFESPAN_YEARS[key];
}

export function heatSourceNeedsWaterDist(variant: string | null): boolean {
  return (
    !!variant &&
    (HEAT_SOURCES_NEED_WATER_DIST as readonly string[]).includes(variant)
  );
}

export function buildingHasHeatPump(
  variants: readonly (string | null | undefined)[],
): boolean {
  return variants.some(
    (v) => v && (HEAT_PUMP_VARIANTS as readonly string[]).includes(v),
  );
}
