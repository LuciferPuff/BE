import {
  lifespanForPart,
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
  material: string | null;
  knownIssues: string[];
  /** Override for tests. */
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
  /** Kortets rad 2: handling eller verifieringsrad. */
  actionLabel: string;
  warning: string | null;
  prompt: string | null;
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
  // Even under 70%, "soon" if within 5 years of end
  if (lifespan - ageYears <= 5) return "soon";
  return "ok";
}

/**
 * Ren statusfunktion: antaget får aldrig samma etikett som verifierat.
 */
export function getComponentStatus(
  input: ComponentInput,
): ComponentStatusResult {
  const now = input.nowYear ?? new Date().getFullYear();
  const knownIssues = input.knownIssues.filter(Boolean);
  const lifespanYears = lifespanForPart(input.key, input.material);

  // Tak utan material: fråga först.
  if (input.key === "tak") {
    const mat = input.material;
    if (!mat || mat === "okand") {
      return {
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
      };
    }
    if (mat === "eternit") {
      return {
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
        lifespanYears: lifespanYears,
        statusLabel: "Åtgärda",
        ageLabel: "Eternit (asbest)",
        actionLabel:
          input.replacedYear != null || input.yearPrecision === "original"
            ? formatVerifiedAction(input.replacedYear ?? input.buildYear)
            : "Ange år →",
        warning: "Eternit kan innehålla asbest – hanteras av behörig firma.",
        prompt: null,
      };
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
    return {
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
    };
  }

  const isOriginal = input.yearPrecision === "original";
  const hasExactOrDecade =
    input.replacedYear != null &&
    (input.yearPrecision === "exact" ||
      input.yearPrecision === "decade" ||
      input.yearPrecision == null);

  // Verifierad: explicit år/årtionde, eller original från byggår.
  if (isOriginal && input.buildYear != null) {
    const ageYears = Math.max(0, now - input.buildYear);
    return buildVerified(
      ageYears,
      input.buildYear,
      lifespanYears,
      input.buildYear,
    );
  }

  if (hasExactOrDecade && input.replacedYear != null) {
    const ageYears = Math.max(0, now - input.replacedYear);
    return buildVerified(
      ageYears,
      input.replacedYear,
      lifespanYears,
      input.replacedYear,
    );
  }

  // Antagen från byggår
  if (input.buildYear != null && lifespanYears != null) {
    const ageYears = Math.max(0, now - input.buildYear);
    if (ageYears > lifespanYears * LIKELY_REPLACED_RATIO) {
      if (input.key === "badrum") {
        return {
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
        };
      }
      return {
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
      };
    }
    const ratio = ageYears / lifespanYears;
    if (ratio >= ASSUMED_RATIO) {
      return {
        status: "likely",
        source: "assumed",
        ageYears,
        referenceYear: input.buildYear,
        lifespanYears,
        statusLabel: "Troligen dags",
        ageLabel: `ca ${ageYears} år, antagen från byggår`,
        actionLabel: "Ange år →",
        warning: null,
        prompt: null,
      };
    }
    return {
      status: "assumed_ok",
      source: "assumed",
      ageYears,
      referenceYear: input.buildYear,
      lifespanYears,
      statusLabel: "Troligen OK",
      ageLabel: `ca ${ageYears} år, antagen från byggår`,
      actionLabel: "Ange år →",
      warning: null,
      prompt: null,
    };
  }

  if (input.key === "badrum") {
    return {
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
    };
  }

  return {
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
  };
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
    return {
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
    };
  }
  const status = verifiedBand(ageYears, lifespanYears);
  return {
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
  };
}

export type { RoofMaterial };
