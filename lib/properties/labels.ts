export const PROPERTY_ROLES = ["agare", "medlem", "gast"] as const;
export type PropertyRole = (typeof PROPERTY_ROLES)[number];

export const PROPERTY_TYPES = [
  "villa",
  "radhus",
  "bostadsratt",
  "fritidshus",
  "flerbostadshus",
] as const;
export type PropertyType = (typeof PROPERTY_TYPES)[number];

const ROLE_LABELS: Record<PropertyRole, string> = {
  agare: "Ägare",
  medlem: "Medlem",
  gast: "Gäst",
};

const TYPE_LABELS: Record<PropertyType, string> = {
  villa: "Villa",
  radhus: "Radhus",
  bostadsratt: "Bostadsrätt",
  fritidshus: "Fritidshus",
  flerbostadshus: "Flerbostadshus",
};

export function propertyRoleLabel(role: string): string {
  if (role in ROLE_LABELS) return ROLE_LABELS[role as PropertyRole];
  return role;
}

export function propertyTypeLabel(type: string | null | undefined): string {
  if (!type) return "—";
  if (type in TYPE_LABELS) return TYPE_LABELS[type as PropertyType];
  return type;
}

export function isPropertyType(value: string): value is PropertyType {
  return (PROPERTY_TYPES as readonly string[]).includes(value);
}
