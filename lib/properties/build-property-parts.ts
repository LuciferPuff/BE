import {
  getComponentStatus,
  type YearPrecision,
} from "@/lib/properties/get-component-status";
import {
  PROPERTY_PARTS,
  type PropertyPartKey,
} from "@/lib/properties/parts-catalog";

export type PartSource = "unknown" | "assumed" | "verified";
export type PartStatusTone =
  | "ok"
  | "soon"
  | "action"
  | "likely"
  | "assumed_ok"
  | "unknown";

export type PropertyPartView = {
  key: PropertyPartKey;
  label: string;
  lifespanYears: number | null;
  summary: string;
  ifWaiting: string;
  guideHref?: string;
  ageYears: number | null;
  referenceYear: number | null;
  replacedYear: number | null;
  yearPrecision: YearPrecision | null;
  material: string | null;
  knownIssues: string[];
  source: PartSource;
  tone: PartStatusTone;
  statusLabel: string;
  ageLabel: string;
  actionLabel: string;
  warning: string | null;
  prompt: string | null;
  /** Heldagen kant = verifierad status (ok/soon/action) eller eternit/problem. */
  emphasis: "solid" | "muted";
};

export type PropertyPartRow = {
  part_key: string;
  replaced_year: number | null;
  year_precision?: string | null;
  material?: string | null;
  known_issues?: string[] | null;
};

function parsePrecision(value: string | null | undefined): YearPrecision | null {
  if (value === "exact" || value === "decade" || value === "original") {
    return value;
  }
  // Legacy: bara replaced_year utan precision = exact
  return null;
}

export function computePartView(
  def: (typeof PROPERTY_PARTS)[number],
  constructionYear: number | null,
  row: PropertyPartRow | undefined,
): PropertyPartView {
  const replacedYear =
    row?.replaced_year != null && Number.isFinite(Number(row.replaced_year))
      ? Number(row.replaced_year)
      : null;

  let yearPrecision = parsePrecision(row?.year_precision ?? null);
  // Legacy-rader med år men utan precision räknas som exact.
  if (replacedYear != null && yearPrecision == null) {
    yearPrecision = "exact";
  }

  const material = row?.material?.trim() || null;
  const knownIssues = Array.isArray(row?.known_issues)
    ? row.known_issues.filter(Boolean)
    : [];

  const status = getComponentStatus({
    key: def.key,
    buildYear: constructionYear,
    replacedYear,
    yearPrecision,
    material,
    knownIssues,
  });

  const emphasis: "solid" | "muted" =
    status.status === "ok" ||
    status.status === "soon" ||
    status.status === "action"
      ? "solid"
      : "muted";

  return {
    key: def.key,
    label: def.label,
    lifespanYears: status.lifespanYears ?? def.lifespanYears,
    summary: def.summary,
    ifWaiting: def.ifWaiting,
    guideHref: def.guideHref,
    ageYears: status.ageYears,
    referenceYear: status.referenceYear,
    replacedYear,
    yearPrecision,
    material,
    knownIssues,
    source: status.source,
    tone: status.status,
    statusLabel: status.statusLabel,
    ageLabel: status.ageLabel,
    actionLabel: status.actionLabel,
    warning: status.warning,
    prompt: status.prompt,
    emphasis,
  };
}

export function buildPropertyPartViews(
  constructionYear: number | null,
  rows: PropertyPartRow[],
): PropertyPartView[] {
  const byKey = new Map(rows.map((r) => [r.part_key, r]));
  return PROPERTY_PARTS.map((def) =>
    computePartView(def, constructionYear, byKey.get(def.key)),
  );
}

/** Andel verifierade delar + viktiga basfält (0–100). */
export function computeProfileCompleteness(input: {
  hasKommun: boolean;
  hasPropertyType: boolean;
  hasConstructionYear: boolean;
  hasLivingArea: boolean;
  parts: PropertyPartView[];
}): {
  percent: number;
  verifiedParts: number;
  totalParts: number;
  missingHint: string;
} {
  const metaChecks = [
    input.hasKommun,
    input.hasPropertyType,
    input.hasConstructionYear,
    input.hasLivingArea,
  ];
  const metaScore = metaChecks.filter(Boolean).length;
  const verifiedParts = input.parts.filter(
    (p) => p.source === "verified",
  ).length;
  const totalParts = input.parts.length;
  const earned = metaScore + verifiedParts;
  const total = metaChecks.length + totalParts;
  const percent = Math.round((earned / total) * 100);

  let missingHint = "Profilen ser bra ut så här långt.";
  if (!input.hasConstructionYear) {
    missingHint = "Lägg till byggår så kan vi anta ålder på husets delar.";
  } else {
    const unverified = input.parts.find((p) => p.source !== "verified");
    if (unverified) {
      missingHint = `När byttes ${unverified.label.toLowerCase()}? Svara så skärper vi riskbilden.`;
    } else if (!input.hasLivingArea) {
      missingHint = "Lägg till boarea för en fullständigare profil.";
    }
  }

  return { percent, verifiedParts, totalParts, missingHint };
}

/**
 * Nästa del att komplettera: verifierade larm först, sedan troligen dags, sedan okänt.
 * Antagen "Troligen OK" prioriteras inte.
 */
export function pickNextPartAction(
  parts: PropertyPartView[],
): PropertyPartView | null {
  return (
    parts.find((p) => p.tone === "action") ??
    parts.find((p) => p.tone === "soon") ??
    parts.find((p) => p.tone === "likely") ??
    parts.find((p) => p.tone === "unknown") ??
    parts.find((p) => p.source !== "verified") ??
    null
  );
}
