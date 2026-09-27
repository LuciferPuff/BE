/**
 * Katalog över husdelar och byggnadstyper för fastighetsdashboarden.
 * Seed = BUILDING_DEFAULT_PARTS. Övriga katalogdelar läggs till av användaren.
 */

import {
  PART_GUIDE_HREF,
  PART_LIFESPAN_YEARS,
} from "@/lib/properties/component-lifespans";

export const PROPERTY_PART_KEYS = [
  "tak",
  "fasad",
  "fonster",
  "dranering",
  "grund",
  "vatrum",
  "varmekalla",
  "varmedistribution",
  "varmvattenberedare",
  "ventilation",
  "el",
  "va",
  "skorsten",
  "kok",
  "altan",
  "solceller",
  "enskilt_avlopp",
  "egen_brunn",
  "avfuktare",
] as const;

export type PropertyPartKey = (typeof PROPERTY_PART_KEYS)[number];

export type PropertyPartDefinition = {
  key: PropertyPartKey;
  label: string;
  lifespanYears: number;
  summary: string;
  ifWaiting: string;
  guideHref: string;
  allowMultiple: boolean;
};

export const PROPERTY_PARTS: readonly PropertyPartDefinition[] = [
  {
    key: "tak",
    label: "Tak",
    lifespanYears: PART_LIFESPAN_YEARS.tak,
    summary:
      "Takets skick påverkas av material, underhåll och klimat. Ett gammalt tak ökar risken för läckage.",
    ifWaiting:
      "Fuktskador i bjälklag och isolering blir dyrare ju längre du väntar.",
    guideHref: PART_GUIDE_HREF.tak,
    allowMultiple: false,
  },
  {
    key: "fasad",
    label: "Fasad",
    lifespanYears: PART_LIFESPAN_YEARS.fasad,
    summary:
      "Fasaden skyddar stommen. Puts, trä och tegel har olika underhållsbehov.",
    ifWaiting: "Eftersatt fasad leder ofta till fukt och röta i konstruktionen.",
    guideHref: PART_GUIDE_HREF.fasad,
    allowMultiple: false,
  },
  {
    key: "fonster",
    label: "Fönster",
    lifespanYears: PART_LIFESPAN_YEARS.fonster,
    summary:
      "Fönster påverkar energi, komfort och fuktrisk kring karm och bleck.",
    ifWaiting: "Otäta fönster ger drag, högre uppvärmningskostnad och kondensrisk.",
    guideHref: PART_GUIDE_HREF.fonster,
    allowMultiple: false,
  },
  {
    key: "dranering",
    label: "Dränering",
    lifespanYears: PART_LIFESPAN_YEARS.dranering,
    summary:
      "Dränering håller grunden torr. Livslängden beror på material och markförhållanden.",
    ifWaiting: "Dålig dränering syns ofta som fukt i källare eller krypgrund.",
    guideHref: PART_GUIDE_HREF.dranering,
    allowMultiple: false,
  },
  {
    key: "grund",
    label: "Grund",
    lifespanYears: PART_LIFESPAN_YEARS.grund,
    summary:
      "Grunden bär huset. Problem syns som sprickor, sättningar eller fukt.",
    ifWaiting: "Grundskador är bland de dyraste att åtgärda i efterhand.",
    guideHref: PART_GUIDE_HREF.grund,
    allowMultiple: false,
  },
  {
    key: "vatrum",
    label: "Våtrum",
    lifespanYears: PART_LIFESPAN_YEARS.vatrum,
    summary:
      "Tätskikt i våtrum (badrum, tvättstuga, WC) har begränsad livslängd. Namnge rummet för flera våtrum.",
    ifWaiting: "Ett läckande tätskikt kan ge omfattande vattenskador.",
    guideHref: PART_GUIDE_HREF.vatrum,
    allowMultiple: true,
  },
  {
    key: "varmekalla",
    label: "Värmekälla",
    lifespanYears: PART_LIFESPAN_YEARS.varmekalla,
    summary:
      "Värmepump, panna, fjärrvärme eller kamin – typ och ålder styr driftkostnad och haveririsk.",
    ifWaiting: "Ett åldrat system kan gå sönder abrupt och bli en stor engångskostnad.",
    guideHref: PART_GUIDE_HREF.varmekalla,
    allowMultiple: true,
  },
  {
    key: "varmedistribution",
    label: "Värmedistribution",
    lifespanYears: PART_LIFESPAN_YEARS.varmedistribution,
    summary:
      "Hur värmen fördelas i huset – radiatorer, golvvärme eller luft.",
    ifWaiting: "Felaktig eller åldrad distribution ger ojämn värme och högre kostnader.",
    guideHref: PART_GUIDE_HREF.varmedistribution,
    allowMultiple: true,
  },
  {
    key: "varmvattenberedare",
    label: "Varmvattenberedare",
    lifespanYears: PART_LIFESPAN_YEARS.varmvattenberedare,
    summary:
      "Beredare åldras och kan läcka. Kan vara integrerad i värmepumpen.",
    ifWaiting: "En havererad beredare ger både vattenstopp och risk för vattenskada.",
    guideHref: PART_GUIDE_HREF.varmvattenberedare,
    allowMultiple: false,
  },
  {
    key: "ventilation",
    label: "Ventilation",
    lifespanYears: PART_LIFESPAN_YEARS.ventilation,
    summary:
      "Rätt ventilation skyddar mot fukt och dålig luft. Systemet behöver underhåll.",
    ifWaiting: "Bristfällig ventilation ger fukt, lukt och sämre inomhusklimat.",
    guideHref: PART_GUIDE_HREF.ventilation,
    allowMultiple: false,
  },
  {
    key: "el",
    label: "El",
    lifespanYears: PART_LIFESPAN_YEARS.el,
    summary:
      "Elanläggningens ålder och standard påverkar brandsäkerhet och försäkring.",
    ifWaiting: "Gammal el kan kräva stamrenovering innan andra arbeten.",
    guideHref: PART_GUIDE_HREF.el,
    allowMultiple: false,
  },
  {
    key: "va",
    label: "Vatten & avlopp",
    lifespanYears: PART_LIFESPAN_YEARS.va,
    summary:
      "Ledningar åldras. Stopp och läckage blir vanligare med åldern.",
    ifWaiting: "Ett rörbrott inomhus kan ge stora följdskador.",
    guideHref: PART_GUIDE_HREF.va,
    allowMultiple: false,
  },
  {
    key: "skorsten",
    label: "Skorsten / eldstad",
    lifespanYears: PART_LIFESPAN_YEARS.skorsten,
    summary:
      "Beslag och insatser åldras. Sotning och brandskyddskontroll är lagkrav.",
    ifWaiting: "Eftersatt skorsten ökar brandrisken och kan stoppa försäkring.",
    guideHref: PART_GUIDE_HREF.skorsten,
    allowMultiple: true,
  },
  {
    key: "kok",
    label: "Kök",
    lifespanYears: PART_LIFESPAN_YEARS.kok,
    summary:
      "Kök renoveras ofta. Vattenskador från diskmaskin och rör är vanliga risker.",
    ifWaiting: "Ett gammalt kök med dolda läckor kan bli dyrt att åtgärda i efterhand.",
    guideHref: PART_GUIDE_HREF.kok,
    allowMultiple: false,
  },
  {
    key: "altan",
    label: "Altan / trädäck / balkong",
    lifespanYears: PART_LIFESPAN_YEARS.altan,
    summary:
      "Trä och fästen åldras. Bygglov och bärighet kan bli aktuellt vid byte.",
    ifWaiting: "Röta i bärande delar gör altanen osäker att använda.",
    guideHref: PART_GUIDE_HREF.altan,
    allowMultiple: true,
  },
  {
    key: "solceller",
    label: "Solceller",
    lifespanYears: PART_LIFESPAN_YEARS.solceller,
    summary:
      "Paneler håller länge; växelriktaren byts oftare. Påverkar el och ekonomi.",
    ifWaiting: "En trasig växelriktare stoppar produktionen tills den byts.",
    guideHref: PART_GUIDE_HREF.solceller,
    allowMultiple: false,
  },
  {
    key: "enskilt_avlopp",
    label: "Enskilt avlopp",
    lifespanYears: PART_LIFESPAN_YEARS.enskilt_avlopp,
    summary:
      "Slamavskiljare och infiltration har begränsad livslängd. Kommunen kan kräva uppgradering.",
    ifWaiting: "Ett underkänt system kan bli en stor engångskostnad (ofta 100–200 tkr).",
    guideHref: PART_GUIDE_HREF.enskilt_avlopp,
    allowMultiple: false,
  },
  {
    key: "egen_brunn",
    label: "Egen brunn",
    lifespanYears: PART_LIFESPAN_YEARS.egen_brunn,
    summary:
      "Pump och brunn behöver underhåll. Vattenprov rekommenderas regelbundet.",
    ifWaiting: "En trasig pump ger vattenstopp; dålig vattenkvalitet upptäcks sent utan prov.",
    guideHref: PART_GUIDE_HREF.egen_brunn,
    allowMultiple: false,
  },
  {
    key: "avfuktare",
    label: "Avfuktare (krypgrund)",
    lifespanYears: PART_LIFESPAN_YEARS.avfuktare,
    summary:
      "Avfuktare i krypgrund går ofta sönder tyst. Hög risk för mögel om den stannar.",
    ifWaiting: "Utan fungerande avfuktning kan mögel sprida sig utan synliga tecken.",
    guideHref: PART_GUIDE_HREF.avfuktare,
    allowMultiple: false,
  },
] as const;

export const BUILDING_TYPES = [
  "huvudbyggnad",
  "tillbyggnad",
  "garage",
  "attefall",
  "uthus",
  "gaststuga",
] as const;

export type BuildingType = (typeof BUILDING_TYPES)[number];

export const BUILDING_TYPE_LABELS: Record<BuildingType, string> = {
  huvudbyggnad: "Huvudbyggnad",
  tillbyggnad: "Tillbyggnad",
  garage: "Garage",
  attefall: "Attefallshus",
  uthus: "Uthus",
  gaststuga: "Gäststuga",
};

/** Standarddelar som seedas när en byggnad skapas. */
export const BUILDING_DEFAULT_PARTS: Record<
  BuildingType,
  readonly PropertyPartKey[]
> = {
  huvudbyggnad: [
    "tak",
    "fasad",
    "fonster",
    "dranering",
    "grund",
    "vatrum",
    "varmekalla",
    "varmedistribution",
    "varmvattenberedare",
    "ventilation",
    "el",
    "va",
  ],
  tillbyggnad: ["tak", "fasad", "fonster", "el", "va"],
  garage: ["tak", "fasad", "el", "grund"],
  attefall: ["tak", "fasad", "fonster", "el", "va", "ventilation"],
  uthus: ["tak", "fasad", "el"],
  gaststuga: [
    "tak",
    "fasad",
    "fonster",
    "el",
    "va",
    "ventilation",
    "vatrum",
  ],
};

export type PartRole = "primar" | "komplement";

export function isPropertyPartKey(value: string): value is PropertyPartKey {
  return (PROPERTY_PART_KEYS as readonly string[]).includes(value);
}

export function isBuildingType(value: string): value is BuildingType {
  return (BUILDING_TYPES as readonly string[]).includes(value);
}

export function isPartRole(value: string): value is PartRole {
  return value === "primar" || value === "komplement";
}

export function getPartDefinition(
  key: string,
): PropertyPartDefinition | undefined {
  return PROPERTY_PARTS.find((p) => p.key === key);
}

export function partAllowsMultiple(key: PropertyPartKey): boolean {
  return getPartDefinition(key)?.allowMultiple ?? false;
}

/** Delar som kan läggas till: multi alltid, övriga om de saknas på byggnaden. */
export function addablePartOptions(
  existingKeys: readonly string[],
): PropertyPartDefinition[] {
  const present = new Set(existingKeys);
  return PROPERTY_PARTS.filter(
    (p) => p.allowMultiple || !present.has(p.key),
  );
}
