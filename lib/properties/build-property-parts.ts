import {
  getComponentStatus,
  heatCompatibilityWarning,
  type YearPrecision,
} from "@/lib/properties/get-component-status";
import {
  PART_NEXT_STEP_PRIORITY,
  PART_STATUS_PRIORITY,
} from "@/lib/properties/component-lifespans";
import {
  BUILDING_DEFAULT_PARTS,
  BUILDING_TYPE_LABELS,
  getPartDefinition,
  isBuildingType,
  isPartRole,
  isPropertyPartKey,
  type BuildingType,
  type PartRole,
  type PropertyPartKey,
} from "@/lib/properties/parts-catalog";

export type PartSource =
  | "unknown"
  | "assumed"
  | "verified"
  | "not_applicable"
  | "integrated";
export type PartStatusTone =
  | "ok"
  | "soon"
  | "action"
  | "likely"
  | "assumed_ok"
  | "unknown"
  | "not_applicable";

export type PropertyPartView = {
  id: string;
  buildingId: string;
  key: PropertyPartKey;
  label: string;
  catalogLabel: string;
  name: string | null;
  allowMultiple: boolean;
  notApplicable: boolean;
  integrated: boolean;
  role: PartRole | null;
  buildYear: number | null;
  lifespanYears: number | null;
  summary: string;
  ifWaiting: string;
  guideHref?: string;
  ageYears: number | null;
  referenceYear: number | null;
  replacedYear: number | null;
  yearPrecision: YearPrecision | null;
  variant: string | null;
  /** @deprecated alias för variant (tak-UI under övergång) */
  material: string | null;
  knownIssues: string[];
  source: PartSource;
  tone: PartStatusTone;
  statusLabel: string;
  ageLabel: string;
  actionLabel: string;
  warning: string | null;
  prompt: string | null;
  note: string | null;
  emphasis: "solid" | "muted";
  /** Räknas i X av Y / nästa steg. */
  countsTowardCompleteness: boolean;
};

export type PropertyBuildingView = {
  id: string;
  type: BuildingType;
  name: string;
  buildYear: number | null;
  parts: PropertyPartView[];
  relevantCount: number;
  verifiedCount: number;
  collapsedSummary: string;
  heatCompatibilityWarning: string | null;
  /** Värmepump finns → visa VVB-integrerad-kryss. */
  hasHeatPump: boolean;
};

export type PropertyBuildingRow = {
  id: string;
  type: string;
  name: string;
  build_year: number | null;
};

export type PropertyPartRow = {
  id: string;
  building_id: string;
  part_key: string;
  name?: string | null;
  not_applicable?: boolean | null;
  replaced_year: number | null;
  year_precision?: string | null;
  variant?: string | null;
  /** Legacy alias */
  material?: string | null;
  known_issues?: string[] | null;
  role?: string | null;
  integrated?: boolean | null;
};

function parsePrecision(value: string | null | undefined): YearPrecision | null {
  if (value === "exact" || value === "decade" || value === "original") {
    return value;
  }
  return null;
}

function displayLabel(catalogLabel: string, name: string | null): string {
  const trimmed = name?.trim();
  return trimmed || catalogLabel;
}

export function computePartView(
  row: PropertyPartRow,
  buildYear: number | null,
): PropertyPartView | null {
  if (!isPropertyPartKey(row.part_key)) return null;
  const def = getPartDefinition(row.part_key);
  if (!def) return null;

  const notApplicable = Boolean(row.not_applicable);
  const integrated = Boolean(row.integrated);
  const name = row.name?.trim() || null;
  const label = displayLabel(def.label, name);
  const role: PartRole | null =
    row.role && isPartRole(row.role) ? row.role : null;
  const variant = (row.variant ?? row.material)?.trim() || null;

  if (notApplicable) {
    return {
      id: row.id,
      buildingId: row.building_id,
      key: def.key,
      label,
      catalogLabel: def.label,
      name,
      allowMultiple: def.allowMultiple,
      notApplicable: true,
      integrated: false,
      role,
      buildYear,
      lifespanYears: def.lifespanYears,
      summary: def.summary,
      ifWaiting: def.ifWaiting,
      guideHref: def.guideHref,
      ageYears: null,
      referenceYear: null,
      replacedYear: null,
      yearPrecision: null,
      variant: null,
      material: null,
      knownIssues: [],
      source: "not_applicable",
      tone: "not_applicable",
      statusLabel: "Finns inte",
      ageLabel: "Ej relevant",
      actionLabel: "Återställ om den finns",
      warning: null,
      prompt: null,
      note: null,
      emphasis: "muted",
      countsTowardCompleteness: false,
    };
  }

  const replacedYear =
    row.replaced_year != null && Number.isFinite(Number(row.replaced_year))
      ? Number(row.replaced_year)
      : null;

  let yearPrecision = parsePrecision(row.year_precision ?? null);
  if (replacedYear != null && yearPrecision == null) {
    yearPrecision = "exact";
  }

  const knownIssues = Array.isArray(row.known_issues)
    ? row.known_issues.filter(Boolean)
    : [];

  const status = getComponentStatus({
    key: def.key,
    buildYear,
    replacedYear,
    yearPrecision,
    variant,
    knownIssues,
    role,
    integrated,
  });

  const isIntegratedVvb = def.key === "varmvattenberedare" && integrated;
  const source: PartSource = isIntegratedVvb
    ? "integrated"
    : status.source;
  const emphasis: "solid" | "muted" =
    status.source === "verified" ? "solid" : "muted";

  return {
    id: row.id,
    buildingId: row.building_id,
    key: def.key,
    label,
    catalogLabel: def.label,
    name,
    allowMultiple: def.allowMultiple,
    notApplicable: false,
    integrated,
    role:
      def.key === "varmekalla"
        ? role ?? "primar"
        : role,
    buildYear,
    lifespanYears: status.lifespanYears ?? def.lifespanYears,
    summary: def.summary,
    ifWaiting: def.ifWaiting,
    guideHref: def.guideHref,
    ageYears: status.ageYears,
    referenceYear: status.referenceYear,
    replacedYear,
    yearPrecision,
    variant,
    material: variant,
    knownIssues,
    source,
    tone: status.status,
    statusLabel: status.statusLabel,
    ageLabel: status.ageLabel,
    actionLabel: status.actionLabel,
    warning: status.warning,
    prompt: status.prompt,
    note: status.note,
    emphasis,
    countsTowardCompleteness: !isIntegratedVvb,
  };
}

function partSortKey(part: PropertyPartView): number {
  const idx = PART_NEXT_STEP_PRIORITY.indexOf(part.key);
  return idx === -1 ? 999 : idx;
}

function collapsedSummary(parts: PropertyPartView[]): string {
  const relevant = parts.filter((p) => p.countsTowardCompleteness);
  const n = relevant.length;
  const actionish = relevant.filter(
    (p) =>
      p.tone === "action" ||
      p.tone === "soon" ||
      p.tone === "likely" ||
      p.tone === "unknown",
  ).length;
  const filer = `${n} ${n === 1 ? "del" : "delar"}`;
  if (actionish === 0) return filer;
  return `${filer} · ${actionish} behöver koll`;
}

export function buildPropertyBuildingViews(
  buildings: PropertyBuildingRow[],
  rows: PropertyPartRow[],
): PropertyBuildingView[] {
  const partsByBuilding = new Map<string, PropertyPartView[]>();

  for (const row of rows) {
    const building = buildings.find((b) => b.id === row.building_id);
    const buildYear =
      building?.build_year != null && Number.isFinite(Number(building.build_year))
        ? Number(building.build_year)
        : null;
    const view = computePartView(row, buildYear);
    if (!view) continue;
    const list = partsByBuilding.get(row.building_id) ?? [];
    list.push(view);
    partsByBuilding.set(row.building_id, list);
  }

  const views: PropertyBuildingView[] = buildings.map((b) => {
    const type: BuildingType = isBuildingType(b.type) ? b.type : "uthus";
    const parts = (partsByBuilding.get(b.id) ?? []).sort((a, bPart) => {
      const ka = partSortKey(a);
      const kb = partSortKey(bPart);
      if (ka !== kb) return ka - kb;
      return a.label.localeCompare(bPart.label, "sv");
    });
    const relevant = parts.filter((p) => p.countsTowardCompleteness);
    const verified = relevant.filter((p) => p.source === "verified");

    const heatSources = parts
      .filter((p) => p.key === "varmekalla" && !p.notApplicable)
      .map((p) => ({ variant: p.variant, role: p.role }));
    const distributions = parts
      .filter((p) => p.key === "varmedistribution" && !p.notApplicable)
      .map((p) => ({ variant: p.variant }));

    const hasHeatPump = heatSources.some(
      (s) =>
        s.variant &&
        ["bergvarme", "jordvarme", "sjovarme", "luft_vatten", "franluft"].includes(
          s.variant,
        ),
    );

    return {
      id: b.id,
      type,
      name: b.name.trim() || BUILDING_TYPE_LABELS[type],
      buildYear:
        b.build_year != null && Number.isFinite(Number(b.build_year))
          ? Number(b.build_year)
          : null,
      parts,
      relevantCount: relevant.length,
      verifiedCount: verified.length,
      collapsedSummary: collapsedSummary(parts),
      heatCompatibilityWarning: heatCompatibilityWarning({
        heatSources,
        distributions,
      }),
      hasHeatPump,
    };
  });

  views.sort((a, b) => {
    if (a.type === "huvudbyggnad" && b.type !== "huvudbyggnad") return -1;
    if (b.type === "huvudbyggnad" && a.type !== "huvudbyggnad") return 1;
    return a.name.localeCompare(b.name, "sv");
  });

  return views;
}

export function flattenBuildingParts(
  buildings: PropertyBuildingView[],
): PropertyPartView[] {
  return buildings.flatMap((b) => b.parts);
}

export function computeProfileCompleteness(input: {
  parts: PropertyPartView[];
}): {
  percent: number;
  verifiedParts: number;
  totalParts: number;
} {
  const relevant = input.parts.filter((p) => p.countsTowardCompleteness);
  const verifiedParts = relevant.filter((p) => p.source === "verified").length;
  const totalParts = relevant.length;
  const percent =
    totalParts === 0 ? 0 : Math.round((verifiedParts / totalParts) * 100);

  return { percent, verifiedParts, totalParts };
}

/**
 * Nästa del bland relevanta. Komplement-värmekälla hoppas över om primär finns.
 */
export function pickNextPartAction(
  parts: PropertyPartView[],
): PropertyPartView | null {
  const hasPrimaryHeat = parts.some(
    (p) =>
      p.key === "varmekalla" &&
      !p.notApplicable &&
      (p.role === "primar" || p.role == null),
  );

  const relevant = parts.filter((p) => {
    if (!p.countsTowardCompleteness) return false;
    if (
      p.key === "varmekalla" &&
      p.role === "komplement" &&
      hasPrimaryHeat
    ) {
      return false;
    }
    return true;
  });

  for (const key of PART_NEXT_STEP_PRIORITY) {
    const match = relevant.find(
      (p) => p.key === key && p.source !== "verified",
    );
    if (match) return match;
  }

  let best: PropertyPartView | null = null;
  let bestRank = Infinity;
  let bestOrder = Infinity;

  for (const part of relevant) {
    if (part.source !== "verified") continue;
    if (part.tone !== "action" && part.tone !== "soon") continue;
    const rank = PART_STATUS_PRIORITY[part.tone] ?? 99;
    const order = PART_NEXT_STEP_PRIORITY.indexOf(part.key);
    const orderSafe = order === -1 ? 999 : order;
    if (
      rank < bestRank ||
      (rank === bestRank && orderSafe < bestOrder)
    ) {
      best = part;
      bestRank = rank;
      bestOrder = orderSafe;
    }
  }

  return best;
}

/** Test-hjälpare: bygg views från partial rows. */
export function buildPropertyPartViews(
  constructionYear: number | null,
  rows: Array<
    Omit<PropertyPartRow, "id" | "building_id"> & {
      id?: string;
      building_id?: string;
    }
  >,
): PropertyPartView[] {
  const buildingId = "test-building";
  const buildings: PropertyBuildingRow[] = [
    {
      id: buildingId,
      type: "huvudbyggnad",
      name: "Huvudbyggnad",
      build_year: constructionYear,
    },
  ];
  const fullRows: PropertyPartRow[] = rows.map((r, i) => ({
    id: r.id ?? `part-${r.part_key}-${i}`,
    building_id: r.building_id ?? buildingId,
    part_key: r.part_key,
    name: r.name ?? null,
    not_applicable: r.not_applicable ?? false,
    replaced_year: r.replaced_year,
    year_precision: r.year_precision,
    variant: r.variant ?? r.material ?? null,
    known_issues: r.known_issues,
    role: r.role ?? null,
    integrated: r.integrated ?? false,
  }));

  const existing = new Set(fullRows.map((r) => r.part_key));
  for (const key of BUILDING_DEFAULT_PARTS.huvudbyggnad) {
    if (existing.has(key)) continue;
    fullRows.push({
      id: `virtual-${key}`,
      building_id: buildingId,
      part_key: key,
      name: null,
      not_applicable: false,
      replaced_year: null,
      year_precision: null,
      variant: null,
      known_issues: [],
      role: key === "varmekalla" ? "primar" : null,
      integrated: false,
    });
  }

  return flattenBuildingParts(buildPropertyBuildingViews(buildings, fullRows));
}
