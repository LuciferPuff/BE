import {
  PROPERTY_PARTS,
  type PropertyPartDefinition,
  type PropertyPartKey,
} from "@/lib/properties/parts-catalog";

export type PartSource = "unknown" | "assumed" | "verified";
export type PartStatusTone = "unknown" | "ok" | "watch" | "action";

export type PropertyPartView = {
  key: PropertyPartKey;
  label: string;
  lifespanYears: number;
  summary: string;
  ifWaiting: string;
  guideHref?: string;
  /** Beräknad ålder, null om okänd. */
  ageYears: number | null;
  /** År som används för beräkning (byte eller byggår). */
  referenceYear: number | null;
  replacedYear: number | null;
  source: PartSource;
  tone: PartStatusTone;
  statusLabel: string;
  ageLabel: string;
  sourceLabel: string;
};

export type PropertyPartRow = {
  part_key: string;
  replaced_year: number | null;
};

const currentYear = () => new Date().getFullYear();

export function computePartView(
  def: PropertyPartDefinition,
  constructionYear: number | null,
  row: PropertyPartRow | undefined,
): PropertyPartView {
  const replacedYear =
    row?.replaced_year != null && Number.isFinite(Number(row.replaced_year))
      ? Number(row.replaced_year)
      : null;

  let source: PartSource = "unknown";
  let referenceYear: number | null = null;

  if (replacedYear != null) {
    source = "verified";
    referenceYear = replacedYear;
  } else if (constructionYear != null) {
    source = "assumed";
    referenceYear = constructionYear;
  }

  const ageYears =
    referenceYear != null ? Math.max(0, currentYear() - referenceYear) : null;

  const tone = resolveTone(ageYears, def.lifespanYears, source);
  const statusLabel = statusLabelFor(tone);
  const ageLabel =
    ageYears == null
      ? "Ålder okänd"
      : source === "verified"
        ? `${ageYears} år (verifierad)`
        : `ca ${ageYears} år (antagen)`;
  const sourceLabel =
    source === "verified"
      ? "Verifierad"
      : source === "assumed"
        ? "Antagen från byggår"
        : "Okänd";

  return {
    key: def.key,
    label: def.label,
    lifespanYears: def.lifespanYears,
    summary: def.summary,
    ifWaiting: def.ifWaiting,
    guideHref: def.guideHref,
    ageYears,
    referenceYear,
    replacedYear,
    source,
    tone,
    statusLabel,
    ageLabel,
    sourceLabel,
  };
}

function resolveTone(
  ageYears: number | null,
  lifespan: number,
  source: PartSource,
): PartStatusTone {
  if (ageYears == null || source === "unknown") return "unknown";
  const remaining = lifespan - ageYears;
  if (remaining <= 0) return "action";
  if (remaining <= 5) return "watch";
  return "ok";
}

function statusLabelFor(tone: PartStatusTone): string {
  switch (tone) {
    case "ok":
      return "OK";
    case "watch":
      return "Inom 5 år";
    case "action":
      return "Åtgärda";
    default:
      return "Okänt";
  }
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
}): { percent: number; verifiedParts: number; totalParts: number; missingHint: string } {
  const metaChecks = [
    input.hasKommun,
    input.hasPropertyType,
    input.hasConstructionYear,
    input.hasLivingArea,
  ];
  const metaScore = metaChecks.filter(Boolean).length;
  const verifiedParts = input.parts.filter((p) => p.source === "verified").length;
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

export function pickNextPartAction(
  parts: PropertyPartView[],
): PropertyPartView | null {
  return (
    parts.find((p) => p.tone === "action") ??
    parts.find((p) => p.tone === "watch") ??
    parts.find((p) => p.source !== "verified") ??
    null
  );
}
