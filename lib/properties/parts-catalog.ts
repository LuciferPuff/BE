/**
 * Katalog över husdelar för Fas B-dashboarden.
 * Livslängder är schabloner för villa/småhus – inte besiktningsutlåtanden.
 */

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
  /** Normal teknisk livslängd i år (schablon). */
  lifespanYears: number;
  summary: string;
  ifWaiting: string;
  /** Relativ länk till guide/artikel om den finns. */
  guideHref?: string;
};

export const PROPERTY_PARTS: readonly PropertyPartDefinition[] = [
  {
    key: "tak",
    label: "Tak",
    lifespanYears: 40,
    summary:
      "Takets skick påverkas av material, underhåll och klimat. Ett gammalt tak ökar risken för läckage.",
    ifWaiting:
      "Fuktskador i bjälklag och isolering blir dyrare ju längre du väntar.",
    guideHref: "/guider",
  },
  {
    key: "fasad",
    label: "Fasad",
    lifespanYears: 50,
    summary:
      "Fasaden skyddar stommen. Puts, trä och tegel har olika underhållsbehov.",
    ifWaiting: "Eftersatt fasad leder ofta till fukt och röta i konstruktionen.",
  },
  {
    key: "fonster",
    label: "Fönster",
    lifespanYears: 40,
    summary:
      "Fönster påverkar energi, komfort och fuktrisk kring karm och bleck.",
    ifWaiting: "Otäta fönster ger drag, högre uppvärmningskostnad och kondensrisk.",
  },
  {
    key: "dranering",
    label: "Dränering",
    lifespanYears: 40,
    summary:
      "Dränering håller grunden torr. Livslängden beror på material och markförhållanden.",
    ifWaiting: "Dålig dränering syns ofta först som fukt i källare eller krypgrund.",
  },
  {
    key: "grund",
    label: "Grund",
    lifespanYears: 80,
    summary:
      "Grunden bär huset. Problem syns som sprickor, sättningar eller fukt.",
    ifWaiting: "Grundskador är bland de dyraste att åtgärda i efterhand.",
  },
  {
    key: "badrum",
    label: "Badrum / tätskikt",
    lifespanYears: 25,
    summary:
      "Tätskikt i våtrum har begränsad livslängd. Ålder är en viktig risksignal.",
    ifWaiting: "Ett läckande tätskikt kan ge omfattande vattenskador.",
  },
  {
    key: "uppvarmning",
    label: "Uppvärmning",
    lifespanYears: 20,
    summary:
      "Värmepump, panna eller fjärrvärmecentral – ålder påverkar driftkostnad och haveririsk.",
    ifWaiting: "Ett åldrat system kan gå sönder abrupt och bli en stor engångskostnad.",
  },
  {
    key: "ventilation",
    label: "Ventilation",
    lifespanYears: 30,
    summary:
      "Rätt ventilation skyddar mot fukt och dålig luft. Systemet behöver underhåll.",
    ifWaiting: "Bristfällig ventilation ger fukt, lukt och sämre inomhusklimat.",
  },
  {
    key: "el",
    label: "El",
    lifespanYears: 40,
    summary:
      "Elanläggningens ålder och standard påverkar brandsäkerhet och försäkring.",
    ifWaiting: "Gammal el kan kräva stamrenovering innan andra arbeten.",
  },
  {
    key: "va",
    label: "Vatten & avlopp",
    lifespanYears: 50,
    summary:
      "Ledningar och beredare slits. Stopp och läckage blir vanligare med åldern.",
    ifWaiting: "Ett rörbrott inomhus kan ge stora följdskador.",
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
