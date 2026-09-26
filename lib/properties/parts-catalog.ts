/**
 * Katalog över husdelar för fastighetsdashboarden.
 * Livslängder: se component-lifespans.ts
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
  "badrum",
  "uppvarmning",
  "ventilation",
  "el",
  "va",
] as const;

export type PropertyPartKey = (typeof PROPERTY_PART_KEYS)[number];

export type PropertyPartDefinition = {
  key: PropertyPartKey;
  label: string;
  /** Fallback-livslängd (tak styrs av material). */
  lifespanYears: number;
  summary: string;
  ifWaiting: string;
  guideHref: string;
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
  },
  {
    key: "fasad",
    label: "Fasad",
    lifespanYears: PART_LIFESPAN_YEARS.fasad,
    summary:
      "Fasaden skyddar stommen. Puts, trä och tegel har olika underhållsbehov.",
    ifWaiting: "Eftersatt fasad leder ofta till fukt och röta i konstruktionen.",
    guideHref: PART_GUIDE_HREF.fasad,
  },
  {
    key: "fonster",
    label: "Fönster",
    lifespanYears: PART_LIFESPAN_YEARS.fonster,
    summary:
      "Fönster påverkar energi, komfort och fuktrisk kring karm och bleck.",
    ifWaiting: "Otäta fönster ger drag, högre uppvärmningskostnad och kondensrisk.",
    guideHref: PART_GUIDE_HREF.fonster,
  },
  {
    key: "dranering",
    label: "Dränering",
    lifespanYears: PART_LIFESPAN_YEARS.dranering,
    summary:
      "Dränering håller grunden torr. Livslängden beror på material och markförhållanden.",
    ifWaiting: "Dålig dränering syns ofta som fukt i källare eller krypgrund.",
    guideHref: PART_GUIDE_HREF.dranering,
  },
  {
    key: "grund",
    label: "Grund",
    lifespanYears: PART_LIFESPAN_YEARS.grund,
    summary:
      "Grunden bär huset. Problem syns som sprickor, sättningar eller fukt.",
    ifWaiting: "Grundskador är bland de dyraste att åtgärda i efterhand.",
    guideHref: PART_GUIDE_HREF.grund,
  },
  {
    key: "badrum",
    label: "Badrum / tätskikt",
    lifespanYears: PART_LIFESPAN_YEARS.badrum,
    summary:
      "Tätskikt i våtrum har begränsad livslängd. Ålder är en viktig risksignal.",
    ifWaiting: "Ett läckande tätskikt kan ge omfattande vattenskador.",
    guideHref: PART_GUIDE_HREF.badrum,
  },
  {
    key: "uppvarmning",
    label: "Uppvärmning",
    lifespanYears: PART_LIFESPAN_YEARS.uppvarmning,
    summary:
      "Värmepump, panna eller fjärrvärmecentral – ålder påverkar driftkostnad och haveririsk.",
    ifWaiting: "Ett åldrat system kan gå sönder abrupt och bli en stor engångskostnad.",
    guideHref: PART_GUIDE_HREF.uppvarmning,
  },
  {
    key: "ventilation",
    label: "Ventilation",
    lifespanYears: PART_LIFESPAN_YEARS.ventilation,
    summary:
      "Rätt ventilation skyddar mot fukt och dålig luft. Systemet behöver underhåll.",
    ifWaiting: "Bristfällig ventilation ger fukt, lukt och sämre inomhusklimat.",
    guideHref: PART_GUIDE_HREF.ventilation,
  },
  {
    key: "el",
    label: "El",
    lifespanYears: PART_LIFESPAN_YEARS.el,
    summary:
      "Elanläggningens ålder och standard påverkar brandsäkerhet och försäkring.",
    ifWaiting: "Gammal el kan kräva stamrenovering innan andra arbeten.",
    guideHref: PART_GUIDE_HREF.el,
  },
  {
    key: "va",
    label: "Vatten & avlopp",
    lifespanYears: PART_LIFESPAN_YEARS.va,
    summary:
      "Ledningar och beredare åldras. Stopp och läckage blir vanligare med åldern.",
    ifWaiting: "Ett rörbrott inomhus kan ge stora följdskador.",
    guideHref: PART_GUIDE_HREF.va,
  },
] as const;

export function isPropertyPartKey(value: string): value is PropertyPartKey {
  return (PROPERTY_PART_KEYS as readonly string[]).includes(value);
}

export function getPartDefinition(
  key: string,
): PropertyPartDefinition | undefined {
  return PROPERTY_PARTS.find((p) => p.key === key);
}
