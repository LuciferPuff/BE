import {
  getComponentStatus,
  type YearPrecision,
} from "@/lib/properties/get-component-status";
import {
  PART_NEXT_STEP_PRIORITY,
  PART_STATUS_PRIORITY,
} from "@/lib/properties/component-lifespans";
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
    status.source === "verified" ? "solid" : "muted";

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

/** Andel verifierade delar (0–100). Meta-fält räknas inte in. */
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
} {
  const verifiedParts = input.parts.filter(
    (p) => p.source === "verified",
  ).length;
  const totalParts = input.parts.length;
  const percent =
    totalParts === 0 ? 0 : Math.round((verifiedParts / totalParts) * 100);

  return { percent, verifiedParts, totalParts };
}

/**
 * Nästa del: första overifierade i PART_NEXT_STEP_PRIORITY.
 * Om alla verifierade: värst underhåll (action/soon) i samma ordning.
 */
export function pickNextPartAction(
  parts: PropertyPartView[],
): PropertyPartView | null {
  const byKey = new Map(parts.map((p) => [p.key, p]));

  for (const key of PART_NEXT_STEP_PRIORITY) {
    const part = byKey.get(key);
    if (part && part.source !== "verified") return part;
  }

  let best: PropertyPartView | null = null;
  let bestRank = Infinity;
  let bestOrder = Infinity;

  for (const key of PART_NEXT_STEP_PRIORITY) {
    const part = byKey.get(key);
    if (!part || part.source !== "verified") continue;
    if (part.tone !== "action" && part.tone !== "soon") continue;
    const rank = PART_STATUS_PRIORITY[part.tone] ?? 99;
    const order = PART_NEXT_STEP_PRIORITY.indexOf(key);
    if (
      rank < bestRank ||
      (rank === bestRank && order < bestOrder)
    ) {
      best = part;
      bestRank = rank;
      bestOrder = order;
    }
  }

  return best;
}
