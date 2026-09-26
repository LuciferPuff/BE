/** Typer/mappar och etiketter för dokument och tidslinje-händelser. */

export const DOCUMENT_TYPES = [
  "besiktningsprotokoll",
  "energideklaration",
  "ritning",
  "kvitto_renovering",
  "instruktion",
  "ovrigt",
] as const;

export type DocumentType = (typeof DOCUMENT_TYPES)[number];

/** Visningsnamn för mappar i dokumentbiblioteket. */
export const DOCUMENT_TYPE_LABELS: Record<DocumentType, string> = {
  besiktningsprotokoll: "Besiktning",
  energideklaration: "Energideklaration",
  ritning: "Ritningar",
  kvitto_renovering: "Kvitton",
  instruktion: "Instruktioner",
  ovrigt: "Övrigt",
};

/** Ordning i UI (mapplista). */
export const DOCUMENT_FOLDER_ORDER: readonly DocumentType[] = [
  "besiktningsprotokoll",
  "energideklaration",
  "ritning",
  "kvitto_renovering",
  "instruktion",
  "ovrigt",
];

export const EVENT_TYPES = [
  "renovering",
  "besiktning",
  "vardering",
  "skadearende",
  "driftkostnad_logg",
  "ovrigt",
] as const;

export type EventType = (typeof EVENT_TYPES)[number];

export const EVENT_TYPE_LABELS: Record<EventType, string> = {
  renovering: "Renovering",
  besiktning: "Besiktning",
  vardering: "Värdering",
  skadearende: "Skadeärende",
  driftkostnad_logg: "Driftkostnad",
  ovrigt: "Övrigt",
};

export function isDocumentType(value: string): value is DocumentType {
  return (DOCUMENT_TYPES as readonly string[]).includes(value);
}

export function isEventType(value: string): value is EventType {
  return (EVENT_TYPES as readonly string[]).includes(value);
}

export function documentTypeLabel(type: string): string {
  if (isDocumentType(type)) return DOCUMENT_TYPE_LABELS[type];
  return type;
}

export function eventTypeLabel(type: string): string {
  if (isEventType(type)) return EVENT_TYPE_LABELS[type];
  return type;
}

/** Visningsnamn från storage-sökväg `{propertyId}/{type?}/{uuid}-{filename}`. */
export function displayNameFromFilePath(filePath: string): string {
  const base = filePath.split("/").pop() ?? filePath;
  const dash = base.indexOf("-");
  if (dash > 0 && dash < 40) {
    const rest = base.slice(dash + 1);
    if (rest) return rest;
  }
  return base;
}

export function sanitizeFileName(name: string): string {
  const trimmed = name.trim().replace(/[/\\]/g, "_");
  const cleaned = trimmed.replace(/[^\w.\-åäöÅÄÖ ()]+/gi, "_");
  return cleaned.slice(0, 120) || "fil";
}
