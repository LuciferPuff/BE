import {
  isPropertyType,
  type PropertyType,
} from "@/lib/properties/labels";

/** Mappar analysens object_type (fritext) till property_type-enum om möjligt. */
export function mapAnalysisObjectTypeToPropertyType(
  objectType: string | null | undefined,
): PropertyType | null {
  if (!objectType) return null;
  const normalized = objectType
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "");

  const aliases: Record<string, PropertyType> = {
    villa: "villa",
    radhus: "radhus",
    kedjehus: "radhus",
    bostadsratt: "bostadsratt",
    fritidshus: "fritidshus",
    flerbostadshus: "flerbostadshus",
  };

  const mapped = aliases[normalized];
  if (mapped) return mapped;
  if (isPropertyType(normalized)) return normalized;
  return null;
}
