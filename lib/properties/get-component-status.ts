import {
  FOUNDATION_NOTES,
  FOUNDATION_TYPE_LABELS,
  HEAT_DIST_LABELS,
  HEAT_SOURCE_LABELS,
  HEAT_SOURCE_NOTES,
  WATER_DIST_VARIANTS,
  buildingHasHeatPump,
  heatSourceNeedsWaterDist,
  isFoundationType,
  isHeatDistVariant,
  isHeatSourceVariant,
  lifespanForPart,
  type HeatDistVariant,
  type HeatSourceVariant,
  type RoofMaterial,
} from "@/lib/properties/component-lifespans";
import type { PropertyPartKey } from "@/lib/properties/parts-catalog";

export type YearPrecision = "exact" | "decade" | "original";

export type ComponentStatus =
  | "ok"
  | "soon"
  | "action"
  | "likely"
  | "assumed_ok"
  | "unknown";

export type ComponentSource = "unknown" | "assumed" | "verified";

export type ComponentInput = {
  key: PropertyPartKey;
  buildYear: number | null;
  replacedYear: number | null;
  yearPrecision: YearPrecision | null;
  /** Takmaterial / grundtyp / värmevariant. */
  variant: string | null;
  knownIssues: string[];
  role?: "primar" | "komplement" | null;
  integrated?: boolean;
  nowYear?: number;
};

export type ComponentStatusResult = {
  status: ComponentStatus;
  source: ComponentSource;
  ageYears: number | null;
  referenceYear: number | null;
  lifespanYears: number | null;
  statusLabel: string;
  ageLabel: string;
  actionLabel: string;
  warning: string | null;
  prompt: string | null;
  /** Extra panelnotis (t.ex. värmekälla). */
  note: string | null;
};

const ASSUMED_RATIO = 0.7;
const LIKELY_REPLACED_RATIO = 1.5;
const SOON_RATIO_MIN = 0.7;

function statusLabelFor(status: ComponentStatus): string {
  switch (status) {
    case "ok":
      return "OK";
    case "soon":
      return "Inom 5 år";
    case "action":
      return "Åtgärda";
    case "likely":
      return "Troligen dags";
    case "assumed_ok":
      return "Troligen OK";
    case "unknown":
      return "Okänt";
  }
}

function verifiedBand(
  ageYears: number,
  lifespan: number,
): "ok" | "soon" | "action" {
  const ratio = ageYears / lifespan;
  if (ratio > 1) return "action";
  if (ratio >= SOON_RATIO_MIN) return "soon";
  if (lifespan - ageYears <= 5) return "soon";
  return "ok";
}

function emptyNote(
  partial: Omit<ComponentStatusResult, "note">,
): ComponentStatusResult {
  return { ...partial, note: null };
}

/**
 * Ren statusfunktion: antaget får aldrig samma etikett som verifierat.
 */
export function getComponentStatus(
  input: ComponentInput,
): ComponentStatusResult {
  const now = input.nowYear ?? new Date().getFullYear();
  const knownIssues = input.knownIssues.filter(Boolean);
  const variant = input.variant?.trim() || null;
  const lifespanYears = lifespanForPart(input.key, variant);

  if (input.key === "varmvattenberedare" && input.integrated) {
    return {
      status: "assumed_ok",
      source: "assumed",
      ageYears: null,
      referenceYear: null,
      lifespanYears: null,
      statusLabel: "Ingår",
      ageLabel: "Ingår i värmepumpen",
      actionLabel: "Integrerad",
      warning: null,
      prompt: null,
      note: null,
    };
  }

  // Tak utan variant: fråga först.
  if (input.key === "tak") {
    const mat = variant;
    if (!mat || mat === "okand") {
      return emptyNote({
        status: "unknown",
        source: "unknown",
        ageYears: null,
        referenceYear: null,
        lifespanYears: null,
        statusLabel: "Okänt",
        ageLabel: "Material saknas",
        actionLabel: "Ange material →",
        warning: null,
        prompt: "Vilket material har taket?",
      });
    }
    if (mat === "eternit") {
      return emptyNote({
        status: "action",
        source:
          input.yearPrecision === "original" || input.replacedYear != null
            ? "verified"
            : "assumed",
        ageYears:
          input.replacedYear != null
            ? Math.max(0, now - input.replacedYear)
            : input.buildYear != null
              ? Math.max(0, now - input.buildYear)
              : null,
        referenceYear: input.replacedYear ?? input.buildYear,
        lifespanYears,
        statusLabel: "Åtgärda",
        ageLabel: "Eternit (asbest)",
        actionLabel:
          input.replacedYear != null || input.yearPrecision === "original"
            ? formatVerifiedAction(input.replacedYear ?? input.buildYear)
            : "Ange år →",
        warning: "Eternit kan innehålla asbest – hanteras av behörig firma.",
        prompt: null,
      });
    }
  }

  // Grund utan typ: fråga först.
  if (input.key === "grund") {
    if (!variant || variant === "okand") {
      return emptyNote({
        status: "unknown",
        source: "unknown",
        ageYears: null,
        referenceYear: null,
        lifespanYears: null,
        statusLabel: "Okänt",
        ageLabel: "Typ saknas",
        actionLabel: "Ange typ →",
        warning: null,
        prompt: "Vilken typ av grund har huset?",
      });
    }
  }

  // Värmekälla: aldrig antagen ålder från byggår.
  if (input.key === "varmekalla") {
    const note =
      variant && isHeatSourceVariant(variant)
        ? (HEAT_SOURCE_NOTES[variant] ?? null)
        : null;

    if (!variant || variant === "okand") {
      return {
        status: "unknown",
        source: "unknown",
        ageYears: null,
        referenceYear: null,
        lifespanYears: null,
        statusLabel: "Okänt",
        ageLabel: "Vilken uppvärmning?",
        actionLabel: "Vilken uppvärmning? →",
        warning: null,
        prompt: "Vilken uppvärmning har huset?",
        note: null,
      };
    }

    const label = isHeatSourceVariant(variant)
      ? HEAT_SOURCE_LABELS[variant]
      : variant;

    // Kamin: ingen livslängdsstatus
    if (variant === "kamin") {
      if (input.replacedYear != null || input.yearPrecision === "original") {
        const ref =
          input.replacedYear ??
          (input.yearPrecision === "original" ? input.buildYear : null);
        const age = ref != null ? Math.max(0, now - ref) : null;
        return {
          status: "assumed_ok",
          source: "verified",
          ageYears: age,
          referenceYear: ref,
          lifespanYears: null,
          statusLabel: "OK",
          ageLabel: age != null ? `${label} · ${age} år` : label,
          actionLabel: formatVerifiedAction(ref),
          warning: null,
          prompt: null,
          note,
        };
      }
      return {
        status: "assumed_ok",
        source: "assumed",
        ageYears: null,
        referenceYear: null,
        lifespanYears: null,
        statusLabel: "OK",
        ageLabel: label,
        actionLabel: "Ange år →",
        warning: null,
        prompt: `När installerades ${label.toLowerCase()}?`,
        note,
      };
    }

    if (input.replacedYear == null && input.yearPrecision !== "original") {
      return {
        status: "unknown",
        source: "unknown",
        ageYears: null,
        referenceYear: null,
        lifespanYears,
        statusLabel: "Okänt",
        ageLabel: label,
        actionLabel: "Ange år →",
        warning: null,
        prompt: `När installerades ${label.toLowerCase()}?`,
        note,
      };
    }

    // Verifierad ålder + livslängd
    const refYear =
      input.yearPrecision === "original" && input.buildYear != null
        ? input.buildYear
        : input.replacedYear!;
    const ageYears = Math.max(0, now - refYear);
    if (lifespanYears == null) {
      return {
        status: "assumed_ok",
        source: "verified",
        ageYears,
        referenceYear: refYear,
        lifespanYears: null,
        statusLabel: "OK",
        ageLabel: `${label} · ${ageYears} år`,
        actionLabel: formatVerifiedAction(refYear),
        warning: null,
        prompt: null,
        note,
      };
    }
    const band = verifiedBand(ageYears, lifespanYears);
    return {
      status: band,
      source: "verified",
      ageYears,
      referenceYear: refYear,
      lifespanYears,
      statusLabel: statusLabelFor(band),
      ageLabel: `${label} · ${ageYears} år`,
      actionLabel: formatVerifiedAction(refYear),
      warning: null,
      prompt: null,
      note,
    };
  }

  // Värmedistribution
  if (input.key === "varmedistribution") {
    if (!variant || variant === "okand") {
      return emptyNote({
        status: "unknown",
        source: "unknown",
        ageYears: null,
        referenceYear: null,
        lifespanYears: null,
        statusLabel: "Okänt",
        ageLabel: "Hur fördelas värmen?",
        actionLabel: "Ange distribution →",
        warning: null,
        prompt: "Hur fördelas värmen i huset?",
      });
    }

    const label = isHeatDistVariant(variant)
      ? HEAT_DIST_LABELS[variant]
      : variant;

    // Luftburen: ingen livslängdsstatus
    if (variant === "luftburen") {
      return emptyNote({
        status: "assumed_ok",
        source:
          input.replacedYear != null || input.yearPrecision === "original"
            ? "verified"
            : "assumed",
        ageYears: null,
        referenceYear: null,
        lifespanYears: null,
        statusLabel: "OK",
        ageLabel: label,
        actionLabel:
          input.replacedYear != null || input.yearPrecision === "original"
            ? formatVerifiedAction(input.replacedYear ?? input.buildYear)
            : "Verifierad",
        warning: null,
        prompt: null,
      });
    }
  }

  if (knownIssues.length > 0) {
    const ref =
      input.replacedYear ??
      (input.yearPrecision === "original" ? input.buildYear : null) ??
      input.buildYear;
    const age = ref != null ? Math.max(0, now - ref) : null;
    const verified =
      input.replacedYear != null || input.yearPrecision === "original";
    return decorateResult(
      input,
      emptyNote({
        status: "action",
        source: verified ? "verified" : age != null ? "assumed" : "unknown",
        ageYears: age,
        referenceYear: ref,
        lifespanYears,
        statusLabel: "Åtgärda",
        ageLabel:
          age == null
            ? "Känt problem"
            : verified
              ? `${age} år, verifierad`
              : `ca ${age} år, antagen från byggår`,
        actionLabel: verified
          ? formatVerifiedAction(input.replacedYear ?? input.buildYear)
          : "Ange år →",
        warning: null,
        prompt: null,
      }),
    );
  }

  const isOriginal = input.yearPrecision === "original";
  const hasExactOrDecade =
    input.replacedYear != null &&
    (input.yearPrecision === "exact" ||
      input.yearPrecision === "decade" ||
      input.yearPrecision == null);

  if (isOriginal && input.buildYear != null) {
    const ageYears = Math.max(0, now - input.buildYear);
    return decorateResult(
      input,
      buildVerified(
        ageYears,
        input.buildYear,
        lifespanYears,
        input.buildYear,
      ),
    );
  }

  if (hasExactOrDecade && input.replacedYear != null) {
    const ageYears = Math.max(0, now - input.replacedYear);
    return decorateResult(
      input,
      buildVerified(
        ageYears,
        input.replacedYear,
        lifespanYears,
        input.replacedYear,
      ),
    );
  }

  // Antagen från byggår (inte för varmekalla – hanterad ovan)
  if (input.buildYear != null && lifespanYears != null) {
    const ageYears = Math.max(0, now - input.buildYear);
    if (ageYears > lifespanYears * LIKELY_REPLACED_RATIO) {
      if (input.key === "vatrum") {
        return emptyNote({
          status: "unknown",
          source: "unknown",
          ageYears,
          referenceYear: input.buildYear,
          lifespanYears,
          statusLabel: "Okänt",
          ageLabel: "Ålder okänd",
          actionLabel: "Ange år →",
          warning: null,
          prompt: "Okänt – när lades tätskiktet?",
        });
      }
      return decorateResult(
        input,
        emptyNote({
          status: "unknown",
          source: "unknown",
          ageYears,
          referenceYear: input.buildYear,
          lifespanYears,
          statusLabel: "Okänt",
          ageLabel: "Troligen bytt",
          actionLabel: "Ange år →",
          warning: null,
          prompt: "Okänt – troligen bytt, när?",
        }),
      );
    }
    const ratio = ageYears / lifespanYears;
    if (ratio >= ASSUMED_RATIO) {
      return decorateResult(
        input,
        emptyNote({
          status: "likely",
          source: "assumed",
          ageYears,
          referenceYear: input.buildYear,
          lifespanYears,
          statusLabel: "Troligen dags",
          ageLabel: distAgeLabel(input, `ca ${ageYears} år, antagen från byggår`),
          actionLabel: "Ange år →",
          warning: null,
          prompt: null,
        }),
      );
    }
    return decorateResult(
      input,
      emptyNote({
        status: "assumed_ok",
        source: "assumed",
        ageYears,
        referenceYear: input.buildYear,
        lifespanYears,
        statusLabel: "Troligen OK",
        ageLabel: distAgeLabel(input, `ca ${ageYears} år, antagen från byggår`),
        actionLabel: "Ange år →",
        warning: null,
        prompt: null,
      }),
    );
  }

  if (input.key === "vatrum") {
    return emptyNote({
      status: "unknown",
      source: "unknown",
      ageYears: null,
      referenceYear: null,
      lifespanYears,
      statusLabel: "Okänt",
      ageLabel: "Ålder okänd",
      actionLabel: "Ange år →",
      warning: null,
      prompt: "Okänt – när lades tätskiktet?",
    });
  }

  return decorateResult(
    input,
    emptyNote({
      status: "unknown",
      source: "unknown",
      ageYears: null,
      referenceYear: null,
      lifespanYears,
      statusLabel: "Okänt",
      ageLabel: "Ålder okänd",
      actionLabel: "Ange år →",
      warning: null,
      prompt: null,
    }),
  );
}

function distAgeLabel(input: ComponentInput, fallback: string): string {
  if (input.key !== "varmedistribution" || !input.variant) return fallback;
  if (!isHeatDistVariant(input.variant)) return fallback;
  const label = HEAT_DIST_LABELS[input.variant];
  return `${label} · ${fallback}`;
}

function withDistLabel(
  input: ComponentInput,
  result: ComponentStatusResult,
): ComponentStatusResult {
  if (input.key !== "varmedistribution" || !input.variant) return result;
  if (!isHeatDistVariant(input.variant) || input.variant === "okand") {
    return result;
  }
  const label = HEAT_DIST_LABELS[input.variant];
  if (result.ageYears != null) {
    return {
      ...result,
      ageLabel: `${label} · ${result.ageLabel}`,
    };
  }
  if (!result.ageLabel.includes(label)) {
    return { ...result, ageLabel: `${label} · ${result.ageLabel}` };
  }
  return result;
}

function withGrundMeta(
  input: ComponentInput,
  result: ComponentStatusResult,
): ComponentStatusResult {
  if (input.key !== "grund" || !input.variant) return result;
  if (!isFoundationType(input.variant) || input.variant === "okand") {
    return result;
  }
  const label = FOUNDATION_TYPE_LABELS[input.variant];
  const note = FOUNDATION_NOTES[input.variant] ?? null;
  const ageLabel = result.ageLabel.includes(label)
    ? result.ageLabel
    : result.ageYears != null || result.ageLabel
      ? `${label} · ${result.ageLabel}`
      : label;
  return {
    ...result,
    ageLabel,
    note: result.note ?? note,
  };
}

function decorateResult(
  input: ComponentInput,
  result: ComponentStatusResult,
): ComponentStatusResult {
  return withGrundMeta(input, withDistLabel(input, result));
}

function formatVerifiedAction(year: number | null | undefined): string {
  if (year == null) return "Verifierad";
  return `Verifierad ${year}`;
}

function buildVerified(
  ageYears: number,
  referenceYear: number,
  lifespanYears: number | null,
  verifiedYear: number,
): ComponentStatusResult {
  if (lifespanYears == null || lifespanYears <= 0) {
    return emptyNote({
      status: "unknown",
      source: "verified",
      ageYears,
      referenceYear,
      lifespanYears: null,
      statusLabel: "Okänt",
      ageLabel: `${ageYears} år, verifierad`,
      actionLabel: formatVerifiedAction(verifiedYear),
      warning: null,
      prompt: null,
    });
  }
  const status = verifiedBand(ageYears, lifespanYears);
  return emptyNote({
    status,
    source: "verified",
    ageYears,
    referenceYear,
    lifespanYears,
    statusLabel: statusLabelFor(status),
    ageLabel: `${ageYears} år, verifierad`,
    actionLabel: formatVerifiedAction(verifiedYear),
    warning: null,
    prompt: null,
  });
}

/** Mjuk varning: primär vattenburen värmekälla utan vattenburen distribution. */
export function heatCompatibilityWarning(input: {
  heatSources: { variant: string | null; role: string | null }[];
  distributions: { variant: string | null }[];
}): string | null {
  const hasPrimaryWater = input.heatSources.some(
    (s) =>
      (s.role === "primar" || s.role == null) &&
      heatSourceNeedsWaterDist(s.variant),
  );
  if (!hasPrimaryWater) return null;
  const hasWaterDist = input.distributions.some(
    (d) =>
      d.variant &&
      (WATER_DIST_VARIANTS as readonly string[]).includes(d.variant),
  );
  if (hasWaterDist) return null;
  return "Den här värmekällan brukar kräva vattenburen värme – stämmer distributionen?";
}

export { buildingHasHeatPump };
export type { RoofMaterial, HeatSourceVariant, HeatDistVariant };
